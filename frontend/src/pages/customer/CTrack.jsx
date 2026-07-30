/**
 * CTrack.jsx — Customer Repair Tracker (auth-based portal)
 * Uses ?repair_id=X query param. Shows repair selector if multiple repairs.
 */
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getRepairStatus, getCustomerRepairs } from '../../api/orchestratorApi'
import useRealtimeSync from '../../hooks/useRealtimeSync'

const STAGES = [
  { key: 'intake',    label: 'Bike Received',      icon: '🏍️', desc: 'Your bike has been received at the workshop.' },
  { key: 'diagnosis', label: 'Diagnosis Completed', icon: '🔬', desc: 'AI diagnosis completed. Faulty components identified.' },
  { key: 'inventory', label: 'Parts Reserved',      icon: '📦', desc: 'Required spare parts have been reserved from stock.' },
  { key: 'repair',    label: 'Repair In Progress',  icon: '🔧', desc: 'Mechanic is actively working on your bike.' },
  { key: 'billing',   label: 'Invoice Generated',   icon: '🧾', desc: 'Repair complete. Invoice has been generated.' },
  { key: 'completed', label: 'Ready for Pickup',    icon: '✅', desc: 'Your bike is ready! Please collect it from the workshop.' },
]
const STAGE_PROGRESS = { intake: 15, diagnosis: 30, inventory: 45, repair: 65, billing: 85, completed: 100 }

function getCompletedStages(repair) {
  const done = new Set()
  if (repair.repair_status) done.add('intake')
  if (repair.severity) done.add('diagnosis')
  if (['In Progress', 'Completed'].includes(repair.repair_status)) { done.add('inventory'); done.add('repair') }
  if (repair.invoice_id) done.add('billing')
  if (repair.repair_status === 'Completed') done.add('completed')
  return Array.from(done)
}

function getCurrentStage(repair, completedStages) {
  if (repair.repair_status === 'Completed') return 'completed'
  const order = STAGES.map(s => s.key)
  for (let i = order.length - 1; i >= 0; i--) {
    if (completedStages.includes(order[i])) return order[Math.min(i + 1, order.length - 1)]
  }
  return 'intake'
}

export default function CTrack() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const repairIdParam = searchParams.get('repair_id')
  const id = repairIdParam ? parseInt(repairIdParam, 10) : null

  const [repairs, setRepairs] = useState([])
  const [repair, setRepair] = useState(null)
  const [loading, setLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Load all customer repairs for selector
  useEffect(() => {
    getCustomerRepairs()
      .then(r => setRepairs(r.data || []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    getRepairStatus(id).then(r => setRepair(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const handleEvent = useCallback((evt) => {
    setLastUpdated(new Date())
    if (evt.event === 'poll_update') { setRepair(evt.data); return }
    setWsConnected(true)
    setRepair(prev => {
      if (!prev) return prev
      const d = evt.data || {}
      const u = { ...prev }
      if (evt.stage === 'repair') u.repair_status = 'In Progress'
      if (evt.stage === 'billing') { u.invoice_id = d.invoice_id || u.invoice_id; u.grand_total = d.grand_total ?? u.grand_total }
      if (evt.event === 'workflow_completed') { u.repair_status = 'Completed'; u.invoice_id = d.invoice_id || u.invoice_id }
      return u
    })
  }, [])

  useRealtimeSync({ repairId: id, onEvent: handleEvent, enabled: !!id })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e0e7ff', borderTopColor: '#6366f1', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // No repair selected — show selector
  if (!id || !repair) {
    return (
      <div style={{ padding: '28px 28px', maxWidth: 700 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#6366f1,#818cf8)', borderRadius: 2 }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b' }}>Track Repair</h1>
          </div>
        </div>
        {repairs.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: 16, padding: '48px', textAlign: 'center', boxShadow: '0 2px 12px rgba(99,102,241,0.06)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📍</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#4338ca', marginBottom: 8 }}>No repairs yet</p>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Your repair tracking will appear here once your bike is received at the workshop.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Select a repair to track:</p>
            {repairs.map(r => (
              <button key={r.repair_id} onClick={() => navigate(`/customer/portal/track?repair_id=${r.repair_id}`)}
                style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: 14, padding: '16px 20px', textAlign: 'left', cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.06)', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#f5f3ff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e7ff'; e.currentTarget.style.background = '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>{r.bike_model} <span style={{ fontSize: 10, color: '#a5b4fc', fontFamily: 'JetBrains Mono, monospace' }}>REP{r.repair_id}</span></p>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{r.complaint?.slice(0, 60)}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
                    background: r.repair_status === 'Completed' ? '#dcfce7' : r.repair_status === 'In Progress' ? '#dbeafe' : '#f5f3ff',
                    color: r.repair_status === 'Completed' ? '#16a34a' : r.repair_status === 'In Progress' ? '#2563eb' : '#7c3aed',
                  }}>{r.repair_status}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const completedStages = getCompletedStages(repair)
  const currentStage    = getCurrentStage(repair, completedStages)
  const progress        = STAGE_PROGRESS[currentStage] ?? 5

  return (
    <div style={{ padding: '28px 28px', maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#6366f1,#818cf8)', borderRadius: 2 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b' }}>Track Repair</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 14 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: wsConnected ? '#22c55e' : '#fbbf24', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{wsConnected ? 'Live updates active' : 'Polling'}{lastUpdated ? ` · ${lastUpdated.toLocaleTimeString()}` : ''}</span>
          {repairs.length > 1 && (
            <button onClick={() => navigate('/customer/portal/track')}
              style={{ marginLeft: 8, fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              ← All Repairs
            </button>
          )}
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>

      {/* Bike info */}
      <div style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: '#fff' }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Repair ID: REP{repair.repair_id}</p>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>🏍️ {repair.bike_model}</h2>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>{repair.complaint}</p>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Progress</span>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{progress}%</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: progress === 100 ? '#4ade80' : '#fff', width: `${progress}%`, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: 16, padding: '24px', boxShadow: '0 2px 12px rgba(99,102,241,0.06)' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>Repair Timeline</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {STAGES.map((s, idx) => {
            const done    = completedStages.includes(s.key)
            const active  = s.key === currentStage && repair.repair_status !== 'Completed'
            const dotBg   = done ? '#dcfce7' : active ? '#eef2ff' : '#f9fafb'
            const dotBorder = done ? '#86efac' : active ? '#a5b4fc' : '#e5e7eb'
            const textColor = done ? '#15803d' : active ? '#4338ca' : '#9ca3af'
            return (
              <div key={s.key} style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: dotBg, border: `2px solid ${dotBorder}`, fontSize: 16, boxShadow: active ? '0 0 0 5px rgba(99,102,241,0.12)' : 'none', transition: 'all 0.3s' }}>
                    {done ? '✓' : s.icon}
                  </div>
                  {idx < STAGES.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 20, background: done ? '#86efac' : '#e5e7eb', margin: '4px 0' }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: idx < STAGES.length - 1 ? 16 : 0, paddingTop: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <p style={{ fontSize: 14, fontWeight: active ? 700 : done ? 600 : 400, color: textColor }}>{s.label}</p>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: done ? '#dcfce7' : active ? '#eef2ff' : '#f9fafb', color: done ? '#16a34a' : active ? '#6366f1' : '#9ca3af', border: `1px solid ${done ? '#86efac' : active ? '#c7d2fe' : '#e5e7eb'}` }}>
                      {done ? 'Done' : active ? 'In Progress' : 'Waiting'}
                    </span>
                  </div>
                  {(done || active) && <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>{s.desc}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
