import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getInventoryParts, addStock, updatePart, deletePart, adjustQuantity } from '../../api/orchestratorApi'

const MONO = { fontFamily: 'JetBrains Mono, monospace' }
const CARD = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
const INP  = { width: '100%', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '9px 12px', fontSize: 13, color: '#0f172a', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }
const LBL  = { display: 'block', fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }

function AddStockModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ part_name: '', quantity: '', unit_price: '', low_stock_threshold: '3' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.part_name || !form.quantity) { toast.error('Part name and quantity required'); return }
    setSaving(true)
    try {
      await addStock({
        part_name: form.part_name,
        quantity: parseInt(form.quantity),
        unit_price: form.unit_price ? parseFloat(form.unit_price) : undefined,
      })
      toast.success(`Stock updated for "${form.part_name}"`)
      onAdded(); onClose()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to add stock') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 400, border: '1px solid #e2e8f0', boxShadow: '0 16px 48px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Add / Restock Part</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#94a3b8', cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={LBL}>Part Name *</label><input value={form.part_name} onChange={e => setForm(f => ({ ...f, part_name: e.target.value }))} style={INP} placeholder="e.g. Brake Pad" /></div>
          <div><label style={LBL}>Quantity *</label><input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} style={INP} placeholder="e.g. 10" /></div>
          <div><label style={LBL}>Unit Price (₹)</label><input type="number" min="0" step="0.01" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} style={INP} placeholder="e.g. 150" /></div>
          <button type="submit" disabled={saving} style={{ padding: '11px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#e2e8f0' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: saving ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 13, marginTop: 4 }}>
            {saving ? 'Saving...' : '+ Add / Restock'}
          </button>
        </form>
      </div>
    </div>
  )
}

