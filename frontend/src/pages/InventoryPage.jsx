import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getWorkflowHistory, getWorkflowOutputs, getInventoryParts, addStock } from '../api/orchestratorApi'

const MONO = { fontFamily: 'JetBrains Mono, monospace' }
const CARD = { background: '#ffffff', border: '1px solid #ede9fe', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(109,40,217,0.06)' }

const INV_STATUS = {
  READY_FOR_REPAIR:  ['#dcfce7','#16a34a','#bbf7d0'],
  PARTS_RESERVED:    ['#dbeafe','#2563eb','#bfdbfe'],
  MISSING_PARTS:     ['#fee2e2','#dc2626','#fecaca'],
  ALTERNATIVES_USED: ['#fef3c7','#d97706','#fde68a'],
}

function Chip({ text, bg, color, border }) {
  return <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 8, background: bg, color, border: `1px solid ${border}` }}>{text}</span>
}

function InventoryCard({ run }) {
  const [inv, setInv] = useState(undefined)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = () => {
    if (inv !== undefined) { setOpen(o => !o); return }
    setLoading(true)
    getWorkflowOutputs(run.id)
      .then(r => { const a3 = (r.data || []).find(o => o.agent_number === 3); setInv(a3?.output || null); setOpen(true) })
      .catch(console.error).finally(() => setLoading(false))
  }

  const st = inv && (INV_STATUS[inv.status] || ['#f5f3ff','#9ca3af','#ede9fe'])

  return (
    <div style={CARD}>
      <button onClick={load} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        onMouseEnter={e => e.currentTarget.style.background = '#faf9ff'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 11, color: '#a78bfa', ...MONO }}>#{run.repair_id || run.id}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1e1b4b' }}>{run.customer_name}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{run.bike_model}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
            background: run.status === 'completed' ? '#dcfce7' : '#dbeafe',
            color: run.status === 'completed' ? '#16a34a' : '#2563eb',
            border: `1px solid ${run.status === 'completed' ? '#bbf7d0' : '#bfdbfe'}`
          }}>{run.status}</span>
          {loading
            ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #ede9fe', borderTopColor: '#16a34a', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
            : <span style={{ color: '#c4b5fd', fontSize: 12 }}>{open ? '▲' : '▼'}</span>}
        </div>
      </button>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {open && (
        <div style={{ borderTop: '1px solid #f5f3ff', padding: '16px 18px' }}>
          {!inv ? (
            <p style={{ fontSize: 12, color: '#c4b5fd' }}>No inventory data for this workflow.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {st && <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, background: st[0], color: st[1], border: `1px solid ${st[2]}`, alignSelf: 'flex-start' }}>{inv.status?.replace(/_/g, ' ')}</span>}

              {inv.reserved_parts?.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Reserved Parts ({inv.reserved_parts.length})</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 8 }}>
                    {inv.reserved_parts.map((p, i) => (
                      <div key={i} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 10px' }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>{p.part || p.part_name || p}</p>
                        <p style={{ fontSize: 10, color: '#4ade80', marginTop: 2 }}>Qty: {p.quantity} · ₹{p.unit_price}</p>
                        <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>Stock left: {p.remaining_stock}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inv.missing_parts?.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Missing Parts</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {inv.missing_parts.map((p, i) => <Chip key={i} text={typeof p === 'string' ? p : `${p.part_name} (×${p.quantity_short})`} bg="#fee2e2" color="#dc2626" border="#fecaca" />)}
                  </div>
                </div>
              )}

              {inv.low_stock_alerts?.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontSize: 10, color: '#d97706', fontWeight: 700, marginBottom: 6 }}>⚠ Low Stock After This Repair</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {inv.low_stock_alerts.map((a, i) => (
                      <span key={i} style={{ fontSize: 11, color: '#d97706', background: '#fef3c7', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: 6 }}>
                        {a.part_name} ({a.remaining} left)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {inv.llm_reasoning && (
                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, marginBottom: 6 }}>🤖 AI Reasoning</p>
                  <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{inv.llm_reasoning}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AddStockModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ part_name: '', quantity: '', unit_price: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.part_name || !form.quantity) { toast.error('Part name and quantity required'); return }
    setSaving(true)
    try {
      await addStock({ part_name: form.part_name, quantity: parseInt(form.quantity), unit_price: form.unit_price ? parseFloat(form.unit_price) : undefined })
      toast.success(`Stock updated for "${form.part_name}"`)
      onAdded()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add stock')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', background: '#faf9ff', border: '1.5px solid #ede9fe', borderRadius: 9, padding: '9px 12px', fontSize: 13, color: '#1e1b4b', outline: 'none', fontFamily: 'Inter, sans-serif' }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,27,75,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px', width: 380, boxShadow: '0 20px 60px rgba(109,40,217,0.2)', border: '1px solid #ede9fe' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#1e1b4b' }}>Add / Restock Part</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#a78bfa', cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Part Name *</label>
            <input value={form.part_name} onChange={e => setForm(f => ({ ...f, part_name: e.target.value }))} style={inputStyle} placeholder="e.g. Brake Pad" />
          </div>
          <div>
            <label style={labelStyle}>Quantity to Add *</label>
            <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} style={inputStyle} placeholder="e.g. 10" />
          </div>
          <div>
            <label style={labelStyle}>Unit Price (₹)</label>
            <input type="number" min="0" step="0.01" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} style={inputStyle} placeholder="e.g. 150" />
          </div>
          <button type="submit" disabled={saving} style={{ padding: '11px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#ede9fe' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: saving ? '#a78bfa' : '#fff', fontWeight: 700, fontSize: 13, marginTop: 4 }}>
            {saving ? 'Saving...' : '+ Add Stock'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const [runs, setRuns] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [parts, setParts] = useState([])
  const [partsSearch, setPartsSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('stock') // 'stock' | 'repairs'
  const LIMIT = 10

  const fetchParts = () => getInventoryParts().then(r => setParts(r.data || [])).catch(console.error)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getWorkflowHistory(page * LIMIT, LIMIT),
      getInventoryParts(),
    ])
      .then(([r, p]) => { setRuns(r.data.runs || []); setTotal(r.data.total || 0); setParts(p.data || []) })
      .catch(console.error).finally(() => setLoading(false))
  }, [page])

  const lowStockParts = parts.filter(p => p.is_low_stock)
  const filteredParts = parts.filter(p => !partsSearch || p.part_name.toLowerCase().includes(partsSearch.toLowerCase()))

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#16a34a,#7c3aed)', borderRadius: 2 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.5px' }}>Inventory Intelligence</h1>
          </div>
          <p style={{ fontSize: 13, color: '#9ca3af', marginLeft: 14 }}>Agent 3 — Parts stock management and auto-deduction</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontWeight: 700, fontSize: 12, padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
          + Add Stock
        </button>
      </div>

      {lowStockParts.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#d97706', marginBottom: 8 }}>⚠ Low Stock Alert — {lowStockParts.length} item(s) need restocking</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {lowStockParts.map((p, i) => (
              <span key={i} style={{ fontSize: 11, background: '#fef3c7', border: '1px solid #fde68a', color: '#d97706', padding: '3px 10px', borderRadius: 8 }}>
                {p.part_name} ({p.quantity} left)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 18, background: '#f5f3ff', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[['stock', '📦 Parts Stock'], ['repairs', '🔧 Repair History']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
            background: tab === key ? '#fff' : 'transparent',
            color: tab === key ? '#7c3aed' : '#9ca3af',
            boxShadow: tab === key ? '0 1px 4px rgba(109,40,217,0.1)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'stock' && (
        <>
          <input
            type="text" placeholder="Search parts..." value={partsSearch}
            onChange={e => setPartsSearch(e.target.value)}
            style={{ background: '#fff', border: '1.5px solid #ede9fe', borderRadius: 10, padding: '9px 14px', fontSize: 13, color: '#1e1b4b', outline: 'none', width: 280, marginBottom: 14 }}
            onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
            onBlur={e => { e.target.style.borderColor = '#ede9fe'; e.target.style.boxShadow = 'none' }}
          />
          <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(109,40,217,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f5f3ff', background: '#faf9ff' }}>
                  {['Part Name', 'Stock', 'Unit Price', 'Status'].map(h => (
                    <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px 0', color: '#c4b5fd' }}>Loading...</td></tr>}
                {!loading && filteredParts.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px 0', color: '#c4b5fd', fontSize: 13 }}>No parts found.</td></tr>}
                {filteredParts.map((p, i) => (
                  <tr key={p.id}
                    style={{ borderBottom: i < filteredParts.length - 1 ? '1px solid #faf9ff' : 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#faf9ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 600, color: '#1e1b4b' }}>{p.part_name}</td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: p.quantity === 0 ? '#dc2626' : p.is_low_stock ? '#d97706' : '#16a34a', ...MONO }}>
                        {p.quantity}
                      </span>
                      <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>units</span>
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: 12, color: '#6b7280', ...MONO }}>₹{p.unit_price}</td>
                    <td style={{ padding: '12px 18px' }}>
                      {p.quantity === 0
                        ? <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>Out of Stock</span>
                        : p.is_low_stock
                          ? <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>Low Stock</span>
                          : <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>In Stock</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'repairs' && (
        <>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #ede9fe', borderTopColor: '#16a34a', animation: 'spin 0.7s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : runs.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#c4b5fd', padding: '60px 0', fontSize: 13 }}>No workflows yet. <Link to="/workflow" style={{ color: '#7c3aed', fontWeight: 600 }}>Start one</Link>.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {runs.map(run => <InventoryCard key={run.id} run={run} />)}
            </div>
          )}
          {total > LIMIT && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 20 }}>
              {[['← Prev', () => setPage(p => Math.max(0, p - 1)), page === 0], ['Next →', () => setPage(p => p + 1), (page + 1) * LIMIT >= total]].map(([label, fn, disabled]) => (
                <button key={label} onClick={fn} disabled={disabled} style={{ padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? '#f5f3ff' : '#fff', border: '1.5px solid #ede9fe', color: disabled ? '#c4b5fd' : '#7c3aed' }}>{label}</button>
              ))}
              <span style={{ fontSize: 12, color: '#a78bfa' }}>Page {page + 1} of {Math.ceil(total / LIMIT)}</span>
            </div>
          )}
        </>
      )}

      {showModal && <AddStockModal onClose={() => setShowModal(false)} onAdded={fetchParts} />}
    </div>
  )
}
