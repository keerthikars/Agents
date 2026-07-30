/**
 * CAppointments.jsx — Customer Portal: My Appointments
 * Lists all appointments for the logged-in customer.
 * Allows confirm and reschedule request.
 */
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getCustomerAppointments, confirmAppointment, requestReschedule } from '../../api/orchestratorApi'
import useRealtimeSync from '../../hooks/useRealtimeSync'

const C = {
  card: { background: '#fff', border: '1px solid #e0e7ff', borderRadius: 16, boxShadow: '0 2px 12px rgba(99,102,241,0.06)' },
}

const STATUS_CFG = {
  scheduled:            { bg: '#dbeafe', color: '#2563eb', label: 'Scheduled',             icon: '📅' },
  confirmed:            { bg: '#dcfce7', color: '#16a34a', label: 'Confirmed',              icon: '✅' },
  reschedule_requested: { bg: '#fef3c7', color: '#d97706', label: 'Reschedule Requested',   icon: '🔄' },
  rescheduled:          { bg: '#f5f3ff', color: '#7c3aed', label: 'Rescheduled',            icon: '📆' },
  bike_received:        { bg: '#dcfce7', color: '#15803d', label: 'Bike Received',          icon: '🔧' },
  cancelled:            { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled',              icon: '✕' },
}

function RescheduleModal({ apptId, onClose, onDone }) {
  const [form, setForm] = useState({ reschedule_date: '', reschedule_time: '', reschedule_reason: '' })
  const [saving, setSaving] = useState(false)
  const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, background: '#f5f3ff', border: '1.5px solid #e0e7ff', color: '#1e1b4b', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.reschedule_date || !form.reschedule_time) { toast.error('Date and time required'); return }
    setSaving(true)
    try {
      await requestReschedule(apptId, form)
      toast.success('Reschedule request sent!')
      onDone(); onClose()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '28px', width: 420, border: '1px solid #e0e7ff', boxShadow: '0 8px 32px rgba(99,102,241,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 17, fontWeight: 800, color: '#1e1b4b' }}>Request Reschedule</p>
          <button onClick={onClose} style={{ background: '#f5f3ff', border: '1px solid #e0e7ff', borderRadius: 8, width: 32, height: 32, fontSize: 16, color: '#9ca3af', cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Date *</label>
              <input type="date" value={form.reschedule_date} onChange={e => setForm(f => ({ ...f, reschedule_date: e.target.value }))} min={new Date().toISOString().split('T')[0]} style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Time *</label>
              <input type="time" value={form.reschedule_time} onChange={e => setForm(f => ({ ...f, reschedule_time: e.target.value }))} style={inp} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Reason (Optional)</label>
            <textarea value={form.reschedule_reason} onChange={e => setForm(f => ({ ...f, reschedule_reason: e.target.value }))} rows={3} placeholder="Why do you need to reschedule?" style={{ ...inp, resize: 'none', lineHeight: 1.6 }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e0e7ff', background: '#f5f3ff', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#e0e7ff' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: saving ? '#a5b4fc' : '#fff', fontWeight: 700, fontSize: 13 }}>
              {saving ? 'Sending...' : '📤 Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CAppointments() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [rescheduleFor, setRescheduleFor] = useState(null)
  const [confirming, setConfirming] = useState(null)

  const fetchAppts = useCallback(() => {
    getCustomerAppointments()
      .then(r => setAppointments(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAppts() }, [fetchAppts])

  useRealtimeSync({
    repairId: null, enabled: true,
    onEvent: useCallback((evt) => {
      if (['appointment_scheduled', 'appointment_confirmed', 'reschedule_approved', 'reschedule_rejected', 'bike_received'].includes(evt.event)) {
        fetchAppts()
      }
    }, [fetchAppts]),
  })

  const handleConfirm = async (appt) => {
    setConfirming(appt.id)
    try {
      await confirmAppointment(appt.id)
      toast.success('Appointment confirmed!')
      fetchAppts()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setConfirming(null) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e0e7ff', borderTopColor: '#6366f1', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding: '28px 28px', maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#6366f1,#818cf8)', borderRadius: 2 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b' }}>My Appointments</h1>
        </div>
        <p style={{ fontSize: 13, color: '#9ca3af', marginLeft: 14 }}>All your scheduled service appointments</p>
      </div>

      {appointments.length === 0 ? (
        <div style={{ ...C.card, padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#4338ca', marginBottom: 8 }}>No appointments yet</p>
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>Book a service to get an appointment scheduled</p>
          <button onClick={() => navigate('/customer/portal/book-service')}
            style={{ padding: '12px 24px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            🔧 Book a Service
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {appointments.map(appt => {
            const cfg = STATUS_CFG[appt.status] || STATUS_CFG.scheduled
            const canConfirm = ['scheduled', 'rescheduled'].includes(appt.status)
            const canReschedule = ['scheduled', 'confirmed', 'rescheduled'].includes(appt.status)
            return (
              <div key={appt.id} style={{ ...C.card, padding: '20px 22px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#1e1b4b' }}>{appt.bike_brand} {appt.bike_model}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>{appt.tracking_id}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: cfg.bg, color: cfg.color }}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                  {[['📅 Date', appt.appointment_date], ['🕐 Time', appt.appointment_time], ['⏱ Duration', appt.inspection_duration || '—']].map(([k, v]) => (
                    <div key={k} style={{ background: '#f8f7ff', borderRadius: 9, padding: '10px 12px' }}>
                      <p style={{ fontSize: 10, color: '#a5b4fc', marginBottom: 3 }}>{k}</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#4338ca' }}>{v}</p>
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: appt.mechanic_notes ? 10 : 0 }}>💬 {appt.complaint}</p>

                {appt.mechanic_notes && (
                  <div style={{ background: '#f5f3ff', border: '1px solid #e0e7ff', borderRadius: 9, padding: '10px 12px', marginBottom: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', marginBottom: 3 }}>📝 Mechanic Notes</p>
                    <p style={{ fontSize: 12, color: '#4338ca' }}>{appt.mechanic_notes}</p>
                  </div>
                )}

                {appt.status === 'reschedule_requested' && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '10px 12px', marginBottom: 14 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#d97706' }}>🔄 Reschedule Requested: {appt.reschedule_date} at {appt.reschedule_time}</p>
                    {appt.reschedule_reason && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{appt.reschedule_reason}</p>}
                  </div>
                )}

                {appt.repair_id && (
                  <button onClick={() => navigate(`/customer/portal/track?repair_id=${appt.repair_id}`)}
                    style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
                    📍 Track Repair (REP{appt.repair_id})
                  </button>
                )}

                {(canConfirm || canReschedule) && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    {canConfirm && (
                      <button onClick={() => handleConfirm(appt)} disabled={confirming === appt.id}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: confirming === appt.id ? 'not-allowed' : 'pointer', background: confirming === appt.id ? '#e0e7ff' : 'linear-gradient(135deg,#16a34a,#15803d)', color: confirming === appt.id ? '#a5b4fc' : '#fff', fontWeight: 700, fontSize: 13 }}>
                        {confirming === appt.id ? 'Confirming...' : '✅ Confirm'}
                      </button>
                    )}
                    {canReschedule && (
                      <button onClick={() => setRescheduleFor(appt)}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e0e7ff', background: '#f5f3ff', color: '#6366f1', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        🔄 Reschedule
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {rescheduleFor && (
        <RescheduleModal
          apptId={rescheduleFor.id}
          onClose={() => setRescheduleFor(null)}
          onDone={fetchAppts}
        />
      )}
    </div>
  )
}
