import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getCustomerServiceReqs, getCustomerAppointments, getCustomerRepairs } from '../../api/orchestratorApi'
import useRealtimeSync from '../../hooks/useRealtimeSync'

const C = {
  card: { background: '#fff', border: '1px solid #e0e7ff', borderRadius: 16, boxShadow: '0 2px 12px rgba(99,102,241,0.06)' },
}

const APPT_STATUS_CFG = {
  scheduled:            { bg: '#dbeafe', color: '#2563eb', label: 'Scheduled' },
  confirmed:            { bg: '#dcfce7', color: '#16a34a', label: 'Confirmed ✓' },
  reschedule_requested: { bg: '#fef3c7', color: '#d97706', label: 'Reschedule Requested' },
  rescheduled:          { bg: '#f5f3ff', color: '#7c3aed', label: 'Rescheduled' },
  bike_received:        { bg: '#dcfce7', color: '#15803d', label: '🏍️ Bike Received' },
  missed:               { bg: '#fee2e2', color: '#dc2626', label: 'Missed' },
  cancelled:            { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled' },
}

const REPAIR_TIMELINE = [
  { key: 'Bike Received',       icon: '🏍️', desc: 'Bike received at workshop' },
  { key: 'Diagnosis Completed', icon: '🔬', desc: 'AI diagnosis completed' },
  { key: 'Waiting for Parts',   icon: '📦', desc: 'Waiting for spare parts' },
  { key: 'Repair Started',      icon: '🔧', desc: 'Repair work started' },
  { key: 'Engine Opened',       icon: '⚙️', desc: 'Engine inspection in progress' },
  { key: 'Parts Installed',     icon: '🔩', desc: 'Parts installed' },
  { key: 'Testing',             icon: '🧪', desc: 'Testing and verification' },
  { key: 'Quality Check',       icon: '✔️', desc: 'Quality check in progress' },
  { key: 'Repair Completed',    icon: '✅', desc: 'Repair fully completed' },
]

const STATUS_PROGRESS = {
  Pending: 5, 'Bike Received': 10, 'Diagnosis Completed': 20, 'Waiting for Parts': 30,
  'Repair Started': 40, 'Engine Opened': 55, 'Parts Installed': 70, Testing: 82,
  'Quality Check': 92, 'Repair Completed': 100, 'In Progress': 50, Completed: 100,
}

function getProgress(status) { return STATUS_PROGRESS[status] ?? 5 }

function Badge({ status }) {
  const s = APPT_STATUS_CFG[status] || { bg: '#f3f4f6', color: '#6b7280' }
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: s.bg, color: s.color }}>{s.label || status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
}

