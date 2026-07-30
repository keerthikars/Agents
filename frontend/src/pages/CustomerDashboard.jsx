/**
 * CustomerDashboard.jsx
 *
 * Customer-facing real-time repair tracker.
 * Route: /customer/:repairId
 *
 * - Loads initial repair state from GET /api/repairs/:id/status
 * - Subscribes to WebSocket events via useRealtimeSync
 * - Falls back to 5-second polling if WebSocket is unavailable
 * - Every agent event updates the timeline, progress bar, and notifications
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getRepairStatus } from '../api/orchestratorApi'
import useRealtimeSync from '../hooks/useRealtimeSync'

// ── Stage definitions ─────────────────────────────────────────────────────────
const STAGES = [
  { key: 'intake',       label: 'Bike Received',       icon: '🏍️', agent: 'Agent 1' },
  { key: 'diagnosis',    label: 'AI Diagnosis',         icon: '🔬', agent: 'Agent 2' },
  { key: 'inventory',    label: 'Parts Reserved',       icon: '📦', agent: 'Agent 3' },
  { key: 'repair',       label: 'Repair In Progress',   icon: '🔧', agent: 'Agent 5' },
  { key: 'billing',      label: 'Invoice Generated',    icon: '🧾', agent: 'Agent 4' },
  { key: 'notification', label: 'Notifications Sent',   icon: '🔔', agent: 'Agent 6' },
  { key: 'completed',    label: 'Ready for Pickup',     icon: '✅', agent: '' },
]

// Stage key → progress percentage
const STAGE_PROGRESS = {
  intake: 10, diagnosis: 25, inventory: 40,
  repair: 60, billing: 85, notification: 95, completed: 100,
}

// Repair status → progress override
const STATUS_PROGRESS = { Pending: 5, 'In Progress': 60, Completed: 100 }

const C = {
  page:  { minHeight: '100vh', background: '#f8faff', fontFamily: 'Inter, sans-serif' },
  card:  { background: '#fff', border: '1px solid #e8eaf6', borderRadius: 16, boxShadow: '0 2px 12px rgba(99,102,241,0.06)' },
  label: { fontSize: 10, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em' },
  mono:  { fontFamily: 'JetBrains Mono, monospace' },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Loader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e8eaf6', borderTopColor: '#6366f1', animation: 'spin 0.7s linear infinite' }} />
      <p style={{ fontSize: 14, color: '#6b7280' }}>Loading your repair status...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    Completed:     { bg: '#dcfce7', color: '#16a34a' },
    'In Progress': { bg: '#dbeafe', color: '#2563eb' },
    Pending:       { bg: '#f5f3ff', color: '#7c3aed' },
  }
  const s = map[status] || { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: s.bg, color: s.color }}>
      {status}
    </span>
  )
}

function ProgressBar({ pct }) {
  return (
    <div style={{ width: '100%', background: '#e8eaf6', borderRadius: 99, height: 10, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 99,
        background: pct === 100
          ? 'linear-gradient(90deg,#16a34a,#22c55e)'
          : 'linear-gradient(90deg,#6366f1,#818cf8)',
        width: `${pct}%`,
        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  )
}

function Timeline({ completedStages, currentStage, repairStatus }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {STAGES.map((s, idx) => {
        const done    = completedStages.includes(s.key) || repairStatus === 'Completed'
        const active  = s.key === currentStage && repairStatus !== 'Completed'
        const waiting = !done && !active

        const dotBg    = done ? '#dcfce7' : active ? '#eef2ff' : '#f9fafb'
        const dotColor = done ? '#16a34a' : active ? '#6366f1' : '#d1d5db'
        const dotBorder= done ? '#86efac' : active ? '#a5b4fc' : '#e5e7eb'
        const textColor= done ? '#15803d' : active ? '#4338ca' : '#9ca3af'

        return (
          <div key={s.key} style={{ display: 'flex', gap: 14, position: 'relative' }}>
            {/* Dot + connector */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: dotBg, border: `2px solid ${dotBorder}`,
                fontSize: 14,
                boxShadow: active ? '0 0 0 4px rgba(99,102,241,0.12)' : 'none',
                transition: 'all 0.3s',
              }}>
                {done ? '✓' : active ? <span style={{ fontSize: 10, fontWeight: 700, color: dotColor }}>▶</span> : <span style={{ fontSize: 11, color: dotColor }}>{idx + 1}</span>}
              </div>
              {idx < STAGES.length - 1 && (
                <div style={{ width: 2, flex: 1, minHeight: 16, background: done ? '#86efac' : '#e5e7eb', margin: '3px 0', transition: 'background 0.4s' }} />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingBottom: idx < STAGES.length - 1 ? 12 : 0, paddingTop: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: active ? 700 : done ? 600 : 400, color: textColor, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{s.icon}</span> {s.label}
                  </p>
                  {s.agent && <p style={{ fontSize: 10, color: '#c4b5fd', marginTop: 1 }}>{s.agent}</p>}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                  background: done ? '#dcfce7' : active ? '#eef2ff' : '#f9fafb',
                  color: done ? '#16a34a' : active ? '#6366f1' : '#9ca3af',
                  border: `1px solid ${done ? '#86efac' : active ? '#c7d2fe' : '#e5e7eb'}`,
                }}>
                  {done ? 'Done' : active ? 'In Progress' : 'Waiting'}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function NotificationFeed({ notifications }) {
  const TYPE_ICON = {
    diagnosis_complete: '🔬', repair_started: '🔧', repair_completed: '✅',
    invoice_ready: '🧾', pickup_ready: '🏍️', payment_received: '💳',
  }
  if (!notifications?.length) return (
    <p style={{ fontSize: 13, color: '#c4b5fd', textAlign: 'center', padding: '20px 0' }}>No notifications yet.</p>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {notifications.map((n, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', background: '#faf9ff', borderRadius: 10, border: '1px solid #ede9fe' }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_ICON[n.type] || '📢'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, color: '#4338ca', lineHeight: 1.5 }}>{n.message}</p>
            <p style={{ fontSize: 10, color: '#c4b5fd', marginTop: 3, ...C.mono }}>
              {n.sent_at ? new Date(n.sent_at).toLocaleString() : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function InvoiceCard({ repair }) {
  if (!repair.invoice_id) return null
  return (
    <div style={{ ...C.card, padding: '20px 22px' }}>
      <p style={{ ...C.label, marginBottom: 14 }}>Invoice</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          ['Invoice ID',   repair.invoice_id],
          ['Grand Total',  repair.grand_total != null ? `₹${repair.grand_total.toFixed(2)}` : '—'],
          ['Payment',      repair.payment_status || 'Pending'],
          ['Method',       repair.payment_method || '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f3ff' }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{k}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: k === 'Grand Total' ? '#4338ca' : k === 'Payment' ? (v === 'Paid' ? '#16a34a' : '#d97706') : '#1e1b4b', ...C.mono }}>{v}</span>
          </div>
        ))}
      </div>
      {repair.payment_status !== 'Paid' && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: '#fef3c7', borderRadius: 10, border: '1px solid #fde68a' }}>
          <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>⏳ Payment Pending</p>
          <p style={{ fontSize: 11, color: '#b45309', marginTop: 3 }}>Please visit the service center to complete payment.</p>
        </div>
      )}
      {repair.payment_status === 'Paid' && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: '#dcfce7', borderRadius: 10, border: '1px solid #86efac' }}>
          <p style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>✅ Payment Received</p>
          <p style={{ fontSize: 11, color: '#16a34a', marginTop: 3 }}>Thank you! Your bike is ready for pickup.</p>
        </div>
      )}
    </div>
  )
}

