import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRepairs } from '../api/orchestratorApi'

const PRIORITY = { High: ['#fee2e2','#dc2626','#fecaca'], Medium: ['#fef3c7','#d97706','#fde68a'], Low: ['#dcfce7','#16a34a','#bbf7d0'] }
const STATUS   = { Completed: ['#dcfce7','#16a34a','#bbf7d0'], 'In Progress': ['#dbeafe','#2563eb','#bfdbfe'], Pending: ['#f5f3ff','#9ca3af','#ede9fe'] }
const MONO = { fontFamily: 'JetBrains Mono, monospace' }

function Badge(style, text) {
  const [bg, color, border] = style || ['#f5f3ff', '#9ca3af', '#ede9fe']
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: bg, color, border: `1px solid ${border}` }}>{text}</span>
}

export default function IntakePage() {
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const LIMIT = 15

  useEffect(() => {
    setLoading(true)
    getRepairs(page * LIMIT, LIMIT)
      .then(r => { setRecords(r.data.records || []); setTotal(r.data.total || 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page])

  const filtered = records.filter(r =>
    !search || r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.bike_model?.toLowerCase().includes(search.toLowerCase()) || String(r.repair_id).includes(search)
  )

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#7c3aed,#a78bfa)', borderRadius: 2 }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.4px' }}>Customer Intake</h1>
          </div>
          <p style={{ fontSize: 13, color: '#9ca3af', marginLeft: 14 }}>Agent 1 — {total} registered repair requests</p>
        </div>
        <Link to="/workflow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontWeight: 700, fontSize: 12, padding: '9px 18px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
          ⚡ New Intake
        </Link>
      </div>

      <input type="text" placeholder="Search by customer, bike, or repair ID..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: 340, background: '#fff', border: '1.5px solid #ede9fe', borderRadius: 10, padding: '9px 14px', fontSize: 13, color: '#1e1b4b', outline: 'none', marginBottom: 18, boxShadow: '0 1px 4px rgba(109,40,217,0.06)' }}
        onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
        onBlur={e => { e.target.style.borderColor = '#ede9fe'; e.target.style.boxShadow = '0 1px 4px rgba(109,40,217,0.06)' }}
      />

      <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(109,40,217,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f5f3ff', background: '#faf9ff' }}>
              {['ID','Customer','Phone','Bike','Brand','Complaint','Priority','Status','Date'].map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: '#c4b5fd', fontSize: 13 }}>Loading...</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: '#c4b5fd', fontSize: 13 }}>
                No records. <Link to="/workflow" style={{ color: '#7c3aed', fontWeight: 600 }}>Start a workflow</Link>.
              </td></tr>
            )}
            {filtered.map((r, i) => (
              <tr key={r.repair_id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #faf9ff' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#faf9ff'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '12px 16px', ...MONO, fontSize: 11, color: '#a78bfa' }}>#{r.repair_id}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#1e1b4b' }}>{r.customer_name}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280', ...MONO }}>{r.customer_phone || '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>{r.bike_model}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af' }}>{r.brand || '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af', maxWidth: 180 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.complaint}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>{r.priority ? Badge(PRIORITY[r.priority] || PRIORITY.Low, r.priority) : <span style={{ color: '#c4b5fd' }}>—</span>}</td>
                <td style={{ padding: '12px 16px' }}>{Badge(STATUS[r.repair_status] || STATUS.Pending, r.repair_status || '—')}</td>
                <td style={{ padding: '12px 16px', fontSize: 11, color: '#c4b5fd', ...MONO }}>{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
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
    </div>
  )
}