function RepairTimeline({ repair }) {
  const pct = getProgress(repair.repair_status)
  const currentIdx = REPAIR_TIMELINE.findIndex(s => s.key === repair.repair_status)

  return (
    <div style={{ ...C.card, padding: '20px 22px', marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>🏍️ {repair.bike_model}</p>
          <p style={{ fontSize: 10, color: '#a5b4fc', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>REP{repair.repair_id}</p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
          background: repair.repair_status === 'Completed' ? '#dcfce7' : repair.repair_status === 'In Progress' ? '#dbeafe' : '#f5f3ff',
          color: repair.repair_status === 'Completed' ? '#16a34a' : repair.repair_status === 'In Progress' ? '#2563eb' : '#7c3aed',
        }}>{repair.repair_status}</span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>Progress</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4338ca' }}>{pct}%</span>
        </div>
        <div style={{ background: '#e0e7ff', borderRadius: 99, height: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, background: pct === 100 ? '#16a34a' : 'linear-gradient(90deg,#6366f1,#4f46e5)', width: `${pct}%`, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
        </div>
      </div>

      {/* Timeline steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {REPAIR_TIMELINE.map((step, idx) => {
          const done = currentIdx >= 0 && idx <= currentIdx
          const active = idx === currentIdx
          return (
            <div key={step.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  background: done ? '#dcfce7' : active ? '#eef2ff' : '#f9fafb',
                  border: `2px solid ${done ? '#86efac' : active ? '#a5b4fc' : '#e5e7eb'}`,
                  boxShadow: active ? '0 0 0 4px rgba(99,102,241,0.12)' : 'none',
                }}>
                  {done ? '✓' : step.icon}
                </div>
                {idx < REPAIR_TIMELINE.length - 1 && <div style={{ width: 2, height: 16, background: done ? '#86efac' : '#e5e7eb', margin: '2px 0' }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: idx < REPAIR_TIMELINE.length - 1 ? 0 : 0, paddingTop: 4 }}>
                <p style={{ fontSize: 12, fontWeight: active ? 700 : done ? 600 : 400, color: done ? '#15803d' : active ? '#4338ca' : '#9ca3af', marginBottom: 2 }}>{step.key}</p>
                {(done || active) && <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{step.desc}</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Invoice — only after Repair Completed */}
      {repair.invoice_id ? (
        <div style={{ marginTop: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>🧾 Invoice Ready</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 12, color: '#15803d', fontFamily: 'JetBrains Mono, monospace' }}>{repair.invoice_id}</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#15803d' }}>₹{repair.grand_total?.toFixed(2)}</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
              background: repair.payment_status === 'Paid' ? '#dcfce7' : '#fef3c7',
              color: repair.payment_status === 'Paid' ? '#16a34a' : '#d97706',
            }}>{repair.payment_status || 'Pending'}</span>
          </div>
        </div>
      ) : repair.repair_status === 'Completed' ? (
        <div style={{ marginTop: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ fontSize: 12, color: '#d97706' }}>⏳ Invoice being generated...</p>
        </div>
      ) : (
        <div style={{ marginTop: 14, background: '#f8f7ff', border: '1px solid #e0e7ff', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ fontSize: 11, color: '#9ca3af' }}>🔒 Invoice available after repair is completed</p>
        </div>
      )}
    </div>
  )
}

export default function CDashboard() {
  const { customerData } = useAuth()
  const navigate = useNavigate()
  const [serviceReqs, setServiceReqs] = useState([])
  const [appointments, setAppointments] = useState([])
  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(() => {
    Promise.all([
      getCustomerServiceReqs().then(r => setServiceReqs(r.data || [])).catch(() => {}),
      getCustomerAppointments().then(r => setAppointments(r.data || [])).catch(() => {}),
      getCustomerRepairs().then(r => setRepairs(r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  useRealtimeSync({
    repairId: null, enabled: true,
    onEvent: useCallback((evt) => {
      if (['appointment_scheduled','bike_received','repair_status_updated','workflow_completed','payment_received','appointment_status_updated'].includes(evt.event)) {
        fetchAll()
      }
    }, [fetchAll]),
  })

  const pendingReqs    = serviceReqs.filter(r => r.status === 'pending').length
  const scheduledAppt  = appointments.filter(a => ['scheduled','confirmed'].includes(a.status)).length
  const activeRepairs  = repairs.filter(r => r.repair_status === 'In Progress').length
  const unpaidInvoices = repairs.filter(r => r.invoice_id && r.payment_status !== 'Paid').length

  // Latest appointment for bike reception status
  const latestAppt = appointments[0]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e0e7ff', borderTopColor: '#6366f1', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding: '28px 28px', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', borderRadius: 18, padding: '24px 28px', marginBottom: 24, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Customer Portal</p>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>👋 Welcome, {customerData?.name}!</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Track your bike service in real-time</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          ['📋', 'Pending Requests', pendingReqs, '#fef3c7', '#d97706'],
          ['📅', 'Appointments', scheduledAppt, '#f5f3ff', '#7c3aed'],
          ['🔧', 'Active Repairs', activeRepairs, '#dbeafe', '#2563eb'],
          ['🧾', 'Unpaid Invoices', unpaidInvoices, '#fee2e2', '#dc2626'],
        ].map(([icon, label, val, bg, color]) => (
          <div key={label} style={{ ...C.card, padding: '18px 20px', background: bg, border: `1px solid ${color}22` }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
            <p style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{val}</p>
            <p style={{ fontSize: 11, color: '#6b7280', marginTop: 5 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Appointment Status + Bike Reception */}
      {latestAppt && (
        <div style={{ ...C.card, padding: '20px 22px', marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Latest Appointment</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>{latestAppt.bike_brand} {latestAppt.bike_model}</p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>📅 {latestAppt.appointment_date} at {latestAppt.appointment_time}</p>
              {latestAppt.tracking_id && <p style={{ fontSize: 10, color: '#7c3aed', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{latestAppt.tracking_id}</p>}
            </div>
            <Badge status={latestAppt.status} />
          </div>

          {/* Bike Reception Status Banner */}
          {latestAppt.status === 'bike_received' ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>Your bike has been received by the workshop</p>
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>AI diagnosis and repair workflow has started automatically</p>
              </div>
            </div>
          ) : ['scheduled','confirmed','rescheduled'].includes(latestAppt.status) ? (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>⏳</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>Waiting for bike drop-off</p>
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Please bring your bike on {latestAppt.appointment_date} at {latestAppt.appointment_time}</p>
              </div>
            </div>
          ) : latestAppt.status === 'missed' ? (
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>Appointment Missed</p>
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Please contact us to reschedule your appointment</p>
              </div>
            </div>
          ) : null}

          <button onClick={() => navigate('/customer/portal/appointments')}
            style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            📅 View All Appointments
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ ...C.card, padding: '20px 22px', marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Quick Actions</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            ['🔧 Book Service', '/customer/portal/book-service', 'linear-gradient(135deg,#6366f1,#4f46e5)'],
            ['📅 My Appointments', '/customer/portal/appointments', 'linear-gradient(135deg,#7c3aed,#6d28d9)'],
            ['📍 Track Repair', '/customer/portal/track', 'linear-gradient(135deg,#0ea5e9,#0284c7)'],
            ['🧾 Billing', '/customer/portal/billing', 'linear-gradient(135deg,#f59e0b,#d97706)'],
          ].map(([label, path, bg]) => (
            <button key={label} onClick={() => navigate(path)}
              style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: bg, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.2)' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Repair Timeline — for active repairs */}
      {repairs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Repair Timeline</p>
          {repairs.slice(0, 2).map(r => <RepairTimeline key={r.repair_id} repair={r} />)}
          {repairs.length > 2 && (
            <button onClick={() => navigate('/customer/portal/track')}
              style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #e0e7ff', background: '#f8f7ff', color: '#6366f1', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              View All Repairs →
            </button>
          )}
        </div>
      )}

      {/* Recent service requests */}
      {serviceReqs.length > 0 && (
        <div style={{ ...C.card, padding: '20px 22px', marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Recent Service Requests</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {serviceReqs.slice(0, 3).map(sr => (
              <div key={sr.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8f7ff', borderRadius: 10, border: '1px solid #e0e7ff' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1e1b4b' }}>{sr.bike_brand} {sr.bike_model}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sr.complaint?.slice(0, 60)}{sr.complaint?.length > 60 ? '…' : ''}</p>
                  {sr.tracking_id && <p style={{ fontSize: 10, color: '#7c3aed', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{sr.tracking_id}</p>}
                </div>
                <Badge status={sr.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {serviceReqs.length === 0 && repairs.length === 0 && !latestAppt && (
        <div style={{ ...C.card, padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏍️</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#4338ca', marginBottom: 8 }}>No service history yet</p>
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>Book your first service to get started</p>
          <button onClick={() => navigate('/customer/portal/book-service')}
            style={{ padding: '12px 24px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            🔧 Book a Service
          </button>
        </div>
      )}
    </div>
  )
}
