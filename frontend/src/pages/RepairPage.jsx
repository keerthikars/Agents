import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getRepairs, completeRepair } from '../api/orchestratorApi'

const MONO = { fontFamily: 'JetBrains Mono, monospace' }
const CARD = { background: '#ffffff', border: '1px solid #ede9fe', borderRadius: 14, boxShadow: '0 1px 4px rgba(109,40,217,0.06)' }

const STATUS_STYLE = {
  Completed:    { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  'In Progress':{ bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe' },
  Pending:      { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
}
const SEV_STYLE = {
  Critical: { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  High:     { bg: '#ffedd5', color: '#ea580c', border: '#fed7aa' },
  Medium:   { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  Low:      { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
}

function ProgressBar({ status }) {
  const pct = status === 'Completed' ? 100 : status === 'In Progress' ? 55 : 10
  const color = status === 'Completed' ? '#16a34a' : status === 'In Progress' ? '#2563eb' : '#c4b5fd'
  return (
    <div style={{ width: '100%', background: '#f5f3ff', borderRadius: 99, height: 5, marginTop: 10 }}>
      <div style={{ width: `${pct}%`, height: 5, borderRadius: 99, background: color, transition: 'width 0.5s' }} />
    </div>
  )
}

function StatBox({ value, label, bg, color, border }) {
  return (
    <div style={{ ...CARD, border: `1px solid ${border}`, background: bg, padding: '16px 20px' }}>
      <p style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 5, fontWeight: 500 }}>{label}</p>
    </div>
  )
}

export default function RepairPage() {
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(null)
  const LIMIT = 15

  const fetchRecords = () => {
    setLoading(true)
    getRepairs(page * LIMIT, LIMIT)
      .then(r => { setRecords(r.data.records || []); setTotal(r.data.total || 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRecords() }, [page])

  const handleComplete = async (repairId) => {
    setCompleting(repairId)
    try {
      await completeRepair(repairId)
      toast.success(`Repair #${repairId} completed! Invoice generated.`)
      fetchRecords()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to complete repair')
    } finally {
      setCompleting(null)
    }
  }

  const filtered = records.filter(r => {
    const matchSearch = !search ||
      r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.bike_model?.toLowerCase().includes(search.toLowerCase()) ||
      String(r.repair_id).includes(search)
    const matchFilter = filter === 'All' || r.repair_status === filter
    return matchSearch && matchFilter
  })

  const counts = {
    All: records.length,
    Pending: records.filter(r => r.repair_status === 'Pending').length,
    'In Progress': records.filter(r => r.repair_status === 'In Progress').length,
    Completed: records.filter(r => r.repair_status === 'Completed').length,
  }

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#d97706,#7c3aed)', borderRadius: 2 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.5px' }}>Repair Status</h1>
        </div>
        <p style={{ fontSize: 13, color: '#9ca3af', marginLeft: 14 }}>Agent 5 — Mark repairs complete to trigger billing & notifications</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        <StatBox value={counts.All}            label="Total Repairs" bg="#faf9ff" color="#1e1b4b"  border="#ede9fe" />
        <StatBox value={counts.Pending}        label="Pending"       bg="#f5f3ff" color="#7c3aed"  border="#ddd6fe" />
        <StatBox value={counts['In Progress']} label="In Progress"   bg="#eff6ff" color="#2563eb"  border="#bfdbfe" />
        <StatBox value={counts.Completed}      label="Completed"     bg="#f0fdf4" color="#16a34a"  border="#bbf7d0" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Search repairs..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: '#fff', border: '1.5px solid #ede9fe', borderRadius: 10, padding: '9px 14px', fontSize: 13, color: '#1e1b4b', outline: 'none', width: 260 }}
          onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
          onBlur={e => { e.target.style.borderColor = '#ede9fe'; e.target.style.boxShadow = 'none' }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'Pending', 'In Progress', 'Completed'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              background: filter === s ? '#7c3aed' : '#fff',
              color: filter === s ? '#fff' : '#6b7280',
              border: filter === s ? '1.5px solid #7c3aed' : '1.5px solid #ede9fe',
            }}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #ede9fe', borderTopColor: '#7c3aed', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: '#c4b5fd', padding: '60px 0', fontSize: 13 }}>
              No repairs found. <Link to="/workflow" style={{ color: '#7c3aed', fontWeight: 600 }}>Start a workflow</Link>.
            </p>
          )}
          {filtered.map(r => {
            const st = STATUS_STYLE[r.repair_status] || STATUS_STYLE.Pending
            const sv = r.severity ? (SEV_STYLE[r.severity] || SEV_STYLE.Low) : null
            const isInProgress = r.repair_status === 'In Progress'
            const isCompleting = completing === r.repair_id
            return (
              <div key={r.repair_id} style={{ ...CARD, padding: '16px 20px' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(109,40,217,0.06)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ ...MONO, fontSize: 11, color: '#a78bfa' }}>#{r.repair_id}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>{r.customer_name}</span>
                      {sv && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: sv.bg, color: sv.color, border: `1px solid ${sv.border}` }}>
                          {r.severity}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>{r.bike_model}{r.brand ? ` · ${r.brand}` : ''}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.complaint}</p>
                    <ProgressBar status={r.repair_status} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                      {r.repair_status}
                    </span>
                    {isInProgress && (
                      <button
                        onClick={() => handleComplete(r.repair_id)}
                        disabled={isCompleting}
                        style={{
                          padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                          cursor: isCompleting ? 'not-allowed' : 'pointer',
                          background: isCompleting ? '#f5f3ff' : 'linear-gradient(135deg,#16a34a,#15803d)',
                          color: isCompleting ? '#a78bfa' : '#fff',
                          border: 'none',
                          boxShadow: isCompleting ? 'none' : '0 3px 10px rgba(22,163,74,0.3)',
                          display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                        }}
                      >
                        {isCompleting ? (
                          <>
                            <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #ddd6fe', borderTopColor: '#7c3aed', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                            Processing...
                          </>
                        ) : '✓ Mark Complete'}
                      </button>
                    )}
                    {r.repair_status === 'Completed' && r.invoice_id && (
                      <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, ...MONO }}>{r.invoice_id}</span>
                    )}
                    <Link
                      to={`/customer/${r.repair_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, textDecoration: 'none', padding: '4px 10px', borderRadius: 7, background: '#eef2ff', border: '1px solid #c7d2fe' }}
                    >
                      👤 Customer View
                    </Link>
                    <span style={{ fontSize: 11, color: '#c4b5fd', ...MONO }}>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
