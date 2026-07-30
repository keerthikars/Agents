import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkflowHistory, getWorkflowOutputs } from '../api/orchestratorApi'

const SEV = {
  Critical: ['#fee2e2','#dc2626','#fecaca'],
  High:     ['#ffedd5','#ea580c','#fed7aa'],
  Medium:   ['#fef3c7','#d97706','#fde68a'],
  Low:      ['#dcfce7','#16a34a','#bbf7d0'],
}
const CARD = { background: '#ffffff', border: '1px solid #ede9fe', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(109,40,217,0.06)' }

function Chip({ text, bg, color, border }) {
  return <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 8, background: bg, color, border: `1px solid ${border}` }}>{text}</span>
}

function DiagnosisCard({ run }) {
  const [diag, setDiag] = useState(undefined)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = () => {
    if (diag !== undefined) { setOpen(o => !o); return }
    setLoading(true)
    getWorkflowOutputs(run.id)
      .then(r => { const a2 = (r.data || []).find(o => o.agent_number === 2); setDiag(a2?.output || null); setOpen(true) })
      .catch(console.error).finally(() => setLoading(false))
  }

  const sev = diag && SEV[diag.severity]

  return (
    <div style={CARD}>
      <button onClick={load} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        onMouseEnter={e => e.currentTarget.style.background = '#faf9ff'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 11, color: '#a78bfa', fontFamily: 'JetBrains Mono, monospace' }}>#{run.repair_id || run.id}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1e1b4b' }}>{run.customer_name}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{run.bike_model}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
            background: run.status === 'completed' ? '#dcfce7' : run.status === 'failed' ? '#fee2e2' : '#dbeafe',
            color: run.status === 'completed' ? '#16a34a' : run.status === 'failed' ? '#dc2626' : '#2563eb',
            border: `1px solid ${run.status === 'completed' ? '#bbf7d0' : run.status === 'failed' ? '#fecaca' : '#bfdbfe'}`
          }}>{run.status}</span>
          {loading
            ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #ede9fe', borderTopColor: '#7c3aed', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
            : <span style={{ color: '#c4b5fd', fontSize: 12 }}>{open ? '▲' : '▼'}</span>}
        </div>
      </button>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {open && (
        <div style={{ borderTop: '1px solid #f5f3ff', padding: '16px 18px' }}>
          {!diag ? (
            <p style={{ fontSize: 12, color: '#c4b5fd' }}>No diagnosis data for this workflow.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[
                  ['Severity', diag.severity, sev],
                  ['Repair Time', diag.repair_time, null],
                  ['Labor', diag.labor_charge ? `₹${diag.labor_charge}` : '—', null],
                  ['Confidence', diag.confidence_score ? `${diag.confidence_score}%` : '—', null],
                ].map(([label, val, accent]) => (
                  <div key={label} style={{ background: '#faf9ff', border: '1px solid #ede9fe', borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
                    {accent
                      ? <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: accent[0], color: accent[1], border: `1px solid ${accent[2]}` }}>{val || '—'}</span>
                      : <p style={{ fontSize: 13, fontWeight: 700, color: '#1e1b4b' }}>{val || '—'}</p>
                    }
                  </div>
                ))}
              </div>

              {diag.faulty_components?.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Faulty Components</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {diag.faulty_components.map((c, i) => <Chip key={i} text={c} bg="#fee2e2" color="#dc2626" border="#fecaca" />)}
                  </div>
                </div>
              )}

              {diag.required_parts?.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Required Parts</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {diag.required_parts.map((p, i) => <Chip key={i} text={typeof p === 'string' ? p : p.part_name || JSON.stringify(p)} bg="#dbeafe" color="#2563eb" border="#bfdbfe" />)}
                  </div>
                </div>
              )}

              {diag.possible_cause && (
                <div>
                  <p style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Root Cause</p>
                  <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{diag.possible_cause}</p>
                </div>
              )}

              {diag.ai_explanation && (
                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, marginBottom: 6 }}>🤖 AI Explanation</p>
                  <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{diag.ai_explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function DiagnosisPage() {
  const [runs, setRuns] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const LIMIT = 10

  useEffect(() => {
    setLoading(true)
    getWorkflowHistory(page * LIMIT, LIMIT)
      .then(r => { setRuns(r.data.runs || []); setTotal(r.data.total || 0) })
      .catch(console.error).finally(() => setLoading(false))
  }, [page])

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#7c3aed,#a78bfa)', borderRadius: 2 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.5px' }}>AI Diagnosis</h1>
        </div>
        <p style={{ fontSize: 13, color: '#9ca3af', marginLeft: 14 }}>Agent 2 — Click any row to expand diagnosis details</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #ede9fe', borderTopColor: '#7c3aed', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : runs.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#c4b5fd', padding: '60px 0', fontSize: 13 }}>No workflows yet. <Link to="/workflow" style={{ color: '#7c3aed', fontWeight: 600 }}>Start one</Link>.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {runs.map(run => <DiagnosisCard key={run.id} run={run} />)}
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
    </div>
  )
}
