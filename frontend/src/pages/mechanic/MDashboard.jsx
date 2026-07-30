import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats, getRepairs, deleteRepair, getServiceRequests, getAppointments } from '../../api/orchestratorApi'
import StatCard from '../../components/StatCard'
import toast from 'react-hot-toast'
import useRealtimeSync from '../../hooks/useRealtimeSync'

const CARD = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }
const MONO = { fontFamily: 'JetBrains Mono, monospace' }
const PRIORITY_STYLE = { High: ['#fee2e2','#dc2626'], Medium: ['#fef3c7','#d97706'], Low: ['#dcfce7','#16a34a'] }
const STATUS_STYLE   = { Completed: ['#dcfce7','#16a34a'], 'In Progress': ['#dbeafe','#2563eb'], Pending: ['#f5f3ff','#7c3aed'] }

function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid #e2e8f0', borderTopColor:'#3b82f6', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ConfirmDelete({ label, onConfirm, onCancel }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'#fff', borderRadius:14, padding:'24px 28px', width:340, border:'1px solid #fecaca', boxShadow:'0 8px 32px rgba(0,0,0,0.12)' }}>
        <p style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:8 }}>Delete Record?</p>
        <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>Permanently delete <b style={{ color:'#0f172a' }}>{label}</b>. Cannot be undone.</p>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:'10px', borderRadius:9, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1, padding:'10px', borderRadius:9, border:'none', background:'#dc2626', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