// ── Stage completion logic ────────────────────────────────────────────────────
function getCompletedStages(repair, events) {
  const completed = new Set()

  // From repair record state
  if (repair.repair_status) completed.add('intake')
  if (repair.severity)       completed.add('diagnosis')
  if (repair.repair_status === 'In Progress' || repair.repair_status === 'Completed') {
    completed.add('inventory')
    completed.add('repair')
  }
  if (repair.invoice_id) {
    completed.add('billing')
    completed.add('notification')
  }
  if (repair.repair_status === 'Completed') completed.add('completed')

  // From live events
  events.forEach(evt => {
    if (evt.stage && evt.status === 'completed') completed.add(evt.stage)
    if (evt.event === 'workflow_completed') {
      STAGES.forEach(s => completed.add(s.key))
    }
  })

  return Array.from(completed)
}

function getCurrentStage(repair, completedStages) {
  if (repair.repair_status === 'Completed') return 'completed'
  const order = STAGES.map(s => s.key)
  for (let i = order.length - 1; i >= 0; i--) {
    if (completedStages.includes(order[i])) {
      return order[Math.min(i + 1, order.length - 1)]
    }
  }
  return 'intake'
}

// ── Live event toast ──────────────────────────────────────────────────────────
function LiveToast({ event, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const ICONS = { intake: '🏍️', diagnosis: '🔬', inventory: '📦', repair: '🔧', billing: '🧾', notification: '🔔', completed: '✅', payment: '💳', poll: '🔄' }

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      background: '#fff', border: '1px solid #c7d2fe', borderRadius: 14,
      padding: '14px 18px', boxShadow: '0 8px 32px rgba(99,102,241,0.18)',
      display: 'flex', alignItems: 'center', gap: 12, maxWidth: 340,
      animation: 'slideIn 0.3s ease',
    }}>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
      <span style={{ fontSize: 22 }}>{ICONS[event.stage] || '🔔'}</span>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>Live Update</p>
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{event.message || 'Repair status updated.'}</p>
      </div>
      <button onClick={onDismiss} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#c4b5fd', fontSize: 16 }}>✕</button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CustomerDashboard() {
  const { repairId } = useParams()
  const id = parseInt(repairId, 10)

  const [repair, setRepair]           = useState(null)
  const [loading, setLoading]         = useState(true)
  const [liveEvents, setLiveEvents]   = useState([])
  const [toast, setToast]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)

  // Initial load
  useEffect(() => {
    if (!id) return
    getRepairStatus(id)
      .then(r => setRepair(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  // Handle incoming real-time events
  const handleEvent = useCallback((evt) => {
    setLastUpdated(new Date())

    if (evt.event === 'poll_update') {
      // Full state refresh from polling
      setRepair(evt.data)
      return
    }

    // WebSocket event
    setWsConnected(true)
    setLiveEvents(prev => [...prev, evt])
    setToast(evt)

    // Merge event data into repair state
    setRepair(prev => {
      if (!prev) return prev
      const d = evt.data || {}
      const updated = { ...prev }

      if (evt.stage === 'intake') {
        updated.repair_status = d.repair_status || updated.repair_status
        updated.priority = d.priority || updated.priority
      }
      if (evt.stage === 'diagnosis') {
        updated.severity = d.severity || updated.severity
      }
      if (evt.stage === 'repair') {
        updated.repair_status = 'In Progress'
      }
      if (evt.stage === 'billing') {
        updated.invoice_id     = d.invoice_id || updated.invoice_id
        updated.grand_total    = d.grand_total ?? updated.grand_total
        updated.payment_status = d.payment_status || updated.payment_status
      }
      if (evt.stage === 'payment') {
        updated.payment_status = d.payment_status || updated.payment_status
        updated.payment_method = d.payment_method || updated.payment_method
      }
      if (evt.event === 'workflow_completed') {
        updated.repair_status  = 'Completed'
        updated.invoice_id     = d.invoice_id || updated.invoice_id
        updated.grand_total    = d.grand_total ?? updated.grand_total
      }
      return updated
    })
  }, [])

  useRealtimeSync({ repairId: id, onEvent: handleEvent, enabled: !!id })

  if (loading) return <Loader />

  if (!repair) return (
    <div style={{ ...C.page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#4338ca' }}>Repair not found</p>
      <p style={{ fontSize: 13, color: '#9ca3af' }}>Repair ID #{repairId} does not exist.</p>
      <Link to="/" style={{ fontSize: 13, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>← Back to Dashboard</Link>
    </div>
  )

  const completedStages = getCompletedStages(repair, liveEvents)
  const currentStage    = getCurrentStage(repair, completedStages)
  const progress        = STAGE_PROGRESS[currentStage] ?? STATUS_PROGRESS[repair.repair_status] ?? 5

  return (
    <div style={C.page}>
      {toast && <LiveToast event={toast} onDismiss={() => setToast(null)} />}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)', padding: '28px 32px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>MechMate AI — Customer Portal</p>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px' }}>
                🏍️ {repair.bike_model}
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>
                {repair.customer_name} · Repair #{repair.repair_id}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <StatusBadge status={repair.repair_status} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: wsConnected ? '#4ade80' : '#fbbf24', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
                  {wsConnected ? 'Live' : 'Polling'} · {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Repair Progress</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{progress}%</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                background: progress === 100 ? '#4ade80' : '#fff',
                width: `${progress}%`,
                transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
          </div>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Repair details */}
          <div style={{ ...C.card, padding: '20px 22px' }}>
            <p style={{ ...C.label, marginBottom: 14 }}>Repair Details</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                ['Bike Model',   repair.bike_model],
                ['Brand',        repair.brand || '—'],
                ['Complaint',    repair.complaint],
                ['Priority',     repair.priority || '—'],
                ['Severity',     repair.severity || 'Pending diagnosis'],
                ['Received',     repair.created_at ? new Date(repair.created_at).toLocaleString() : '—'],
                ['Completed',    repair.completed_at ? new Date(repair.completed_at).toLocaleString() : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f3ff' }}>
                  <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0, marginRight: 12 }}>{k}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1e1b4b', textAlign: 'right', maxWidth: 260 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice */}
          <InvoiceCard repair={repair} />

          {/* Diagnosis details (shown once diagnosis event arrives) */}
          {liveEvents.find(e => e.stage === 'diagnosis') && (() => {
            const diagEvt = liveEvents.find(e => e.stage === 'diagnosis')
            const d = diagEvt?.data || {}
            return (
              <div style={{ ...C.card, padding: '20px 22px' }}>
                <p style={{ ...C.label, marginBottom: 14 }}>Diagnosis Report</p>
                {d.faulty_components?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>Faulty Components</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {d.faulty_components.map((c, i) => (
                        <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {d.ai_explanation && (
                  <div style={{ background: '#f5f3ff', borderRadius: 10, padding: '12px 14px', border: '1px solid #ede9fe' }}>
                    <p style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginBottom: 4 }}>🤖 AI Analysis</p>
                    <p style={{ fontSize: 12, color: '#4338ca', lineHeight: 1.6 }}>{d.ai_explanation}</p>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  {[
                    ['Severity',     d.severity],
                    ['Repair Time',  d.repair_time],
                    ['Labor Charge', d.labor_charge ? `₹${d.labor_charge}` : '—'],
                    ['Confidence',   d.confidence_score ? `${d.confidence_score}%` : '—'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: '#faf9ff', borderRadius: 8, padding: '8px 12px', border: '1px solid #ede9fe' }}>
                      <p style={{ fontSize: 10, color: '#c4b5fd', marginBottom: 3 }}>{k}</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#4338ca' }}>{v || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Timeline */}
          <div style={{ ...C.card, padding: '20px 18px' }}>
            <p style={{ ...C.label, marginBottom: 16 }}>Repair Timeline</p>
            <Timeline
              completedStages={completedStages}
              currentStage={currentStage}
              repairStatus={repair.repair_status}
            />
          </div>

          {/* Notifications */}
          <div style={{ ...C.card, padding: '20px 18px' }}>
            <p style={{ ...C.label, marginBottom: 14 }}>Notifications</p>
            <NotificationFeed notifications={repair.notifications} />
          </div>

          {/* Share link */}
          <div style={{ background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: 14, padding: '16px 18px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', marginBottom: 6 }}>📎 Share this page</p>
            <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>Send this link to track your repair in real-time.</p>
            <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 8, padding: '7px 10px', ...C.mono, fontSize: 11, color: '#6366f1', wordBreak: 'break-all' }}>
              {window.location.href}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
