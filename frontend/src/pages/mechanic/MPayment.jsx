import { useEffect, useState, useCallback } from 'react'
import { getRepairs, markCashPaid } from '../../api/orchestratorApi'
import useRealtimeSync from '../../hooks/useRealtimeSync'
import toast from 'react-hot-toast'

const MONO = { fontFamily:'JetBrains Mono, monospace' }
const CARD = { background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }

const PAY_STYLE = {
  Paid:    { bg:'#dcfce7', color:'#16a34a', border:'#bbf7d0' },
  Pending: { bg:'#fef3c7', color:'#d97706', border:'#fde68a' },
  Failed:  { bg:'#fee2e2', color:'#dc2626', border:'#fecaca' },
}

const METHOD_ICON = { Cash:'💵', UPI:'📱', Card:'💳', 'Net Banking':'🏦' }

export default function MPayment() {
  const [records, setRecords]   = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(0)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('All')
  const [loading, setLoading]   = useState(true)
  const [liveAlerts, setLiveAlerts] = useState([])
  const LIMIT = 15

  const fetchRecords = useCallback(() => {
    setLoading(true)
    getRepairs(page * LIMIT, LIMIT)
      .then(r => { const billed = (r.data.records || []).filter(rec => rec.invoice_id); setRecords(billed); setTotal(r.data.total || 0) })
      .catch(console.error).finally(() => setLoading(false))
  }, [page])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleEvent = useCallback((evt) => {
    if (evt.event === 'payment_received') { setLiveAlerts(prev => [evt, ...prev.slice(0, 4)]); fetchRecords(); toast.success(`💳 Payment received — ${evt.data?.invoice_id}`) }
    if (evt.event === 'payment_pending' || evt.event === 'poll_update') fetchRecords()
  }, [fetchRecords])
  useRealtimeSync({ repairId: null, onEvent: handleEvent, enabled: true })

  const handleMarkCashPaid = async (r) => {
    try { await markCashPaid(r.repair_id); toast.success(`Cash collected for ${r.invoice_id}`); fetchRecords() }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const filtered = records.filter(r => {
    const ms = !search || r.customer_name?.toLowerCase().includes(search.toLowerCase()) || r.invoice_id?.toLowerCase().includes(search.toLowerCase()) || String(r.repair_id).includes(search)
    const mf = filter === 'All' || r.payment_status === filter || (filter === 'Cash Pending' && r.payment_method === 'Cash' && r.payment_status !== 'Paid')
    return ms && mf
  })

  const paidCount    = records.filter(r => r.payment_status === 'Paid').length
  const pendingCount = records.filter(r => r.payment_status !== 'Paid').length
  const totalRevenue = records.filter(r => r.payment_status === 'Paid').reduce((s, r) => s + (r.grand_total || 0), 0)

  // Locked state — no invoices generated yet (no repair completed)
  if (!loading && records.length === 0 && total > 0) {
    // There are repairs but none completed/billed yet
  }
  if (!loading && total === 0) {
    return (
      <div style={{ padding:'32px 36px' }}>
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <div style={{ width:4, height:24, background:'linear-gradient(180deg,#16a34a,#3b82f6)', borderRadius:2 }} />
            <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>Payment Status</h1>
          </div>
          <p style={{ fontSize:13, color:'#64748b', marginLeft:14 }}>Agent 4 — Billing activates after Repair Completed</p>
        </div>
        <div style={{ background:'#fff', border:'2px dashed #e2e8f0', borderRadius:16, padding:'60px 40px', textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
          <p style={{ fontSize:16, fontWeight:700, color:'#0f172a', marginBottom:8 }}>Billing Agent Locked</p>
          <p style={{ fontSize:13, color:'#64748b', maxWidth:400, margin:'0 auto', lineHeight:1.6 }}>
            Billing is only activated when you mark a repair as <strong>Repair Completed</strong> in the Repair Status page. This automatically triggers Agent 4 to generate the invoice.
          </p>
          <div style={{ marginTop:20, display:'inline-flex', alignItems:'center', gap:8, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'10px 18px' }}>
            <span style={{ fontSize:14 }}>🔧</span>
            <span style={{ fontSize:12, color:'#16a34a', fontWeight:600 }}>Repair Status → Mark Repair Completed → Invoice Generated</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <div style={{ width:4, height:24, background:'linear-gradient(180deg,#16a34a,#3b82f6)', borderRadius:2 }} />
          <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>Payment Status</h1>
        </div>
        <p style={{ fontSize:13, color:'#64748b', marginLeft:14 }}>Monitor payments — customers pay via their portal. Mark cash as collected here.</p>
      </div>

      {liveAlerts.map((a, i) => (
        <div key={i} style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:12, padding:'12px 18px', marginBottom:12, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:20 }}>💳</span>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#16a34a' }}>✓ Payment Received</p>
            <p style={{ fontSize:11, color:'#64748b', ...MONO }}>Invoice {a.data?.invoice_id} · ₹{a.data?.grand_total} · {a.data?.payment_method} · {new Date(a.timestamp).toLocaleTimeString()}</p>
          </div>
          <button onClick={() => setLiveAlerts(p => p.filter((_,j) => j!==i))} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:16 }}>✕</button>
        </div>
      ))}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:22 }}>
        {[['💰 Revenue Collected', `₹${totalRevenue.toFixed(0)}`, '#16a34a','#f0fdf4','#bbf7d0'],
          ['✅ Paid', paidCount, '#16a34a','#f0fdf4','#bbf7d0'],
          ['⏳ Pending', pendingCount, '#d97706','#fffbeb','#fde68a'],
        ].map(([label, val, color, bg, border]) => (
          <div key={label} style={{ background:bg, border:`1px solid ${border}`, borderRadius:14, padding:'16px 20px' }}>
            <p style={{ fontSize:26, fontWeight:800, color, lineHeight:1 }}>{val}</p>
            <p style={{ fontSize:11, color:'#64748b', marginTop:5, fontWeight:500 }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        <input type="text" placeholder="Search by customer, invoice, or repair ID..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:10, padding:'9px 14px', fontSize:13, color:'#0f172a', outline:'none', width:320 }}
          onFocus={e => e.target.style.borderColor='#3b82f6'} onBlur={e => e.target.style.borderColor='#e2e8f0'}
        />
        <div style={{ display:'flex', gap:6 }}>
          {['All','Paid','Pending','Cash Pending'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding:'7px 14px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', background:filter===s?'#3b82f6':'#fff', color:filter===s?'#fff':'#64748b', border:filter===s?'1.5px solid #3b82f6':'1.5px solid #e2e8f0' }}>{s}</button>
          ))}
        </div>
      </div>

      <div style={CARD}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #f1f5f9', background:'#f8fafc' }}>
              {['Invoice ID','Repair ID','Customer','Bike','Amount','Method','Status','Date','Action'].map(h => (
                <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} style={{ textAlign:'center', padding:'40px 0', color:'#94a3b8', fontSize:13 }}>Loading...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign:'center', padding:'40px 0', color:'#94a3b8', fontSize:13 }}>No invoices yet.</td></tr>}
            {filtered.map((r, i) => {
              const ps = PAY_STYLE[r.payment_status] || PAY_STYLE.Pending
              const isPaid = r.payment_status === 'Paid'
              const isCashPending = r.payment_method === 'Cash' && !isPaid
              return (
                <tr key={r.repair_id} style={{ borderBottom: i < filtered.length-1 ? '1px solid #f8fafc' : 'none', transition:'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  <td style={{ padding:'12px 14px', ...MONO, fontSize:12, color:'#3b82f6', fontWeight:600 }}>{r.invoice_id}</td>
                  <td style={{ padding:'12px 14px', ...MONO, fontSize:12, color:'#94a3b8' }}>#{r.repair_id}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, fontWeight:600, color:'#0f172a' }}>{r.customer_name}</td>
                  <td style={{ padding:'12px 14px', fontSize:12, color:'#64748b' }}>{r.bike_model}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, fontWeight:800, color:'#0f172a' }}>{r.grand_total != null ? `₹${r.grand_total.toFixed(2)}` : '—'}</td>
                  <td style={{ padding:'12px 14px', fontSize:12, color:'#64748b' }}>
                    {r.payment_method ? <span style={{ display:'flex', alignItems:'center', gap:5 }}><span>{METHOD_ICON[r.payment_method] || '💰'}</span><span>{r.payment_method}</span></span> : <span style={{ color:'#94a3b8' }}>—</span>}
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:99, background:ps.bg, color:ps.color, border:`1px solid ${ps.border}` }}>{r.payment_status || 'Pending'}</span>
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:11, color:'#94a3b8', ...MONO }}>
                    {r.paid_at ? new Date(r.paid_at).toLocaleString() : r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    {isCashPending && (
                      <button onClick={() => handleMarkCashPaid(r)} style={{ padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:700, background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff', border:'none', cursor:'pointer', whiteSpace:'nowrap' }}>✓ Mark Paid</button>
                    )}
                    {isPaid && <span style={{ fontSize:11, color:'#16a34a', fontWeight:600 }}>✓ Collected</span>}
                    {!isCashPending && !isPaid && !r.payment_method && <span style={{ fontSize:11, color:'#94a3b8' }}>Awaiting customer</span>}
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
    </div>
  )
}