function EditPartModal({ part, onClose, onSaved }) {
  const [form, setForm] = useState({
    part_name: part.part_name,
    quantity: String(part.quantity),
    unit_price: String(part.unit_price),
    low_stock_threshold: String(part.low_stock_threshold),
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updatePart(part.id, {
        part_name: form.part_name,
        quantity: parseInt(form.quantity),
        unit_price: parseFloat(form.unit_price),
        low_stock_threshold: parseInt(form.low_stock_threshold),
      })
      toast.success(`"${form.part_name}" updated`)
      onSaved(); onClose()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to update') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 400, border: '1px solid #e2e8f0', boxShadow: '0 16px 48px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Edit Part</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#94a3b8', cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={LBL}>Part Name</label><input value={form.part_name} onChange={e => setForm(f => ({ ...f, part_name: e.target.value }))} style={INP} /></div>
          <div><label style={LBL}>Quantity</label><input type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} style={INP} /></div>
          <div><label style={LBL}>Unit Price (₹)</label><input type="number" min="0" step="0.01" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} style={INP} /></div>
          <div><label style={LBL}>Min Stock Threshold</label><input type="number" min="0" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} style={INP} /></div>
          <button type="submit" disabled={saving} style={{ padding: '11px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#e2e8f0' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: saving ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 13, marginTop: 4 }}>
            {saving ? 'Saving...' : '✓ Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function MInventory() {
  const [parts, setParts]         = useState([])
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('All')
  const [showAdd, setShowAdd]     = useState(false)
  const [editPart, setEditPart]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [adjusting, setAdjusting] = useState({})

  const fetchParts = useCallback(() => {
    setLoading(true)
    getInventoryParts()
      .then(r => setParts(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchParts() }, [fetchParts])

  const handleDelete = async (part) => {
    if (!window.confirm(`Delete "${part.part_name}"?`)) return
    try {
      await deletePart(part.id)
      toast.success(`"${part.part_name}" deleted`)
      fetchParts()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete') }
  }

  const handleAdjust = async (part, delta) => {
    setAdjusting(a => ({ ...a, [part.id]: true }))
    try {
      await adjustQuantity(part.id, delta)
      fetchParts()
    } catch (err) { toast.error('Failed to adjust quantity') }
    finally { setAdjusting(a => ({ ...a, [part.id]: false })) }
  }

  const lowStock   = parts.filter(p => p.quantity > 0 && p.is_low_stock)
  const outOfStock = parts.filter(p => p.quantity === 0)
  const inStock    = parts.filter(p => p.quantity > 0 && !p.is_low_stock)

  const filtered = parts.filter(p => {
    const matchSearch = !search || p.part_name.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'All' ? true :
      filter === 'In Stock' ? (p.quantity > 0 && !p.is_low_stock) :
      filter === 'Low Stock' ? (p.quantity > 0 && p.is_low_stock) :
      filter === 'Out of Stock' ? p.quantity === 0 : true
    return matchSearch && matchFilter
  })

  return (
    <div style={{ padding: '32px 36px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#16a34a,#3b82f6)', borderRadius: 2 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Inventory Management</h1>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', marginLeft: 14 }}>Agent 3 — Parts stock management. Auto-checked after AI Diagnosis.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff', fontWeight: 700, fontSize: 12, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(59,130,246,0.2)' }}
        >
          + Add Stock
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          ['Total Parts', parts.length, '#0f172a', '#f8fafc', '#e2e8f0'],
          ['In Stock', inStock.length, '#16a34a', '#f0fdf4', '#bbf7d0'],
          ['Low Stock', lowStock.length, '#d97706', '#fffbeb', '#fde68a'],
          ['Out of Stock', outOfStock.length, '#dc2626', '#fff5f5', '#fecaca'],
        ].map(([label, val, color, bg, border]) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 20px', cursor: 'pointer' }}
            onClick={() => setFilter(label === 'Total Parts' ? 'All' : label)}>
            <p style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{val}</p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 5, fontWeight: 500 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {outOfStock.length > 0 && (
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>🚫 Out of Stock — {outOfStock.length} item(s) need purchasing</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {outOfStock.map((p, i) => (
                  <span key={i} style={{ fontSize: 11, background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '3px 10px', borderRadius: 8 }}>{p.part_name}</span>
                ))}
              </div>
            </div>
          )}
          {lowStock.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#d97706', marginBottom: 6 }}>⚠ Low Stock — {lowStock.length} item(s) need restocking</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {lowStock.map((p, i) => (
                  <span key={i} style={{ fontSize: 11, background: '#fef3c7', border: '1px solid #fde68a', color: '#d97706', padding: '3px 10px', borderRadius: 8 }}>{p.part_name} ({p.quantity} left)</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search + filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Search parts..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 14px', fontSize: 13, color: '#0f172a', outline: 'none', width: 260 }}
          onFocus={e => e.target.style.borderColor = '#3b82f6'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filter === f ? '#3b82f6' : '#fff', color: filter === f ? '#fff' : '#64748b', border: filter === f ? '1.5px solid #3b82f6' : '1.5px solid #e2e8f0' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Parts table */}
      <div style={{ ...CARD }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              {['Part Name', 'Available', 'Reserved', 'Min Stock', 'Unit Price', 'Total Value', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>Loading...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>No parts found.</td></tr>
            )}
            {filtered.map((p, i) => {
              const isOut  = p.quantity === 0
              const isLow  = !isOut && p.is_low_stock
              const statusLabel = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'
              const statusStyle = isOut
                ? { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' }
                : isLow
                  ? { bg: '#fef3c7', color: '#d97706', border: '#fde68a' }
                  : { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' }
              const totalValue = (p.quantity * p.unit_price).toFixed(2)
              const isAdj = adjusting[p.id]

              return (
                <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{p.part_name}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => handleAdjust(p, -1)} disabled={isAdj || p.quantity === 0}
                        style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: p.quantity === 0 ? 'not-allowed' : 'pointer', fontSize: 14, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>−</button>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isOut ? '#dc2626' : isLow ? '#d97706' : '#16a34a', ...MONO, minWidth: 28, textAlign: 'center' }}>{p.quantity}</span>
                      <button onClick={() => handleAdjust(p, 1)} disabled={isAdj}
                        style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 14, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</button>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', ...MONO }}>{p.reserved_quantity || 0}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', ...MONO }}>{p.low_stock_threshold}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', ...MONO }}>₹{p.unit_price}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#0f172a', fontWeight: 600, ...MONO }}>₹{totalValue}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`, whiteSpace: 'nowrap' }}>
                      {statusLabel}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setEditPart(p)}
                        style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                        ✏ Edit
                      </button>
                      <button onClick={() => handleDelete(p)}
                        style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#fff5f5', color: '#dc2626', border: '1px solid #fecaca' }}>
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

      {showAdd && <AddStockModal onClose={() => setShowAdd(false)} onAdded={fetchParts} />}
      {editPart && <EditPartModal part={editPart} onClose={() => setEditPart(null)} onSaved={fetchParts} />}
    </div>
  )
}
