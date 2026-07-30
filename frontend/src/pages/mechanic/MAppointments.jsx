import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getAppointments, markBikeReceived, approveReschedule, rejectReschedule } from '../../api/orchestratorApi'
import useRealtimeSync from '../../hooks/useRealtimeSync'

const MONO = { fontFamily: 'JetBrains Mono, monospace' }
const CARD = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }

const STATUS_CFG = {
  scheduled:            { bg: '#dbeafe', color: '#2563eb', label: 'Scheduled' },
  confirmed:            { bg: '#dcfce7', color: '#16a34a', label: 'Confirmed' },
  reschedule_requested: { bg: '#fef3c7', color: '#d97706', label: 'Reschedule Requested' },
  rescheduled:          { bg: '#f5f3ff', color: '#7c3aed', label: 'Rescheduled' },
  bike_received:        { bg: '#dcfce7', color: '#15803d', label: 'Bike Received ✓' },
  missed:               { bg: '#fee2e2', color: '#dc2626', label: 'Appointment Missed' },
  cancelled:            { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled' },
}

function todayStr() { return new Date().toISOString().split('T')[0] }

function categorise(appts) {
  const today = todayStr()
  return {
    today:      appts.filter(a => a.appointment_date === today && !['bike_received','cancelled','missed'].includes(a.status)),
    upcoming:   appts.filter(a => a.appointment_date > today && !['bike_received','cancelled','missed'].includes(a.status)),
    received:   appts.filter(a => a.status === 'bike_received'),
    reschedule: appts.filter(a => a.status === 'reschedule_requested'),
    missed:     appts.filter(a => a.appointment_date < today && !['bike_received','cancelled','missed'].includes(a.status)),
  }
}

// Bike Reception Card — shown for today's confirmed/scheduled appointments
function BikeReceptionCard({ appt, onAction, acting }) {
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleForm, setRescheduleForm] = useState({ appointment_date: '', appointment_time: '', inspection_duration: '30 Minutes', mechanic_notes: '' })
  const [saving, setSaving] = useState(false)
  const isActing = acting === appt.id

  const handleReschedule = async () => {
    if (!rescheduleForm.appointment_date || !rescheduleForm.appointment_time) { toast.error('Date and time required'); return }
    setSaving(true)
    try {
      // Update appointment date/time via approve-reschedule flow — we patch directly
      await onAction('reschedule_new', appt, rescheduleForm)
      setShowReschedule(false)
    } finally { setSaving(false) }
  }

  return (
    <div style={{ ...CARD, border: '2px solid #bfdbfe', marginBottom: 14 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', padding: '14px 20px', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #bfdbfe' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🏍️</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#1e40af' }}>Bike Reception</p>
            <p style={{ fontSize: 11, color: '#3b82f6' }}>{appt.customer_name} · {appt.bike_brand} {appt.bike_model} · {appt.appointment_time}</p>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#dbeafe', color: '#2563eb', ...MONO }}>{appt.tracking_id}</span>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>💬 {appt.complaint}</p>

        {!showReschedule ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => onAction('receive', appt)} disabled={isActing}
              style={{ flex: 2, padding: '11px 16px', borderRadius: 10, border: 'none', cursor: isActing ? 'not-allowed' : 'pointer', background: isActing ? '#e2e8f0' : 'linear-gradient(135deg,#16a34a,#15803d)', color: isActing ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {isActing ? '⏳ Processing...' : '✅ Receive Bike'}
            </button>
            <button onClick={() => onAction('missed', appt)} disabled={isActing}
              style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #fecaca', cursor: isActing ? 'not-allowed' : 'pointer', background: '#fff5f5', color: '#dc2626', fontWeight: 700, fontSize: 12 }}>
              ✕ Didn't Arrive
            </button>
            <button onClick={() => setShowReschedule(true)} disabled={isActing}
              style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #ddd6fe', cursor: isActing ? 'not-allowed' : 'pointer', background: '#faf5ff', color: '#7c3aed', fontWeight: 700, fontSize: 12 }}>
              🔄 Reschedule
            </button>
          </div>
        ) : (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Reschedule Appointment</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>New Date *</label>
                <input type="date" value={rescheduleForm.appointment_date} min={todayStr()}
                  onChange={e => setRescheduleForm(f => ({ ...f, appointment_date: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>New Time *</label>
                <input type="time" value={rescheduleForm.appointment_time}
                  onChange={e => setRescheduleForm(f => ({ ...f, appointment_time: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowReschedule(false)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleReschedule} disabled={saving} style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: saving ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: saving ? '#94a3b8' : '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : '✓ Confirm Reschedule'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ApptCard({ appt, onAction, acting }) {
  const cfg = STATUS_CFG[appt.status] || STATUS_CFG.scheduled
  const isRescheduleReq = appt.status === 'reschedule_requested'
  const canReceive = ['scheduled','confirmed','rescheduled'].includes(appt.status)
  const isActing = acting === appt.id

  return (
    <div style={{ ...CARD, padding: '16px 20px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{appt.customer_name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
            {appt.tracking_id && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 6, padding: '2px 7px', ...MONO }}>{appt.tracking_id}</span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '4px 16px', marginBottom: 6 }}>
            {[['🏍️', `${appt.bike_brand || ''} ${appt.bike_model}`], ['📅', appt.appointment_date], ['🕐', appt.appointment_time],
              ['⏱', appt.inspection_duration || '—'], ['📱', appt.customer_phone], ['🔢', appt.registration_number || '—'],
            ].map(([icon, val]) => (
              <span key={icon} style={{ fontSize: 12, color: '#64748b' }}>{icon} {val}</span>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>💬 {appt.complaint}</p>
          {appt.mechanic_notes && <p style={{ fontSize: 11, color: '#7c3aed', marginTop: 4 }}>📝 {appt.mechanic_notes}</p>}

          {isRescheduleReq && (
            <div style={{ marginTop: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '10px 12px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 4 }}>⚠ Customer Requested Reschedule</p>
              <p style={{ fontSize: 12, color: '#92400e' }}>New Date: {appt.reschedule_date} at {appt.reschedule_time}</p>
              {appt.reschedule_reason && <p style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Reason: {appt.reschedule_reason}</p>}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          {canReceive && (
            <button onClick={() => onAction('receive', appt)} disabled={isActing}
              style={{ padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: isActing ? 'not-allowed' : 'pointer', background: isActing ? '#e2e8f0' : 'linear-gradient(135deg,#16a34a,#15803d)', color: isActing ? '#94a3b8' : '#fff', border: 'none', whiteSpace: 'nowrap' }}>
              {isActing ? '⏳...' : '🏍️ Bike Received'}
            </button>
          )}
          {isRescheduleReq && (
            <>
              <button onClick={() => onAction('approve', appt)} style={{ padding: '7px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none' }}>✓ Approve</button>
              <button onClick={() => onAction('reject_reschedule', appt)} style={{ padding: '7px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>✕ Reject</button>
            </>
          )}
          {appt.status === 'bike_received' && appt.repair_id && (
            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, ...MONO }}>REP{appt.repair_id}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MAppointments() {
  const [appts, setAppts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('today')
  const [acting, setActing]   = useState(null)
  const navigate = useNavigate()

  const fetchAppts = useCallback(() => {
    setLoading(true)
    getAppointments().then(r => setAppts(r.data || [])).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAppts() }, [fetchAppts])

  const handleEvent = useCallback((evt) => {
    if (['appointment_confirmed','reschedule_requested','reschedule_approved','reschedule_rejected','bike_received','appointment_scheduled'].includes(evt.event)) fetchAppts()
  }, [fetchAppts])
  useRealtimeSync({ repairId: null, onEvent: handleEvent, enabled: true })

  const handleAction = async (action, appt, extra) => {
    setActing(appt.id)
    try {
      if (action === 'receive') {
        await markBikeReceived(appt.id)
        toast.success(`✅ Bike received! Go to AI Diagnosis to run diagnosis.`)
        // Navigate to diagnosis page with this appointment pre-selected
        navigate(`/mechanic/diagnosis?appointment_id=${appt.id}`)
        return
      } else if (action === 'approve') {
        await approveReschedule(appt.id)
        toast.success('Reschedule approved')
      } else if (action === 'reject_reschedule') {
        await rejectReschedule(appt.id)
        toast.success('Reschedule rejected — original date kept')
      } else if (action === 'missed') {
        // PATCH appointment status to missed via a direct API call
        const { default: axios } = await import('axios')
        const token = localStorage.getItem('mechmate_token')
        await axios.patch(`/api/appointments/${appt.id}/status`, { status: 'missed' }, { headers: { Authorization: `Bearer ${token}` } })
        toast.error(`Appointment marked as missed. Customer notified.`)
      } else if (action === 'reschedule_new') {
        const { default: axios } = await import('axios')
        const token = localStorage.getItem('mechmate_token')
        await axios.patch(`/api/appointments/${appt.id}/status`, { status: 'scheduled', appointment_date: extra.appointment_date, appointment_time: extra.appointment_time }, { headers: { Authorization: `Bearer ${token}` } })
        toast.success(`Appointment rescheduled to ${extra.appointment_date} at ${extra.appointment_time}`)
      }
      fetchAppts()
    } catch (err) { toast.error(err.response?.data?.detail || 'Action failed') } finally { setActing(null) }
  }

  const cats = categorise(appts)
  const todayStr_ = todayStr()
  // Today's appointments that need bike reception (not yet received)
  const needsReception = appts.filter(a =>
    a.appointment_date === todayStr_ &&
    ['scheduled','confirmed','rescheduled'].includes(a.status)
  )

  const TABS = [
    { key: 'today',      label: `Today (${cats.today.length})` },
    { key: 'upcoming',   label: `Upcoming (${cats.upcoming.length})` },
    { key: 'reschedule', label: `Reschedule Req (${cats.reschedule.length})` },
    { key: 'received',   label: `Bike Received (${cats.received.length})` },
    { key: 'missed',     label: `Missed (${cats.missed.length})` },
  ]
  const shown = cats[tab] || []

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#7c3aed,#3b82f6)', borderRadius: 2 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Appointment Calendar</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginLeft: 14 }}>Manage appointments — receive bike to unlock AI workflow agents</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 22 }}>
        {[['Today', cats.today.length, '#2563eb', '#eff6ff', '#bfdbfe'],
          ['Upcoming', cats.upcoming.length, '#7c3aed', '#faf5ff', '#ddd6fe'],
          ['Reschedule', cats.reschedule.length, '#d97706', '#fffbeb', '#fde68a'],
          ['Received', cats.received.length, '#16a34a', '#f0fdf4', '#bbf7d0'],
          ['Missed', cats.missed.length, '#dc2626', '#fff5f5', '#fecaca'],
        ].map(([label, val, color, bg, border]) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{val}</p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Bike Reception Section — always shown when there are today's appointments */}
      {needsReception.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', animation: 'pulse 2s infinite' }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bike Reception — Today's Arrivals</p>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 16px', marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: '#15803d' }}>
              ⚠️ <strong>Important:</strong> AI Diagnosis, Inventory, Repair Status, and Billing are only unlocked <strong>after</strong> you click "Receive Bike". This starts the full AI workflow.
            </p>
          </div>
          {needsReception.map(appt => (
            <BikeReceptionCard key={appt.id} appt={appt} onAction={handleAction} acting={acting} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: tab === key ? '#7c3aed' : '#fff',
            color: tab === key ? '#fff' : '#64748b',
            border: tab === key ? '1.5px solid #7c3aed' : '1.5px solid #e2e8f0',
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : shown.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 0', fontSize: 13 }}>No appointments in this category.</p>
      ) : (
        <div>{shown.map(appt => <ApptCard key={appt.id} appt={appt} onAction={acting ? () => {} : handleAction} acting={acting} />)}</div>
      )}
    </div>
  )
}
