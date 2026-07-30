import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDashboardStats, getRepairs, deleteRepair } from '../api/orchestratorApi'
import StatCard from '../components/StatCard'
import toast from 'react-hot-toast'

const C = {
  page:  { padding: '32px 36px', maxWidth: 1200 },
  card:  { background: '#ffffff', border: '1px solid #ede9fe', borderRadius: 14, boxShadow: '0 1px 4px rgba(109,40,217,0.06)' },
  label: { fontSize: 10, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' },
  mono:  { fontFamily: 'JetBrains Mono, monospace' },
}

function Loader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #ede9fe', borderTopColor: '#7c3aed', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ConfirmDelete({ label, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,27,75,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', width: 340, boxShadow: '0 16px 48px rgba(0,0,0,0.15)', border: '1px solid #fecaca' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1e1b4b', marginBottom: 8 }}>Delete Record?</p>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Permanently delete <b>{label}</b>. Cannot be undone.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid #ede9fe', background: '#faf9ff', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

const PRIORITY_COLOR = { High: '#dc2626', Medium: '#d97706', Low: '#16a34a' }
const PRIORITY_BG    = { High: '#fee2e2', Medium: '#fef3c7', Low: '#dcfce7' }
const STATUS_COLOR   = { Completed: '#16a34a', 'In Progress': '#2563eb', Pending: '#9ca3af' }
const STATUS_BG      = { Completed: '#dcfce7', 'In Progress': '#dbeafe', Pending: '#f5f3ff' }

export default function Dashboard() {
  const [stats, setStats]         = useState(null)
  const [repairs, setRepairs]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [delRecord, setDelRecord] = useState(null)
  const navigate = useNavigate()

  const fetchData = () => {
    Promise.all([getDashboardStats(), getRepairs(0, 6)])
      .then(([s, r]) => { setStats(s.data); setRepairs(r.data.records || []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleDelete = async () => {
    try {
      await deleteRepair(delRecord.repair_id)
      toast.success(`Deleted repair #${delRecord.repair_id}`)
      setDelRecord(null)
      fetchData()
    } catch {
      toast.error('Delete failed')
    }
  }

  if (loading) return <Loader />

  return (
    <div style={C.page}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#7c3aed,#a78bfa)', borderRadius: 2 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.5px' }}>Dashboard</h1>
        </div>
        <p style={{ fontSize: 13, color: '#9ca3af', marginLeft: 14 }}>MechMate AI — Multi-Agent Bike Repair System</p>
      </div>

      {/* Stats row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
        <StatCard icon="🔧" label="Total Repairs"  value={stats?.total_repairs}                         color="violet" />
        <StatCard icon="⏳" label="Pending"         value={stats?.pending_repairs}                       color="amber"  />
        <StatCard icon="✅" label="Completed"       value={stats?.completed_repairs}                     color="green"  />
        <StatCard icon="💰" label="Revenue"         value={`₹${stats?.total_revenue?.toFixed(0) ?? 0}`} color="indigo" />
      </div>

      {/* Stats row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard icon="⚡" label="Workflows Run"      value={stats?.workflows_today}    color="teal"  />
        <StatCard icon="✕"  label="Failed Workflows"   value={stats?.failed_workflows}   color="red"   />
        <StatCard icon="📦" label="Low Stock Items"    value={stats?.low_stock_count}    color="amber" />
        <StatCard icon="🧾" label="Invoices Generated" value={stats?.invoices_generated} color="blue"  />
      </div>

      {/* Recent repairs */}
      <div style={{ ...C.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f5f3ff' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>Recent Repairs</p>
          <Link to="/history" style={{ fontSize: 12, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
        </div>

        {repairs.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#c4b5fd', padding: '32px 0', fontSize: 13 }}>
            No repairs yet. <Link to="/workflow" style={{ color: '#7c3aed', fontWeight: 600 }}>Start a workflow</Link> to begin.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f5f3ff' }}>
                {['ID', 'Customer', 'Bike', 'Complaint', 'Priority', 'Status', ''].map(h => (
                  <th key={h} style={{ ...C.label, padding: '10px 20px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {repairs.map((r, i) => (
                <tr key={r.repair_id}
                  style={{ borderBottom: i < repairs.length - 1 ? '1px solid #faf9ff' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#faf9ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 20px', ...C.mono, fontSize: 12, color: '#a78bfa' }}>#{r.repair_id}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: '#1e1b4b' }}>{r.customer_name}</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: '#6b7280' }}>{r.bike_model}</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: '#9ca3af', maxWidth: 200 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.complaint}</span>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    {r.priority && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: PRIORITY_BG[r.priority], color: PRIORITY_COLOR[r.priority] }}>
                        {r.priority}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: STATUS_BG[r.repair_status] || '#f5f3ff', color: STATUS_COLOR[r.repair_status] || '#9ca3af' }}>
                      {r.repair_status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <button onClick={() => setDelRecord(r)} style={{ padding: '4px 9px', borderRadius: 6, fontSize: 11, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer', fontWeight: 700 }}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CTA */}
      <div style={{
        borderRadius: 16, padding: '24px 28px',
        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 8px 32px rgba(124,58,237,0.3)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -40, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 5 }}>Launch a New Repair Workflow</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>All 6 agents execute automatically — intake → diagnosis → inventory → repair → billing → notify</p>
        </div>
        <button onClick={() => navigate('/workflow')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#fff', color: '#7c3aed',
          fontWeight: 700, fontSize: 13,
          padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
          flexShrink: 0, marginLeft: 20, position: 'relative', zIndex: 1,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>⚡ Start Workflow</button>
      </div>

      {delRecord && (
        <ConfirmDelete
          label={`Repair #${delRecord.repair_id} (${delRecord.customer_name})`}
          onCancel={() => setDelRecord(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
