const STAGES = ['intake', 'diagnosis', 'inventory', 'repair', 'billing', 'notification']
const META = {
  intake:       { label: 'Customer Intake',  icon: '◉', agent: 'Agent 1', color: '#7c3aed', bg: '#ede9fe' },
  diagnosis:    { label: 'AI Diagnosis',      icon: '◎', agent: 'Agent 2', color: '#6d28d9', bg: '#ede9fe' },
  inventory:    { label: 'Inventory Check',   icon: '◫', agent: 'Agent 3', color: '#8b5cf6', bg: '#f5f3ff' },
  repair:       { label: 'Repair Status',     icon: '◌', agent: 'Agent 5', color: '#d97706', bg: '#fef3c7' },
  billing:      { label: 'Smart Billing',     icon: '◈', agent: 'Agent 4', color: '#2563eb', bg: '#dbeafe' },
  notification: { label: 'Notifications',     icon: '◉', agent: 'Agent 6', color: '#0d9488', bg: '#ccfbf1' },
}

export default function WorkflowTimeline({ currentStage, status }) {
  const currentIdx = STAGES.indexOf(currentStage)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {STAGES.map((stage, idx) => {
        const m = META[stage]
        const done    = idx < currentIdx || status === 'completed'
        const active  = stage === currentStage && (status === 'running')
        const paused  = stage === currentStage && status === 'repair_in_progress'
        const failed  = status === 'failed' && stage === currentStage

        const dotBg    = failed ? '#fee2e2' : done ? '#dcfce7' : paused ? '#fef3c7' : active ? m.bg : '#f5f3ff'
        const dotColor = failed ? '#dc2626' : done ? '#16a34a' : paused ? '#d97706' : active ? m.color : '#c4b5fd'
        const dotBorder= failed ? '#fca5a5' : done ? '#86efac' : paused ? '#fde68a' : active ? m.color : '#ddd6fe'
        const labelColor = failed ? '#dc2626' : done ? '#16a34a' : paused ? '#d97706' : active ? '#1e1b4b' : '#9ca3af'
        const badgeBg  = failed ? '#fee2e2' : done ? '#dcfce7' : paused ? '#fef3c7' : active ? m.bg : '#f5f3ff'
        const badgeColor = failed ? '#dc2626' : done ? '#16a34a' : paused ? '#d97706' : active ? m.color : '#c4b5fd'
        const badgeBorder = failed ? '#fca5a5' : done ? '#86efac' : paused ? '#fde68a' : active ? `${m.color}55` : '#ede9fe'
        const badgeText = failed ? 'Failed' : done ? 'Done' : paused ? 'In Progress' : active ? 'Running' : 'Waiting'

        return (
          <div key={stage} style={{ display: 'flex', gap: 12, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: dotBg, border: `2px solid ${dotBorder}`,
                fontSize: 11, color: dotColor, fontWeight: 700,
                boxShadow: active ? `0 0 0 4px ${m.color}22` : 'none',
                transition: 'all 0.3s',
              }}>
                {failed ? '✕' : done ? '✓' : paused ? '⏸' : active ? '▶' : idx + 1}
              </div>
              {idx < STAGES.length - 1 && (
                <div style={{
                  width: 2, flex: 1, minHeight: 14,
                  background: done ? '#86efac' : '#ede9fe',
                  margin: '3px 0',
                }} />
              )}
            </div>

            <div style={{ flex: 1, paddingBottom: idx < STAGES.length - 1 ? 10 : 0, paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <p style={{ fontSize: 12.5, fontWeight: active ? 600 : 400, color: labelColor, lineHeight: 1.2 }}>
                    {m.label}
                  </p>
                  <p style={{ fontSize: 10, color: active ? m.color : '#c4b5fd', marginTop: 1 }}>{m.agent}</p>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                  background: badgeBg, color: badgeColor,
                  border: `1px solid ${badgeBorder}`,
                  flexShrink: 0,
                }}>{badgeText}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
