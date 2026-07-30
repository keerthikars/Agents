import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkflowHistory, deleteWorkflow } from '../api/orchestratorApi'
import toast from 'react-hot-toast'

const STATUS = {
  completed:          { bg: '#dcfce7', color: '#16a34a' },
  running:            { bg: '#dbeafe', color: '#2563eb' },
  failed:             { bg: '#fee2e2', color: '#dc2626' },
  repair_in_progress: { bg: '#fef3c7', color: '#d97706' },
}
const STAGE_LABEL = {
  intake:'Intake', diagnosis:'Diagnosis', inventory:'Inventory',
  repair:'Repair', billing:'Billing', notification:'Notification',
  completed:'Completed', failed:'Failed',
}
const MONO = { fontFamily: 'JetBrains Mono, monospace' }

function ConfirmDelete({ label, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,27,75,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', width: 340, boxShadow: '0 16px 48px rgba(0,0,0,0.15)', border: '1px solid #fecaca' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1e1b4b', marginBottom: 8 }}>Delete Workflow?</p>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Permanently delete <b>{label}</b> and all its logs. Cannot be undone.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid #ede9fe', background: '#faf9ff', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function WorkflowHistory() {
  const [runs, setRuns]       = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [delRun, setDelRun]   = useState(null)
  const LIMIT = 15

  const fetchRuns = () => {
    setLoading(true)
    getWorkflowHistory(page * LIMIT, LIMIT)
      .then(r => { setRuns(r.data.runs || []); setTotal(r.data.total || 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRuns() }, [page])

  const handleDelete = async () => {
    try {
      await deleteWorkflow(delRun.id)
      toast.success(`Deleted workflow #${delRun.id}`)
      setDelRun(null)
      fetchRuns()
    } catch {
      toast.error('Delete failed')
    }
  }

  const filtered = runs.filter(r =>
    !search ||
    r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.bike_model?.toLowerCase().includes(search.toLowerCase()) ||
    String(r.repair_id).includes(search)
  )

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#7c3aed,#a78bfa)', borderRadius: 2 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b' }}>Workflow History</h1>
          </div>
          <p style={{ fontSize: 13, color: '#9ca3af', marginLeft: 14 }}>{total} total workflow runs</p>
        </div>
        <Link to="/workflow" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff',
          fontWeight: 700, fontSize: 12, padding: '9px 18px', borderRadius: 10,
          textDecoration: 'none', boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
        }}>⚡ New Workflow</Link>
      </div>

      <input
        type="text" placeholder="Search by customer, bike, or repair ID..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{
          width: 340, background: '#fff', border: '1.5px solid #ede9fe',
          borderRadius: 10, padding: '9px 14px', fontSize: 13, color: '#1e1b4b',
          outline: 'none', marginBottom: 18, boxShadow: '0 1px 4px rgba(109,40,217,0.06)',
        }}
        onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
        onBlur={e => { e.target.style.borderColor = '#ede9fe'; e.target.style.boxShadow = '0 1px 4px rgba(109,40,217,0.06)' }}
      />

      <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(109,40,217,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f5f3ff', background: '#faf9ff' }}>
              {['Workflow', 'Repair ID', 'Customer', 'Bike', 'Stage', 'Status', 'Started', '', ''].map((h, i) => (
                <th key={i} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: '#c4b5fd', fontSize: 13 }}>Loading...</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: '#c4b5fd', fontSize: 13 }}>No workflows found.</td></tr>
            )}
            {filtered.map((run, i) => {
              const st = STATUS[run.status] || STATUS.running
              return (
                <tr key={run.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #faf9ff' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#faf9ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '13px 18px', ...MONO, fontSize: 12, color: '#a78bfa' }}>#{run.id}</td>
                  <td style={{ padding: '13px 18px', ...MONO, fontSize: 12, color: '#c4b5fd' }}>{run.repair_id ? `#${run.repair_id}` : '—'}</td>
                  <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 600, color: '#1e1b4b' }}>{run.customer_name}</td>
                  <td style={{ padding: '13px 18px', fontSize: 12, color: '#6b7280' }}>{run.bike_model}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: '#f5f3ff', color: '#7c3aed' }}>
                      {STAGE_LABEL[run.current_stage] || run.current_stage}
                    </span>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: st.bg, color: st.color, textTransform: 'capitalize' }}>
                      {run.status}
                    </span>
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 11, color: '#c4b5fd', ...MONO }}>{new Date(run.started_at).toLocaleString()}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <Link to={`/history/${run.id}`} style={{ fontSize: 12, color: '#7c3aed', textDecoration: 'none', fontWeight: 700 }}>View →</Link>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <button onClick={() => setDelRun(run)} style={{ padding: '4px 9px', borderRadius: 6, fontSize: 11, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer', fontWeight: 700 }}>🗑</button>
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
            <button key={label} onClick={fn} disabled={disabled} style={{
              padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
              background: disabled ? '#f5f3ff' : '#fff', border: '1.5px solid #ede9fe', color: disabled ? '#c4b5fd' : '#7c3aed',
            }}>{label}</button>
          ))}
          <span style={{ fontSize: 12, color: '#a78bfa' }}>Page {page + 1} of {Math.ceil(total / LIMIT)}</span>
        </div>
      )}

      {delRun && (
        <ConfirmDelete
          label={`Workflow #${delRun.id} (${delRun.customer_name})`}
          onCancel={() => setDelRun(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