// Workflow stage cards config
const STAGE_CARDS = [
  { key: 'waiting_review',   label: 'Waiting for Review',  icon: '📋', color: '#d97706', bg: '#fffbeb', border: '#fde68a', path: '/mechanic/service-requests' },
  { key: 'appts_today',      label: 'Appointments Today',  icon: '📅', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', path: '/mechanic/appointments' },
  { key: 'waiting_bike',     label: 'Waiting for Bike',    icon: '⏳', color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', path: '/mechanic/appointments' },
  { key: 'bike_received',    label: 'Bike Received',       icon: '🏍️', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', path: '/mechanic/appointments' },
  { key: 'diagnosis_pending',label: 'Diagnosis Pending',   icon: '🔬', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', path: '/mechanic/diagnosis' },
  { key: 'repair_in_progress',label:'Repair In Progress',  icon: '🔧', color: '#d97706', bg: '#fffbeb', border: '#fde68a', path: '/mechanic/repair' },
  { key: 'ready_billing',    label: 'Ready for Billing',   icon: '🧾', color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', path: '/mechanic/payment' },
  { key: 'completed',        label: 'Completed Repairs',   icon: '✅', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', path: '/mechanic/repair' },
]

export default function MDashboard() {
  const [stats, setStats]         = useState(null)
  const [repairs, setRepairs]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [delRecord, setDelRecord] = useState(null)
  const [paymentAlerts, setPaymentAlerts] = useState([])
  const [stageCounts, setStageCounts] = useState({})
  const navigate = useNavigate()

  const fetchData = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    Promise.all([getDashboardStats(), getRepairs(0, 8), getServiceRequests('pending'), getAppointments()])
      .then(([s, r, sr, appts]) => {
        setStats(s.data)
        setRepairs(r.data.records || [])
        const allAppts = appts.data || []
        const allRepairs = r.data.records || []
        setStageCounts({
          waiting_review:    (sr.data || []).length,
          appts_today:       allAppts.filter(a => a.appointment_date === today && !['bike_received','cancelled'].includes(a.status)).length,
          waiting_bike:      allAppts.filter(a => ['scheduled','confirmed','rescheduled'].includes(a.status)).length,
          bike_received:     allAppts.filter(a => a.status === 'bike_received').length,
          diagnosis_pending: allRepairs.filter(r => r.repair_status === 'Pending').length,
          repair_in_progress:allRepairs.filter(r => r.repair_status === 'In Progress').length,
          ready_billing:     allRepairs.filter(r => r.repair_status === 'Completed' && !r.invoice_id).length,
          completed:         allRepairs.filter(r => r.repair_status === 'Completed' && r.invoice_id).length,
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleEvent = useCallback((evt) => {
    if (evt.event === 'payment_received' || evt.event === 'payment_pending') {
      setPaymentAlerts(prev => [evt, ...prev.slice(0, 4)])
      fetchData()
    }
    if (['poll_update','agent_completed','workflow_completed','request_accepted','appointment_scheduled','bike_received','repair_status_updated'].includes(evt.event)) fetchData()
  }, [fetchData])

  useRealtimeSync({ repairId: null, onEvent: handleEvent, enabled: true })

  const handleDelete = async () => {
    try {
      await deleteRepair(delRecord.repair_id)
      toast.success(`Deleted repair #${delRecord.repair_id}`)
      setDelRecord(null); fetchData()
    } catch { toast.error('Delete failed') }
  }

  if (loading) return <Spinner />

  return (
    <div style={{ padding:'32px 36px', maxWidth:1300 }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <div style={{ width:4, height:24, background:'linear-gradient(180deg,#3b82f6,#60a5fa)', borderRadius:2 }} />
          <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>Workshop Dashboard</h1>
        </div>
        <p style={{ fontSize:13, color:'#64748b', marginLeft:14 }}>MechMate AI — Mechanic Portal</p>
      </div>

      {paymentAlerts.map((a, i) => (
        <div key={i} style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:12, padding:'12px 18px', marginBottom:12, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:20 }}>💳</span>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#16a34a' }}>✓ Payment Received — {a.data?.customer_name || 'Customer'}</p>
            <p style={{ fontSize:11, color:'#64748b', ...MONO }}>Invoice {a.data?.invoice_id} · ₹{a.data?.grand_total} · {a.data?.payment_method} · {new Date(a.timestamp).toLocaleTimeString()}</p>
          </div>
          <button onClick={() => setPaymentAlerts(p => p.filter((_, j) => j !== i))} style={{ marginLeft:'auto', background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:16 }}>✕</button>
        </div>
      ))}

      {/* Workflow Stage Cards */}
      <div style={{ marginBottom:24 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>Workflow Pipeline</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {STAGE_CARDS.map(({ key, label, icon, color, bg, border, path }) => (
            <div key={key} onClick={() => navigate(path)}
              style={{ background:bg, border:`1px solid ${border}`, borderRadius:14, padding:'16px 18px', cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 6px 20px ${border}` }}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none' }}
            >
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:18 }}>{icon}</span>
                <span style={{ fontSize:22, fontWeight:800, color, lineHeight:1 }}>{stageCounts[key] ?? 0}</span>
              </div>
              <p style={{ fontSize:11, fontWeight:600, color, lineHeight:1.3 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:14 }}>
        <StatCard icon="🔧" label="Total Repairs"   value={stats?.total_repairs}                         color="blue"   />
        <StatCard icon="⏳" label="Pending"          value={stats?.pending_repairs}                       color="amber"  />
        <StatCard icon="⚙️" label="In Progress"     value={stats?.in_progress_repairs}                   color="indigo" />
        <StatCard icon="✅" label="Completed"        value={stats?.completed_repairs}                     color="green"  />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:28 }}>
        <StatCard icon="📦" label="Low Stock Items"  value={stats?.low_stock_count}                       color="amber"  />
        <StatCard icon="💳" label="Pending Payments" value={stats?.pending_payments}                      color="red"    />
        <StatCard icon="💰" label="Revenue"          value={`₹${stats?.total_revenue?.toFixed(0) ?? 0}`} color="teal"   />
      </div>

      <div style={{ ...CARD, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #f1f5f9' }}>
          <p style={{ fontSize:14, fontWeight:700, color:'#0f172a' }}>Recent Repairs</p>
          <button onClick={() => navigate('/mechanic/repair')} style={{ fontSize:12, color:'#3b82f6', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>View all →</button>
        </div>
        {repairs.length === 0 ? (
          <p style={{ textAlign:'center', color:'#94a3b8', padding:'32px 0', fontSize:13 }}>No repairs yet.</p>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #f1f5f9' }}>
                {['ID','Customer','Bike','Complaint','Priority','Status','Tracking ID',''].map(h => (
                  <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {repairs.map((r, i) => {
                const [pbg, pc] = PRIORITY_STYLE[r.priority] || ['#f1f5f9','#94a3b8']
                const [sbg, sc] = STATUS_STYLE[r.repair_status] || ['#f1f5f9','#94a3b8']
                return (
                  <tr key={r.repair_id} style={{ borderBottom: i < repairs.length-1 ? '1px solid #f8fafc' : 'none', transition:'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  >
                    <td style={{ padding:'12px 18px', ...MONO, fontSize:11, color:'#3b82f6' }}>#{r.repair_id}</td>
                    <td style={{ padding:'12px 18px', fontSize:13, fontWeight:600, color:'#0f172a' }}>{r.customer_name}</td>
                    <td style={{ padding:'12px 18px', fontSize:12, color:'#64748b' }}>{r.bike_model}</td>
                    <td style={{ padding:'12px 18px', fontSize:12, color:'#94a3b8', maxWidth:180 }}>
                      <span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.complaint}</span>
                    </td>
                    <td style={{ padding:'12px 18px' }}>
                      {r.priority && <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:99, background:pbg, color:pc }}>{r.priority}</span>}
                    </td>
                    <td style={{ padding:'12px 18px' }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:99, background:sbg, color:sc }}>{r.repair_status}</span>
                    </td>
                    <td style={{ padding:'12px 18px' }}>
                      <button onClick={() => navigator.clipboard?.writeText(`REP${r.repair_id}`)} title="Copy tracking ID"
                        style={{ fontSize:10, fontWeight:700, color:'#7c3aed', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:7, padding:'3px 8px', cursor:'pointer', fontFamily:'JetBrains Mono, monospace' }}>
                        REP{r.repair_id}
                      </button>
                    </td>
                    <td style={{ padding:'12px 18px' }}>
                      <button onClick={() => setDelRecord(r)} style={{ padding:'4px 9px', borderRadius:6, fontSize:11, background:'#fee2e2', color:'#dc2626', border:'1px solid #fecaca', cursor:'pointer', fontWeight:700 }}>🗑</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {delRecord && <ConfirmDelete label={`Repair #${delRecord.repair_id} (${delRecord.customer_name})`} onCancel={() => setDelRecord(null)} onConfirm={handleDelete} />}
    </div>
  )
}
