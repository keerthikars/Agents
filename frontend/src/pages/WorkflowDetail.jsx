import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getWorkflow, getWorkflowOutputs } from '../api/orchestratorApi'
import WorkflowTimeline from '../components/WorkflowTimeline'

const STATUS = {
  completed: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  running:   { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe' },
  failed:    { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
}
const LOG_COLOR = { completed: '#16a34a', failed: '#dc2626', started: '#7c3aed' }
const CARD = { background: '#fff', border: '1px solid #ede9fe', borderRadius: 14, boxShadow: '0 1px 4px rgba(109,40,217,0.06)' }
const MONO = { fontFamily: 'JetBrains Mono, monospace' }

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid #faf9ff' }}>
      <span style={{ fontSize: 11, color: '#9ca3af' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#1e1b4b', ...MONO, textAlign: 'right', maxWidth: 160, fontWeight: 500 }}>{value}</span>
    </div>
  )
}

export default function WorkflowDetail() {
  const { id } = useParams()
  const [workflow, setWorkflow] = useState(null)
  const [outputs, setOutputs] = useState([])
  const [activeAgent, setActiveAgent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getWorkflow(id), getWorkflowOutputs(id)])
      .then(([w, o]) => {
        setWorkflow(w.data); setOutputs(o.data || [])
        if (o.data?.length > 0) setActiveAgent(o.data[0].agent_name)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #ede9fe', borderTopColor: '#7c3aed', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (!workflow) return <div style={{ padding: 32, color: '#a78bfa' }}>Workflow not found.</div>

  const st = STATUS[workflow.status] || STATUS.running
  const activeOutput = outputs.find(o => o.agent_name === activeAgent)

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Link to="/mechanic/history" style={{ fontSize: 12, color: '#a78bfa', textDecoration: 'none', fontWeight: 500 }}>← History</Link>
        <span style={{ color: '#ddd6fe' }}>/</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#1e1b4b' }}>Workflow #{workflow.id}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: st.bg, color: st.color, border: `1px solid ${st.border}`, textTransform: 'capitalize' }}>
          {workflow.status}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 18 }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...CARD, padding: '18px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Repair Info</p>
            <InfoRow label="Repair ID"  value={`#${workflow.repair_id}`} />
            <InfoRow label="Customer"   value={workflow.customer_name} />
            <InfoRow label="Bike"       value={workflow.bike_model} />
            <InfoRow label="Started"    value={new Date(workflow.started_at).toLocaleString()} />
            {workflow.completed_at && <InfoRow label="Completed" value={new Date(workflow.completed_at).toLocaleString()} />}
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 10, color: '#a78bfa', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Complaint</p>
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{workflow.complaint}</p>
            </div>
            {workflow.error_message && !workflow.error_message.startsWith('{') && (
              <div style={{ marginTop: 10, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 9, padding: '10px 12px' }}>
                <p style={{ fontSize: 10, color: '#dc2626', fontWeight: 700, marginBottom: 4 }}>Error</p>
                <p style={{ fontSize: 11, color: '#ef4444' }}>{workflow.error_message}</p>
              </div>
            )}
          </div>

          <div style={{ ...CARD, padding: '18px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Agent Pipeline</p>
            <WorkflowTimeline currentStage={workflow.current_stage} status={workflow.status} />
          </div>

          <div style={{ ...CARD, padding: '18px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Execution Logs</p>
            <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(workflow.logs || []).length === 0 && <p style={{ fontSize: 12, color: '#c4b5fd' }}>No logs.</p>}
              {(workflow.logs || []).map(log => (
                <div key={log.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, color: '#c4b5fd', flexShrink: 0, ...MONO, marginTop: 1 }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <div style={{ width: 2, alignSelf: 'stretch', background: `${LOG_COLOR[log.status] || '#c4b5fd'}55`, borderRadius: 1, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: LOG_COLOR[log.status] || '#7c3aed' }}>{log.agent_name}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{log.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Agent outputs */}
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #f5f3ff', overflowX: 'auto', flexShrink: 0, background: '#faf9ff' }}>
            {outputs.map(o => {
              const active = activeAgent === o.agent_name
              return (
                <button key={o.agent_name} onClick={() => setActiveAgent(o.agent_name)} style={{
                  padding: '12px 16px', fontSize: 11, fontWeight: active ? 700 : 400, whiteSpace: 'nowrap',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: active ? '2.5px solid #7c3aed' : '2.5px solid transparent',
                  color: active ? '#7c3aed' : '#9ca3af',
                  transition: 'color 0.15s',
                }}>
                  Agent {o.agent_number} · {o.agent_name.replace(' Agent', '')}
                </button>
              )
            })}
          </div>
          <div style={{ flex: 1, padding: '18px', overflow: 'auto' }}>
            {activeOutput ? (
              <pre style={{
                fontSize: 12, color: '#1e1b4b', background: '#faf9ff',
                border: '1px solid #ede9fe', borderRadius: 10,
                padding: '16px', overflow: 'auto', maxHeight: 520,
                whiteSpace: 'pre-wrap', lineHeight: 1.7, ...MONO,
              }}>
                {JSON.stringify(activeOutput.output, null, 2)}
              </pre>
            ) : (
              <p style={{ color: '#c4b5fd', fontSize: 13, textAlign: 'center', paddingTop: 60 }}>Select an agent tab to view its output.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
