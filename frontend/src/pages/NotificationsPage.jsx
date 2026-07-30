import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNotifications } from '../api/orchestratorApi'

const MONO = { fontFamily: 'JetBrains Mono, monospace' }
const CARD = { background: '#ffffff', border: '1px solid #ede9fe', borderRadius: 14, boxShadow: '0 1px 4px rgba(109,40,217,0.06)' }

const TYPE_CONFIG = {
  diagnosis_complete: { icon: '🔬', label: 'Diagnosis Complete', bg: '#eff6ff',  color: '#2563eb', border: '#bfdbfe' },
  repair_started:     { icon: '🔧', label: 'Repair Started',     bg: '#fffbeb',  color: '#d97706', border: '#fde68a' },
  repair_completed:   { icon: '✅', label: 'Repair Completed',   bg: '#f0fdf4',  color: '#16a34a', border: '#bbf7d0' },
  invoice_ready:      { icon: '🧾', label: 'Invoice Ready',      bg: '#f5f3ff',  color: '#7c3aed', border: '#ddd6fe' },
  pickup_ready:       { icon: '🏍️', label: 'Ready for Pickup',  bg: '#f0fdfa',  color: '#0d9488', border: '#99f6e4' },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const LIMIT = 20

  useEffect(() => {
    setLoading(true)
    getNotifications()
      .then(r => { setNotifications(r.data.notifications || []); setTotal(r.data.total || 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page])

  const filtered = notifications.filter(n => {
    const matchSearch = !search ||
      n.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      n.message?.toLowerCase().includes(search.toLowerCase()) ||
      String(n.repair_id).includes(search)
    const matchType = typeFilter === 'All' || n.notification_type === typeFilter
    return matchSearch && matchType
  })

  const typeCounts = notifications.reduce((acc, n) => {
    acc[n.notification_type] = (acc[n.notification_type] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ padding: '32px 36px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#0d9488,#7c3aed)', borderRadius: 2 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.5px' }}>Customer Notifications</h1>
        </div>
        <p style={{ fontSize: 13, color: '#9ca3af', marginLeft: 14 }}>Agent 6 — All customer communication logs · {total} total</p>
      </div>

      {/* Type summary chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            <span style={{ fontSize: 14 }}>{cfg.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: cfg.color, background: '#fff', borderRadius: 99, padding: '1px 7px', border: `1px solid ${cfg.border}` }}>{typeCounts[type] || 0}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <input
          type="text" placeholder="Search by customer, message, or repair ID..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: '#fff', border: '1.5px solid #ede9fe', borderRadius: 10, padding: '9px 14px', fontSize: 13, color: '#1e1b4b', outline: 'none', width: 320 }}
          onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
          onBlur={e => { e.target.style.borderColor = '#ede9fe'; e.target.style.boxShadow = 'none' }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['All', ...Object.keys(TYPE_CONFIG)].map(type => {
            const active = typeFilter === type
            const cfg = TYPE_CONFIG[type]
            return (
              <button key={type} onClick={() => setTypeFilter(type)} style={{
                padding: '7px 12px', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                background: active ? '#7c3aed' : '#fff',
                color: active ? '#fff' : '#6b7280',
                border: active ? '1.5px solid #7c3aed' : '1.5px solid #ede9fe',
              }}>
                {cfg ? `${cfg.icon} ${cfg.label}` : 'All'}
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #ede9fe', borderTopColor: '#7c3aed', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#c4b5fd', padding: '60px 0', fontSize: 13 }}>
          No notifications yet. <Link to="/workflow" style={{ color: '#7c3aed', fontWeight: 600 }}>Complete a workflow</Link> to generate them.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(n => {
            const cfg = TYPE_CONFIG[n.notification_type] || { icon: '📢', label: n.notification_type, bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' }
            return (
              <div key={n.id} style={{ ...CARD, padding: '16px 20px' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(109,40,217,0.06)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
                    {/* Icon badge */}
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e1b4b' }}>{n.customer_name}</span>
                        <span style={{ ...MONO, fontSize: 11, color: '#a78bfa' }}>#{n.repair_id}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{n.message}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: n.status === 'Sent' ? '#dcfce7' : '#f5f3ff', color: n.status === 'Sent' ? '#16a34a' : '#9ca3af', border: `1px solid ${n.status === 'Sent' ? '#bbf7d0' : '#ede9fe'}` }}>
                      {n.status}
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{n.channel}</span>
                    <span style={{ fontSize: 11, color: '#c4b5fd', ...MONO }}>{new Date(n.sent_at).toLocaleString()}</span>
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
