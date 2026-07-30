import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getRepairs, completeRepair, updateRepairStatus } from '../../api/orchestratorApi'
import useRealtimeSync from '../../hooks/useRealtimeSync'

const MONO = { fontFamily:'JetBrains Mono, monospace' }
const CARD = { background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:14, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }

const STATUS_STYLE = {
  Completed:    { bg:'#dcfce7', color:'#16a34a', border:'#bbf7d0' },
  'In Progress':{ bg:'#dbeafe', color:'#2563eb', border:'#bfdbfe' },
  Pending:      { bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe' },
}
const SEV_STYLE = {
  Critical:{ bg:'#fee2e2', color:'#dc2626', border:'#fecaca' },
  High:    { bg:'#ffedd5', color:'#ea580c', border:'#fed7aa' },
  Medium:  { bg:'#fef3c7', color:'#d97706', border:'#fde68a' },
  Low:     { bg:'#dcfce7', color:'#16a34a', border:'#bbf7d0' },
}

// Full repair workflow steps per spec
const REPAIR_STEPS = [
  { key: 'Bike Received',        icon: '🏍️', pct: 10 },
  { key: 'Diagnosis Completed',  icon: '🔬', pct: 20 },
  { key: 'Waiting for Parts',    icon: '📦', pct: 30 },
  { key: 'Repair Started',       icon: '🔧', pct: 40 },
  { key: 'Engine Opened',        icon: '⚙️', pct: 55 },
  { key: 'Parts Installed',      icon: '🔩', pct: 70 },
  { key: 'Testing',              icon: '🧪', pct: 82 },
  { key: 'Quality Check',        icon: '✔️', pct: 92 },
  { key: 'Repair Completed',     icon: '✅', pct: 100 },
]

function getProgress(status) {
  if (status === 'Completed') return 100
  const step = REPAIR_STEPS.find(s => s.key === status)
  return step ? step.pct : 10
}

function ProgressBar({ status }) {
  const pct = getProgress(status)
  const color = pct === 100 ? '#16a34a' : pct >= 70 ? '#3b82f6' : '#f59e0b'
  return (
    <div style={{ width:'100%', background:'#f1f5f9', borderRadius:99, height:6, marginTop:10 }}>
      <div style={{ width:`${pct}%`, height:6, borderRadius:99, background:color, transition:'width 0.5s' }} />
    </div>
  )
}

function StatusUpdateModal({ record, onClose, onDone }) {
  const [step, setStep] = useState(record.repair_status)
  const [saving, setSaving] = useState(false)
  const isRepairCompleted = step === 'Repair Completed'

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isRepairCompleted) {
        // Trigger billing agent
        await completeRepair(record.repair_id)
        toast.success(`✅ Repair completed! Invoice generated for ${record.customer_name}`)
      } else {
        await updateRepairStatus(record.repair_id, step)
        toast.success(`Status updated to "${step}"`)
      }
      onDone(); onClose()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'#fff', borderRadius:18, padding:'28px', width:440, border:'1px solid #e2e8f0', boxShadow:'0 16px 48px rgba(0,0,0,0.12)', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <p style={{ fontSize:17, fontWeight:800, color:'#0f172a' }}>Update Repair Status</p>
            <p style={{ fontSize:12, color:'#64748b', marginTop:2 }}>#{record.repair_id} · {record.customer_name}</p>
          </div>
          <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:8, width:32, height:32, fontSize:16, color:'#64748b', cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:20 }}>
          {REPAIR_STEPS.map(({ key, icon, pct }) => {
            const isSelected = step === key
            const isComplete = key === 'Repair Completed'
            return (
              <button key={key} onClick={() => setStep(key)} style={{
                display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, cursor:'pointer', textAlign:'left',
                background: isSelected ? (isComplete ? '#f0fdf4' : '#eff6ff') : '#f8fafc',
                border: isSelected ? `2px solid ${isComplete ? '#16a34a' : '#3b82f6'}` : '1px solid #e2e8f0',
                transition:'all 0.15s',
              }}>
                <span style={{ fontSize:14 }}>{icon}</span>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:13, fontWeight:isSelected?700:400, color:isSelected?(isComplete?'#16a34a':'#2563eb'):'#64748b' }}>{key}</span>
                  {isComplete && <span style={{ fontSize:10, color:'#16a34a', marginLeft:8, fontWeight:600 }}>→ Triggers Billing Agent</span>}
                </div>
                <span style={{ fontSize:10, color:'#94a3b8', ...MONO }}>{pct}%</span>
              </button>
            )
          })}
        </div>

        {isRepairCompleted && (
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
            <p style={{ fontSize:12, color:'#16a34a', fontWeight:600 }}>
              ✅ Selecting "Repair Completed" will automatically trigger the Billing Agent (Agent 4) to generate the invoice. The customer will be notified.
            </p>
          </div>
        )}

        <button onClick={handleSave} disabled={saving} style={{ width:'100%', padding:'13px', borderRadius:11, border:'none', cursor:saving?'not-allowed':'pointer', background:saving?'#e2e8f0':isRepairCompleted?'linear-gradient(135deg,#16a34a,#15803d)':'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:saving?'#94a3b8':'#fff', fontWeight:700, fontSize:14 }}>
          {saving ? 'Processing...' : isRepairCompleted ? '✅ Complete Repair & Generate Invoice' : '✓ Update Status'}
        </button>
      </div>
    </div>
  )
}

