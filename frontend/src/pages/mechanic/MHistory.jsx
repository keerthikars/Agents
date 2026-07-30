import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWorkflowHistory, deleteWorkflow } from '../../api/orchestratorApi'
import toast from 'react-hot-toast'

const MONO = { fontFamily:'JetBrains Mono, monospace' }
const STATUS = {
  completed:          { bg:'#dcfce7', color:'#16a34a' },
  running:            { bg:'#dbeafe', color:'#2563eb' },
  failed:             { bg:'#fee2e2', color:'#dc2626' },
  repair_in_progress: { bg:'#fef3c7', color:'#d97706' },
}
const STAGE_LABEL = { intake:'Intake', diagnosis:'Diagnosis', inventory:'Inventory', repair:'Repair', billing:'Billing', notification:'Notification', completed:'Completed', failed:'Failed' }

function ConfirmDelete({ label, onConfirm, onCancel }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'#fff', borderRadius:14, padding:'24px 28px', width:340, border:'1px solid #fecaca', boxShadow:'0 16px 48px rgba(0,0,0,0.12)' }}>
        <p style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:8 }}>Delete Workflow?</p>
        <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>Permanently delete <b style={{ color:'#0f172a' }}>{label}</b> and all its logs.</p>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:'10px', borderRadius:9, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1, padding:'10px', borderRadius:9, border:'none', background:'#dc2626', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function MHistory() {
  const [runs, setRuns]     = useState([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [delRun, setDelRun] = useState(null)
  const navigate = useNavigate()
  const LIMIT = 15

  const fetchRuns = () => {
    setLoading(true)
    getWorkflowHistory(page * LIMIT, LIMIT)
      .then(r => { setRuns(r.data.runs || []); setTotal(r.data.total || 0) })
      .catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchRuns() }, [page])

  const handleDelete = async () => {
    try { await deleteWorkflow(delRun.id); toast.success(`Deleted workflow #${delRun.id}`); setDelRun(null); fetchRuns() }
    catch { toast.error('Delete failed') }
  }

  const filtered = runs.filter(r =>
    !search || r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.bike_model?.toLowerCase().includes(search.toLowerCase()) || String(r.repair_id).includes(search)
  )

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <div style={{ width:4, height:24, background:'linear-gradient(180deg,#3b82f6,#60a5fa)', borderRadius:2 }} />
          <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>Workflow History</h1>
        </div>
        <p style={{ fontSize:13, color:'#64748b', marginLeft:14 }}>{total} total workflow runs — triggered automatically when bike is received</p>
      </div>

      <input type="text" placeholder="Search by customer, bike, or repair ID..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width:340, background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:10, padding:'9px 14px', fontSize:13, color:'#0f172a', outline:'none', marginBottom:18 }}
        onFocus={e => e.target.style.borderColor='#3b82f6'} onBlur={e => e.target.style.borderColor='#e2e8f0'}
      />

      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #f1f5f9', background:'#f8fafc' }}>
              {['Workflow','Repair ID','Customer','Bike','Stage','Status','Started','',''].map((h, i) => (
                <th key={i} style={{ padding:'11px 18px', textAlign:'left', fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} style={{ textAlign:'center', padding:'40px 0', color:'#94a3b8', fontSize:13 }}>Loading...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign:'center', padding:'40px 0', color:'#94a3b8', fontSize:13 }}>No workflows found.</td></tr>}
            {filtered.map((run, i) => {
              const st = STATUS[run.status] || STATUS.running
              return (
                <tr key={run.id} style={{ borderBottom: i < filtered.length-1 ? '1px solid #f8fafc' : 'none', transition:'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  <td style={{ padding:'13px 18px', ...MONO, fontSize:12, color:'#3b82f6' }}>#{run.id}</td>
                  <td style={{ padding:'13px 18px', ...MONO, fontSize:12, color:'#94a3b8' }}>{run.repair_id ? `#${run.repair_id}` : '—'}</td>
                  <td style={{ padding:'13px 18px', fontSize:13, fontWeight:600, color:'#0f172a' }}>{run.customer_name}</td>
                  <td style={{ padding:'13px 18px', fontSize:12, color:'#64748b' }}>{run.bike_model}</td>
                  <td style={{ padding:'13px 18px' }}>
                    <span style={{ fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:99, background:'#eff6ff', color:'#2563eb' }}>
                      {STAGE_LABEL[run.current_stage] || run.current_stage}
                    </span>
                  </td>
                  <td style={{ padding:'13px 18px' }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:99, background:st.bg, color:st.color, textTransform:'capitalize' }}>{run.status}</span>
                  </td>
                  <td style={{ padding:'13px 18px', fontSize:11, color:'#94a3b8', ...MONO }}>{new Date(run.started_at).toLocaleString()}</td>
                  <td style={{ padding:'13px 18px' }}>
                    <button onClick={() => navigate(`/mechanic/history/${run.id}`)} style={{ fontSize:12, color:'#3b82f6', background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>View →</button>
                  </td>
                  <td style={{ padding:'13px 18px' }}>
                    <button onClick={() => setDelRun(run)} style={{ padding:'4px 9px', borderRadius:6, fontSize:11, background:'#fee2e2', color:'#dc2626', border:'1px solid #fecaca', cursor:'pointer', fontWeight:700 }}>🗑</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {total > LIMIT && (
        <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center', marginTop:20 }}>
          {[['← Prev', () => setPage(p => Math.max(0,p-1)), page===0],['Next →', () => setPage(p => p+1), (page+1)*LIMIT>=total]].map(([label, fn, disabled]) => (
            <button key={label} onClick={fn} disabled={disabled} style={{ padding:'8px 16px', borderRadius:9, fontSize:12, fontWeight:600, cursor:disabled?'not-allowed':'pointer', background:disabled?'#f1f5f9':'#fff', border:'1px solid #e2e8f0', color:disabled?'#94a3b8':'#3b82f6' }}>{label}</button>
          ))}
          <span style={{ fontSize:12, color:'#64748b' }}>Page {page+1} of {Math.ceil(total/LIMIT)}</span>
        </div>
      )}

      {delRun && <ConfirmDelete label={`Workflow #${delRun.id} (${delRun.customer_name})`} onCancel={() => setDelRun(null)} onConfirm={handleDelete} />}
    </div>
  )
}
