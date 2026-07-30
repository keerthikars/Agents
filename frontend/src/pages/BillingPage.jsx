import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getRepairs, recordPayment, deleteRepair } from '../api/orchestratorApi'

const MONO = { fontFamily: 'JetBrains Mono, monospace' }
const CARD = { background: '#ffffff', border: '1px solid #ede9fe', borderRadius: 14, boxShadow: '0 1px 4px rgba(109,40,217,0.06)' }

const PAYMENT_STYLE = {
  Paid:    { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  Pending: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
}

const METHODS = [
  { id: 'Cash',        icon: '💵', label: 'Cash',               desc: 'Collect at counter — status stays Pending' },
  { id: 'UPI',         icon: '📱', label: 'UPI / QR Code',      desc: 'Scan QR — marks Paid instantly' },
  { id: 'Card',        icon: '💳', label: 'Debit / Credit Card', desc: 'Marks Paid instantly' },
  { id: 'Net Banking', icon: '🏦', label: 'Net Banking',         desc: 'Marks Paid instantly' },
]

// Fake UPI QR — a real app would generate a dynamic UPI deep-link QR
const UPI_QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=mechmate@upi%26pn=MechMate%26am=`

function StatBox({ value, label, bg, color, border }) {
  return (
    <div style={{ ...CARD, border: `1px solid ${border}`, background: bg, padding: '16px 20px' }}>
      <p style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 5, fontWeight: 500 }}>{label}</p>
    </div>
  )
}

function PayModal({ record, onClose, onDone }) {
  const [method, setMethod] = useState('Cash')
  const [step, setStep] = useState('select') // select | qr | done
  const [paying, setPaying] = useState(false)

  const isCash = method === 'Cash'
  const isQR   = method === 'UPI'

  const handleConfirm = async () => {
    if (isQR && step === 'select') { setStep('qr'); return }
    setPaying(true)
    try {
      await recordPayment(record.repair_id, method)
      if (isCash) {
        toast('💵 Cash payment recorded — collect at counter.', { icon: '⏳' })
      } else {
        toast.success(`✅ ₹${record.grand_total?.toFixed(2)} paid via ${method}!`)
      }
      onDone()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,27,75,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '28px', width: 440, boxShadow: '0 24px 64px rgba(109,40,217,0.2)', border: '1px solid #ede9fe' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 800, color: '#1e1b4b' }}>
              {step === 'qr' ? '📱 Scan QR to Pay' : 'Collect Payment'}
            </p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{record.invoice_id} · {record.customer_name}</p>
          </div>
          <button onClick={onClose} style={{ background: '#f5f3ff', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 16, color: '#a78bfa', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Amount banner */}
        <div style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Amount Due</p>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>₹{record.grand_total?.toFixed(2)}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{record.bike_model}</p>
        </div>

        {step === 'qr' ? (
          /* QR Code view */
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>Ask customer to scan with any UPI app</p>
            <div style={{ display: 'inline-block', padding: 12, background: '#fff', border: '2px solid #ede9fe', borderRadius: 12 }}>
              <img
                src={`${UPI_QR_URL}${record.grand_total?.toFixed(2)}%26tn=Repair%20${record.repair_id}`}
                alt="UPI QR"
                width={200} height={200}
                style={{ display: 'block', borderRadius: 6 }}
              />
            </div>
            <p style={{ fontSize: 11, color: '#a78bfa', marginTop: 10, ...MONO }}>mechmate@upi</p>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Once customer pays, click confirm below</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setStep('select')} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #ede9fe', background: '#faf9ff', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ← Back
              </button>
              <button onClick={handleConfirm} disabled={paying} style={{
                flex: 2, padding: '11px', borderRadius: 10, border: 'none',
                background: paying ? '#ede9fe' : 'linear-gradient(135deg,#16a34a,#15803d)',
                color: paying ? '#a78bfa' : '#fff', fontSize: 13, fontWeight: 700, cursor: paying ? 'not-allowed' : 'pointer',
                boxShadow: paying ? 'none' : '0 4px 14px rgba(22,163,74,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {paying ? <Spinner /> : '✓ Payment Received'}
              </button>
            </div>
          </div>
        ) : (
          /* Method selection */
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Select Payment Method</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {METHODS.map(m => {
                const sel = method === m.id
                return (
                  <button key={m.id} onClick={() => setMethod(m.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    background: sel ? '#f5f3ff' : '#faf9ff',
                    border: sel ? '2px solid #7c3aed' : '1.5px solid #ede9fe',
                    transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{m.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: sel ? '#7c3aed' : '#1e1b4b' }}>{m.label}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{m.desc}</p>
                    </div>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: sel ? '5px solid #7c3aed' : '2px solid #ddd6fe', background: '#fff', flexShrink: 0 }} />
                  </button>
                )
              })}
            </div>

            {/* Cash info banner */}
            {isCash && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
                💡 Cash payment will be recorded as <b>Pending</b>. Use <b>Mark Paid</b> on the invoice row once cash is collected.
              </div>
            )}

            <button onClick={handleConfirm} disabled={paying} style={{
              width: '100%', padding: '13px', borderRadius: 11, border: 'none',
              cursor: paying ? 'not-allowed' : 'pointer',
              background: paying ? '#ede9fe' : isCash
                ? 'linear-gradient(135deg,#d97706,#b45309)'
                : 'linear-gradient(135deg,#16a34a,#15803d)',
              color: paying ? '#a78bfa' : '#fff',
              fontWeight: 700, fontSize: 14,
              boxShadow: paying ? 'none' : '0 4px 16px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}>
              {paying ? <><Spinner /> Processing...</> : isCash
                ? `💵 Record Cash — Collect ₹${record.grand_total?.toFixed(2)}`
                : isQR
                  ? `📱 Show QR Code`
                  : `✓ Confirm Payment · ₹${record.grand_total?.toFixed(2)}`
              }
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <>
      <span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid #ddd6fe', borderTopColor: '#7c3aed', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}

function ConfirmDelete({ onConfirm, onCancel, label }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,27,75,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', width: 340, boxShadow: '0 16px 48px rgba(0,0,0,0.15)', border: '1px solid #fecaca' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1e1b4b', marginBottom: 8 }}>Delete Record?</p>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>This will permanently delete <b>{label}</b>. This cannot be undone.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid #ede9fe', background: '#faf9ff', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  const [records, setRecords]     = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(0)
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [payRecord, setPayRecord] = useState(null)
  const [delRecord, setDelRecord] = useState(null)
  const [deleting, setDeleting]   = useState(false)
  const LIMIT = 15

  const fetchRecords = () => {
    setLoading(true)
    getRepairs(page * LIMIT, LIMIT)
      .then(r => {
        const billed = (r.data.records || []).filter(rec => rec.invoice_id)
        setRecords(billed)
        setTotal(r.data.total || 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRecords() }, [page])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteRepair(delRecord.repair_id)
      toast.success(`Deleted repair #${delRecord.repair_id}`)
      setDelRecord(null)
      fetchRecords()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  // Mark cash as paid (called from table row button)
  const handleMarkCashPaid = async (r) => {
    try {
      await recordPayment(r.repair_id, 'Cash_Collected')
      toast.success(`Cash collected for ${r.invoice_id}`)
      fetchRecords()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  const filtered = records.filter(r =>
    !search ||
    r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.invoice_id?.toLowerCase().includes(search.toLowerCase()) ||
    String(r.repair_id).includes(search)
  )

  const totalRevenue = filtered.reduce((sum, r) => sum + (r.grand_total || 0), 0)
  const paidCount    = filtered.filter(r => r.payment_status === 'Paid').length
  const pendingCount = filtered.filter(r => r.payment_status !== 'Paid').length

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#7c3aed,#2563eb)', borderRadius: 2 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.5px' }}>Smart Billing</h1>
        </div>
        <p style={{ fontSize: 13, color: '#9ca3af', marginLeft: 14 }}>Agent 4 — Invoices, payments, and revenue tracking</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        <StatBox value={`₹${totalRevenue.toFixed(0)}`} label="Total Revenue"      bg="#f5f3ff" color="#7c3aed" border="#ddd6fe" />
        <StatBox value={filtered.length}               label="Invoices Generated" bg="#eff6ff" color="#2563eb" border="#bfdbfe" />
        <StatBox value={paidCount}                     label="Paid"               bg="#f0fdf4" color="#16a34a" border="#bbf7d0" />
        <StatBox value={pendingCount}                  label="Pending Payment"    bg="#fffbeb" color="#d97706" border="#fde68a" />
      </div>

      <input
        type="text" placeholder="Search by customer, invoice ID, or repair ID..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ background: '#fff', border: '1.5px solid #ede9fe', borderRadius: 10, padding: '9px 14px', fontSize: 13, color: '#1e1b4b', outline: 'none', width: 380, marginBottom: 18 }}
        onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
        onBlur={e => { e.target.style.borderColor = '#ede9fe'; e.target.style.boxShadow = 'none' }}
      />

      <div style={{ ...CARD, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f5f3ff', background: '#faf9ff' }}>
              {['Invoice ID', 'Repair ID', 'Customer', 'Bike', 'Grand Total', 'Method', 'Payment', 'Date', 'Actions'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #ede9fe', borderTopColor: '#7c3aed', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: '#c4b5fd', fontSize: 13 }}>
                No invoices yet. <Link to="/workflow" style={{ color: '#7c3aed', fontWeight: 600 }}>Complete a workflow</Link> to generate one.
              </td></tr>
            )}
            {filtered.map((r, i) => {
              const ps = PAYMENT_STYLE[r.payment_status] || PAYMENT_STYLE.Pending
              const isPaid    = r.payment_status === 'Paid'
              const isCashPending = r.payment_method === 'Cash' && !isPaid
              const methodIcon = METHODS.find(m => m.id === r.payment_method)?.icon
              return (
                <tr key={r.repair_id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid #faf9ff' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#faf9ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 14px', ...MONO, fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>{r.invoice_id}</td>
                  <td style={{ padding: '12px 14px', ...MONO, fontSize: 12, color: '#a78bfa' }}>#{r.repair_id}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#1e1b4b' }}>{r.customer_name}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280' }}>{r.bike_model}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: '#1e1b4b' }}>
                    {r.grand_total != null ? `₹${r.grand_total.toFixed(2)}` : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280' }}>
                    {r.payment_method
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span>{methodIcon || '💰'}</span>
                          <span>{r.payment_method === 'Cash_Collected' ? 'Cash' : r.payment_method}</span>
                        </span>
                      : <span style={{ color: '#c4b5fd' }}>—</span>
                    }
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: ps.bg, color: ps.color, border: `1px solid ${ps.border}` }}>
                      {r.payment_status || 'Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 11, color: '#c4b5fd', ...MONO }}>
                    {r.completed_at ? new Date(r.completed_at).toLocaleDateString() : new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {/* Pay button — only if no payment method chosen yet */}
                      {!r.payment_method && (
                        <button onClick={() => setPayRecord(r)} style={{
                          padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                          background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff',
                          border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}>
                          💳 Pay
                        </button>
                      )}
                      {/* Mark Paid — only for cash pending */}
                      {isCashPending && (
                        <button onClick={() => handleMarkCashPaid(r)} style={{
                          padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                          background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff',
                          border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}>
                          ✓ Mark Paid
                        </button>
                      )}
                      {/* Delete */}
                      <button onClick={() => setDelRecord(r)} style={{
                        padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                        background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer',
                      }}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {total > LIMIT && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 20 }}>
          {[['← Prev', () => setPage(p => Math.max(0, p - 1)), page === 0],
            ['Next →', () => setPage(p => p + 1), (page + 1) * LIMIT >= total]
          ].map(([label, fn, disabled]) => (
            <button key={label} onClick={fn} disabled={disabled} style={{ padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? '#f5f3ff' : '#fff', border: '1.5px solid #ede9fe', color: disabled ? '#c4b5fd' : '#7c3aed' }}>{label}</button>
          ))}
          <span style={{ fontSize: 12, color: '#a78bfa' }}>Page {page + 1} of {Math.ceil(total / LIMIT)}</span>
        </div>
      )}

      {payRecord && (
        <PayModal record={payRecord} onClose={() => setPayRecord(null)} onDone={fetchRecords} />
      )}
      {delRecord && (
        <ConfirmDelete
          label={`Invoice ${delRecord.invoice_id}`}
          onCancel={() => setDelRecord(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