export default function MRepair() {
  const [records, setRecords]   = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(0)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('All')
  const [loading, setLoading]   = useState(true)
  const [updateRecord, setUpdateRecord] = useState(null)
  const LIMIT = 15

  const fetchRecords = useCallback(() => {
    setLoading(true)
    getRepairs(page * LIMIT, LIMIT)
      .then(r => { setRecords(r.data.records || []); setTotal(r.data.total || 0) })
      .catch(console.error).finally(() => setLoading(false))
  }, [page])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleEvent = useCallback((evt) => { if (evt.event !== 'poll_update') fetchRecords() }, [fetchRecords])
  useRealtimeSync({ repairId: null, onEvent: handleEvent, enabled: true })

  const filtered = records.filter(r => {
    const ms = !search || r.customer_name?.toLowerCase().includes(search.toLowerCase()) || r.bike_model?.toLowerCase().includes(search.toLowerCase()) || String(r.repair_id).includes(search)
    const mf = filter === 'All' || r.repair_status === filter
    return ms && mf
  })

  const counts = {
    All: records.length,
    Pending: records.filter(r => r.repair_status === 'Pending').length,
    'In Progress': records.filter(r => r.repair_status === 'In Progress').length,
    Completed: records.filter(r => r.repair_status === 'Completed').length,
  }

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <div style={{ width:4, height:24, background:'linear-gradient(180deg,#d97706,#3b82f6)', borderRadius:2 }} />
          <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>Repair Status</h1>
        </div>
        <p style={{ fontSize:13, color:'#64748b', marginLeft:14 }}>Agent 5 — Update repair progress. "Repair Completed" triggers Billing Agent automatically.</p>
      </div>

      {/* Billing gate notice */}
      <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'12px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:16 }}>🧾</span>
        <p style={{ fontSize:12, color:'#92400e' }}>
          <strong>Billing is locked</strong> until you mark a repair as <strong>Repair Completed</strong>. This automatically runs Agent 4 (Billing) and notifies the customer.
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
        {[['Total',counts.All,'#0f172a','#f8fafc','#e2e8f0'],['Pending',counts.Pending,'#7c3aed','#faf5ff','#ddd6fe'],['In Progress',counts['In Progress'],'#2563eb','#eff6ff','#bfdbfe'],['Completed',counts.Completed,'#16a34a','#f0fdf4','#bbf7d0']].map(([label, val, color, bg, border]) => (
          <div key={label} style={{ background:bg, border:`1px solid ${border}`, borderRadius:14, padding:'16px 20px' }}>
            <p style={{ fontSize:26, fontWeight:800, color, lineHeight:1 }}>{val}</p>
            <p style={{ fontSize:11, color:'#64748b', marginTop:5, fontWeight:500 }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        <input type="text" placeholder="Search repairs..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:10, padding:'9px 14px', fontSize:13, color:'#0f172a', outline:'none', width:260 }}
          onFocus={e => e.target.style.borderColor='#3b82f6'} onBlur={e => e.target.style.borderColor='#e2e8f0'}
        />
        <div style={{ display:'flex', gap:6 }}>
          {['All','Pending','In Progress','Completed'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding:'7px 14px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s', background:filter===s?'#3b82f6':'#fff', color:filter===s?'#fff':'#64748b', border:filter===s?'1.5px solid #3b82f6':'1.5px solid #e2e8f0' }}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
          <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid #e2e8f0', borderTopColor:'#3b82f6', animation:'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.length === 0 && <p style={{ textAlign:'center', color:'#94a3b8', padding:'60px 0', fontSize:13 }}>No repairs found.</p>}
          {filtered.map(r => {
            const st = STATUS_STYLE[r.repair_status] || STATUS_STYLE.Pending
            const sv = r.severity ? (SEV_STYLE[r.severity] || SEV_STYLE.Low) : null
            const pct = getProgress(r.repair_status)
            const isCompleted = r.repair_status === 'Completed'
            return (
              <div key={r.repair_id} style={{ ...CARD, padding:'16px 20px' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(59,130,246,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.04)'}
              >
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ ...MONO, fontSize:11, color:'#3b82f6' }}>#{r.repair_id}</span>
                      <span style={{ fontSize:10, fontWeight:700, color:'#7c3aed', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:6, padding:'2px 7px', ...MONO, cursor:'pointer' }}
                        onClick={() => navigator.clipboard?.writeText(`REP${r.repair_id}`)} title="Copy tracking ID">REP{r.repair_id}</span>
                      <span style={{ fontSize:14, fontWeight:700, color:'#0f172a' }}>{r.customer_name}</span>
                      {sv && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:sv.bg, color:sv.color, border:`1px solid ${sv.border}` }}>{r.severity}</span>}
                    </div>
                    <p style={{ fontSize:12, color:'#64748b' }}>{r.bike_model}{r.brand ? ` · ${r.brand}` : ''}</p>
                    <p style={{ fontSize:11, color:'#94a3b8', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.complaint}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                      <div style={{ flex:1, background:'#f1f5f9', borderRadius:99, height:6 }}>
                        <div style={{ width:`${pct}%`, height:6, borderRadius:99, background: pct===100?'#16a34a':pct>=70?'#3b82f6':'#f59e0b', transition:'width 0.5s' }} />
                      </div>
                      <span style={{ fontSize:10, color:'#94a3b8', ...MONO, flexShrink:0 }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:99, background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>{r.repair_status}</span>
                    {!isCompleted && (
                      <button onClick={() => setUpdateRecord(r)} style={{ padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer', background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe' }}>
                        ✏ Update Status
                      </button>
                    )}
                    {isCompleted && r.invoice_id && (
                      <span style={{ fontSize:11, color:'#16a34a', fontWeight:600, ...MONO }}>{r.invoice_id}</span>
                    )}
                    {isCompleted && !r.invoice_id && (
                      <span style={{ fontSize:11, color:'#d97706', fontWeight:600 }}>Invoice pending...</span>
                    )}
                    <span style={{ fontSize:11, color:'#94a3b8', ...MONO }}>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {total > LIMIT && (
        <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center', marginTop:20 }}>
          {[['← Prev', () => setPage(p => Math.max(0,p-1)), page===0],['Next →', () => setPage(p => p+1), (page+1)*LIMIT>=total]].map(([label, fn, disabled]) => (
            <button key={label} onClick={fn} disabled={disabled} style={{ padding:'8px 16px', borderRadius:9, fontSize:12, fontWeight:600, cursor:disabled?'not-allowed':'pointer', background:disabled?'#f1f5f9':'#fff', border:'1px solid #e2e8f0', color:disabled?'#94a3b8':'#3b82f6' }}>{label}</button>
          ))}
          <span style={{ fontSize:12, color:'#64748b' }}>Page {page+1} of {Math.ceil(total/LIMIT)}</span>
        </div>
      )}

      {updateRecord && <StatusUpdateModal record={updateRecord} onClose={() => setUpdateRecord(null)} onDone={fetchRecords} />}
    </div>
  )
}
