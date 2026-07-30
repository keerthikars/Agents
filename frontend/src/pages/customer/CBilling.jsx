/**
 * CBilling.jsx — Customer Billing & Payment
 * Agent 4 output. Customer views invoice and pays here.
 */
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getRepairStatus, recordPayment, getCustomerRepairs } from '../../api/orchestratorApi'
import useRealtimeSync from '../../hooks/useRealtimeSync'
import toast from 'react-hot-toast'

const C = {
  card: { background:'#fff', border:'1px solid #e0e7ff', borderRadius:16, boxShadow:'0 2px 12px rgba(99,102,241,0.06)' },
  mono: { fontFamily:'JetBrains Mono, monospace' },
}

const METHODS = [
  { id:'UPI',         icon:'📱', label:'UPI / QR Code',       desc:'Scan QR — instant payment' },
  { id:'Card',        icon:'💳', label:'Debit / Credit Card',  desc:'Marks paid instantly' },
  { id:'Net Banking', icon:'🏦', label:'Net Banking',          desc:'Marks paid instantly' },
  { id:'Cash',        icon:'💵', label:'Cash at Counter',      desc:'Pay at the workshop counter' },
]

const UPI_QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=mechmate@upi%26pn=MechMate%26am=`

function Spinner() {
  return <span style={{ width:15, height:15, borderRadius:'50%', border:'2px solid #ddd6fe', borderTopColor:'#6366f1', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
}

export default function CBilling() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const repairIdParam = searchParams.get('repair_id')
  const id = repairIdParam ? parseInt(repairIdParam, 10) : null
  const [repairs, setRepairs] = useState([])
  const [repair, setRepair]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [method, setMethod]   = useState('UPI')
  const [step, setStep]       = useState('select')
  const [paying, setPaying]   = useState(false)

  useEffect(() => {
    getCustomerRepairs().then(r => setRepairs(r.data || [])).catch(console.error)
  }, [])

  useEffect(() => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    getRepairStatus(id).then(r => setRepair(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const handleEvent = useCallback((evt) => {
    if (evt.event === 'poll_update') { setRepair(evt.data); return }
    if (evt.stage === 'payment' || evt.stage === 'billing') {
      setRepair(prev => prev ? { ...prev, payment_status: evt.data?.payment_status || prev.payment_status, payment_method: evt.data?.payment_method || prev.payment_method, invoice_id: evt.data?.invoice_id || prev.invoice_id, grand_total: evt.data?.grand_total ?? prev.grand_total } : prev)
    }
  }, [])

  useRealtimeSync({ repairId: id, onEvent: handleEvent, enabled: !!id })

  const handlePay = async () => {
    if (method === 'UPI' && step === 'select') { setStep('qr'); return }
    setPaying(true)
    try {
      await recordPayment(id, method)
      if (method === 'Cash') {
        toast('💵 Cash payment recorded. Please pay at the counter.', { icon:'⏳' })
      } else {
        toast.success(`✅ Payment of ₹${repair.grand_total?.toFixed(2)} confirmed!`)
      }
      setStep('done')
      getRepairStatus(id).then(r => setRepair(r.data)).catch(console.error)
    } catch (err) { toast.error(err.response?.data?.detail || 'Payment failed') } finally { setPaying(false) }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #e0e7ff', borderTopColor:'#6366f1', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!id || !repair) {
    const withInvoice = repairs.filter(r => r.invoice_id)
    return (
      <div style={{ padding:'28px 28px', maxWidth:700 }}>
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <div style={{ width:4, height:24, background:'linear-gradient(180deg,#6366f1,#818cf8)', borderRadius:2 }} />
            <h1 style={{ fontSize:22, fontWeight:800, color:'#1e1b4b' }}>Billing & Invoice</h1>
          </div>
        </div>
        {withInvoice.length === 0 ? (
          <div style={{ background:'#fff', border:'1px solid #e0e7ff', borderRadius:16, padding:'48px', textAlign:'center', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' }}>
            <p style={{ fontSize:40, marginBottom:12 }}>⏳</p>
            <p style={{ fontSize:16, fontWeight:700, color:'#4338ca', marginBottom:8 }}>No Invoices Yet</p>
            <p style={{ fontSize:13, color:'#9ca3af' }}>Invoices will appear here once your repair is complete.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <p style={{ fontSize:13, color:'#6b7280', marginBottom:4 }}>Select a repair to view invoice:</p>
            {withInvoice.map(r => (
              <button key={r.repair_id} onClick={() => navigate(`/customer/portal/billing?repair_id=${r.repair_id}`)}
                style={{ background:'#fff', border:'1px solid #e0e7ff', borderRadius:14, padding:'16px 20px', textAlign:'left', cursor:'pointer', boxShadow:'0 2px 8px rgba(99,102,241,0.06)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p style={{ fontSize:14, fontWeight:700, color:'#1e1b4b' }}>{r.bike_model} <span style={{ fontSize:10, color:'#a5b4fc', fontFamily:'JetBrains Mono, monospace' }}>REP{r.repair_id}</span></p>
                    <p style={{ fontSize:12, color:'#9ca3af', marginTop:3 }}>₹{r.grand_total?.toFixed(2)} · {r.payment_status || 'Pending'}</p>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:99, background:r.payment_status==='Paid'?'#dcfce7':'#fef3c7', color:r.payment_status==='Paid'?'#16a34a':'#d97706' }}>{r.payment_status || 'Pending'}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const isPaid = repair.payment_status === 'Paid'
  const hasInvoice = !!repair.invoice_id

  return (
    <div style={{ padding:'28px 28px', maxWidth:700 }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <div style={{ width:4, height:24, background:'linear-gradient(180deg,#6366f1,#818cf8)', borderRadius:2 }} />
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1e1b4b' }}>Billing & Invoice</h1>
        </div>
        <p style={{ fontSize:13, color:'#9ca3af', marginLeft:14 }}>Agent 4 — View your invoice and complete payment</p>
      </div>

      {!hasInvoice && (
        <div style={{ ...C.card, padding:'32px', textAlign:'center' }}>
          <p style={{ fontSize:40, marginBottom:12 }}>⏳</p>
          <p style={{ fontSize:16, fontWeight:700, color:'#4338ca', marginBottom:8 }}>Invoice Not Generated Yet</p>
          <p style={{ fontSize:13, color:'#9ca3af' }}>Your invoice will appear here once the mechanic marks the repair as complete.</p>
        </div>
      )}

      {hasInvoice && (
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          {/* Invoice card */}
          <div style={{ ...C.card, padding:'24px' }}>
            <div style={{ background:'linear-gradient(135deg,#6366f1,#4f46e5)', borderRadius:12, padding:'20px 24px', marginBottom:20, textAlign:'center' }}>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.7)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.1em' }}>Invoice</p>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.8)', ...C.mono, marginBottom:8 }}>{repair.invoice_id}</p>
              <p style={{ fontSize:36, fontWeight:800, color:'#fff' }}>₹{repair.grand_total?.toFixed(2)}</p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginTop:4 }}>{repair.bike_model} · {repair.customer_name}</p>
            </div>

            {[['Repair ID', `#${repair.repair_id}`],['Invoice ID', repair.invoice_id],['Amount', `₹${repair.grand_total?.toFixed(2)}`],['Payment Status', repair.payment_status || 'Pending'],['Payment Method', repair.payment_method || '—'],['Paid At', repair.paid_at ? new Date(repair.paid_at).toLocaleString() : '—']].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f5f3ff' }}>
                <span style={{ fontSize:12, color:'#9ca3af' }}>{k}</span>
                <span style={{ fontSize:12, fontWeight:600, color:k==='Payment Status'?(v==='Paid'?'#16a34a':'#d97706'):'#1e1b4b', ...C.mono }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Payment section */}
          {isPaid ? (
            <div style={{ ...C.card, padding:'24px', textAlign:'center' }}>
              <p style={{ fontSize:36, marginBottom:8 }}>✅</p>
              <p style={{ fontSize:16, fontWeight:700, color:'#16a34a', marginBottom:4 }}>Payment Received!</p>
              <p style={{ fontSize:13, color:'#9ca3af' }}>Thank you! Your bike is ready for pickup.</p>
              {repair.payment_method && <p style={{ fontSize:12, color:'#6b7280', marginTop:8 }}>Paid via {repair.payment_method}</p>}
            </div>
          ) : step === 'done' ? (
            <div style={{ ...C.card, padding:'24px', textAlign:'center' }}>
              <p style={{ fontSize:36, marginBottom:8 }}>✅</p>
              <p style={{ fontSize:16, fontWeight:700, color:'#16a34a', marginBottom:4 }}>Payment Submitted!</p>
              <p style={{ fontSize:13, color:'#9ca3af' }}>Your payment has been recorded. The mechanic will be notified.</p>
            </div>
          ) : (
            <div style={{ ...C.card, padding:'24px' }}>
              <p style={{ fontSize:14, fontWeight:700, color:'#1e1b4b', marginBottom:16 }}>Complete Payment</p>

              {step === 'qr' ? (
                <div style={{ textAlign:'center' }}>
                  <p style={{ fontSize:12, color:'#6b7280', marginBottom:14 }}>Scan with any UPI app to pay</p>
                  <div style={{ display:'inline-block', padding:12, background:'#fff', border:'2px solid #e0e7ff', borderRadius:12 }}>
                    <img src={`${UPI_QR_URL}${repair.grand_total?.toFixed(2)}%26tn=Repair%20${repair.repair_id}`} alt="UPI QR" width={200} height={200} style={{ display:'block', borderRadius:6 }} />
                  </div>
                  <p style={{ fontSize:11, color:'#a5b4fc', marginTop:10, ...C.mono }}>mechmate@upi</p>
                  <div style={{ display:'flex', gap:10, marginTop:18 }}>
                    <button onClick={() => setStep('select')} style={{ flex:1, padding:'11px', borderRadius:10, border:'1.5px solid #e0e7ff', background:'#f5f3ff', color:'#6b7280', fontSize:13, fontWeight:600, cursor:'pointer' }}>← Back</button>
                    <button onClick={handlePay} disabled={paying} style={{ flex:2, padding:'11px', borderRadius:10, border:'none', background:paying?'#e0e7ff':'linear-gradient(135deg,#16a34a,#15803d)', color:paying?'#a5b4fc':'#fff', fontSize:13, fontWeight:700, cursor:paying?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      {paying ? <><Spinner /> Processing...</> : '✓ Payment Done'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                    {METHODS.map(m => (
                      <button key={m.id} onClick={() => setMethod(m.id)} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:10, cursor:'pointer', textAlign:'left', background:method===m.id?'#eef2ff':'#faf9ff', border:method===m.id?'2px solid #6366f1':'1.5px solid #e0e7ff', transition:'all 0.15s' }}>
                        <span style={{ fontSize:20, width:28, textAlign:'center' }}>{m.icon}</span>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:13, fontWeight:600, color:method===m.id?'#4338ca':'#1e1b4b' }}>{m.label}</p>
                          <p style={{ fontSize:11, color:'#9ca3af', marginTop:1 }}>{m.desc}</p>
                        </div>
                        <div style={{ width:16, height:16, borderRadius:'50%', border:method===m.id?'5px solid #6366f1':'2px solid #c7d2fe', background:'#fff', flexShrink:0 }} />
                      </button>
                    ))}
                  </div>
                  <button onClick={handlePay} disabled={paying} style={{ width:'100%', padding:'13px', borderRadius:11, border:'none', cursor:paying?'not-allowed':'pointer', background:paying?'#e0e7ff':'linear-gradient(135deg,#6366f1,#4f46e5)', color:paying?'#a5b4fc':'#fff', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    {paying ? <><Spinner /> Processing...</> : method==='UPI' ? '📱 Show QR Code' : method==='Cash' ? `💵 Record Cash Payment` : `✓ Pay ₹${repair.grand_total?.toFixed(2)}`}
                  </button>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
