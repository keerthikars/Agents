/**
 * CAppointment.jsx — Customer Appointment View
 * Shows appointment details, allows confirm and reschedule request.
 */
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  getRepairStatus, getAppointment,
  confirmAppointment, requestReschedule,
} from '../../api/orchestratorApi'
import useRealtimeSync from '../../hooks/useRealtimeSync'

const C = {
  card: { background: '#fff', border: '1px solid #e0e7ff', borderRadius: 16, boxShadow: '0 2px 12px rgba(99,102,241,0.06)' },
}

const STATUS_CFG = {
  scheduled:            { bg: '#dbeafe', color: '#2563eb', label: 'Scheduled',             icon: '📅' },
  confirmed:            { bg: '#dcfce7', color: '#16a34a', label: 'Confirmed',              icon: '✅' },
  reschedule_requested: { bg: '#fef3c7', color: '#d97706', label: 'Reschedule Requested',   icon: '🔄' },
  rescheduled:          { bg: '#f5f3ff', color: '#7c3aed', label: 'Rescheduled',            icon: '📆' },
  bike_received:        { bg: '#dcfce7', color: '#15803d', label: 'Bike Received — Repair Started', icon: '🔧' },
  cancelled:            { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled',              icon: '✕' },
}

function RescheduleModal({ apptId, onClose, onDone }) {
  const [form, setForm] = useState({ reschedule_date: '', reschedule_time: '', reschedule_reason: '' })
  const [saving, setSaving] = useState(false)

  const inp = {
    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
    background: '#f5f3ff', border: '1.5px solid #e0e7ff', color: '#1e1b4b',
    outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.reschedule_date || !form.reschedule_time) { toast.error('Date and time required'); return }
    setSaving(true)
    try {
      await requestReschedule(apptId, form)
      toast.success('Reschedule request sent to mechanic')
      onDone()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
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
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Preferred Date *</label>
              <input type="date" value={form.reschedule_date}
                onChange={e => setForm(f => ({ ...f, reschedule_date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]} style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Preferred Time *</label>
              <input type="time" value={form.reschedule_time}
                onChange={e => setForm(f => ({ ...f, reschedule_time: e.target.value }))}
                style={inp} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Reason (Optional)</label>
            <textarea value={form.reschedule_reason}
              onChange={e => setForm(f => ({ ...f, reschedule_reason: e.target.value }))}
              rows={3} placeholder="Why do you need to reschedule?"
              style={{ ...inp, resize: 'none', lineHeight: 1.6 }} />
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

export default function CAppointment() {
  const { repairId } = useParams()
  const navigate = useNavigate()
  const [appt, setAppt]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [showReschedule, setShowReschedule] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // repairId here is the appointment's numeric id (from APT{id} tracking)
  // or a repair_id if bike already received
  const fetchAppt = useCallback(() => {
    getAppointment(repairId)
      .then(r => setAppt(r.data))
      .catch(() => {
        // Fallback: try by repair_id in case user navigated from repair portal
        getRepairStatus(repairId)
          .then(() => setAppt(null))
          .catch(console.error)
      })
      .finally(() => setLoading(false))
  }, [repairId])

  useEffect(() => { fetchAppt() }, [fetchAppt])

  const handleEvent = useCallback((evt) => {
    if (['appointment_confirmed', 'reschedule_approved', 'reschedule_rejected',
         'bike_received', 'appointment_scheduled'].includes(evt.event)) {
      // If bike received, redirect to repair portal
      if (evt.event === 'bike_received') {
        const newRepairId = evt.data?.repair_id
        if (newRepairId) {
          sessionStorage.removeItem(`apt_mode_${repairId}`)
          sessionStorage.setItem(`tracking_id_${newRepairId}`, `REP${newRepairId}`)
          navigate(`/customer/${newRepairId}`, { replace: true })
          return
        }
      }
      fetchAppt()
    }
  }, [fetchAppt, repairId, navigate])
  useRealtimeSync({ repairId: null, onEvent: handleEvent, enabled: true })

  const handleConfirm = async () => {
    if (!appt) return
    setConfirming(true)
    try {
      await confirmAppointment(appt.id)
      toast.success('Appointment confirmed!')
      fetchAppt()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setConfirming(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e0e7ff', borderTopColor: '#6366f1', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!appt) return (
    <div style={{ padding: '28px 28px', maxWidth: 700 }}>
      <div style={{ ...C.card, padding: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: 36, marginBottom: 12 }}>🔧</p>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#4338ca', marginBottom: 8 }}>Repair In Progress</p>
        <p style={{ fontSize: 13, color: '#9ca3af' }}>Your bike has been received and the repair workflow has started. Check the Dashboard for live updates.</p>
      </div>
    </div>
  )

  const cfg = STATUS_CFG[appt.status] || STATUS_CFG.scheduled
  const canConfirm = ['scheduled', 'rescheduled'].includes(appt.status)
  const canReschedule = ['scheduled', 'confirmed', 'rescheduled'].includes(appt.status)

  return (
    <div style={{ padding: '28px 28px', maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#6366f1,#818cf8)', borderRadius: 2 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b' }}>My Appointment</h1>
        </div>
        <p style={{ fontSize: 13, color: '#9ca3af', marginLeft: 14 }}>Tracking ID: {appt.tracking_id}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Status banner */}
        <div style={{ background: `linear-gradient(135deg,#6366f1,#4f46e5)`, borderRadius: 16, padding: '20px 24px', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>{cfg.icon}</span>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Appointment Status</p>
              <p style={{ fontSize: 18, fontWeight: 800 }}>{cfg.label}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['📅 Date', appt.appointment_date], ['🕐 Time', appt.appointment_time],
              ['⏱ Duration', appt.inspection_duration || '—'], ['🏍️ Bike', appt.bike_model]].map(([k, v]) => (
              <div key={k} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>{k}</p>
                <p style={{ fontSize: 13, fontWeight: 700 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Details card */}
        <div style={{ ...C.card, padding: '20px 22px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Appointment Details</p>
          {[
            ['Tracking ID', appt.tracking_id],
            ['Customer', appt.customer_name],
            ['Phone', appt.customer_phone],
            ['Bike', `${appt.bike_brand || ''} ${appt.bike_model}`],
            ['Reg No', appt.registration_number || '—'],
            ['Complaint', appt.complaint],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f5f3ff' }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{k}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#1e1b4b', textAlign: 'right', maxWidth: 260 }}>{v}</span>
            </div>
          ))}
          {appt.mechanic_notes && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#f5f3ff', borderRadius: 10, border: '1px solid #e0e7ff' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>📝 Mechanic Notes</p>
              <p style={{ fontSize: 13, color: '#4338ca' }}>{appt.mechanic_notes}</p>
            </div>
          )}
        </div>

        {/* Reschedule request pending */}
        {appt.status === 'reschedule_requested' && (
          <div style={{ ...C.card, padding: '16px 20px', border: '1px solid #fde68a' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#d97706', marginBottom: 8 }}>🔄 Reschedule Request Pending</p>
            <p style={{ fontSize: 12, color: '#6b7280' }}>Requested: {appt.reschedule_date} at {appt.reschedule_time}</p>
            {appt.reschedule_reason && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Reason: {appt.reschedule_reason}</p>}
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Waiting for mechanic approval.</p>
          </div>
        )}

        {/* Action buttons */}
        {(canConfirm || canReschedule) && (
          <div style={{ display: 'flex', gap: 12 }}>
            {canConfirm && (
              <button onClick={handleConfirm} disabled={confirming} style={{
                flex: 1, padding: '13px', borderRadius: 12, border: 'none',
                cursor: confirming ? 'not-allowed' : 'pointer',
                background: confirming ? '#e0e7ff' : 'linear-gradient(135deg,#16a34a,#15803d)',
                color: confirming ? '#a5b4fc' : '#fff', fontWeight: 700, fontSize: 14,
              }}>
                {confirming ? 'Confirming...' : '✅ Confirm Appointment'}
              </button>
            )}
            {canReschedule && (
              <button onClick={() => setShowReschedule(true)} style={{
                flex: 1, padding: '13px', borderRadius: 12,
                border: '1.5px solid #e0e7ff', background: '#f5f3ff',
                color: '#6366f1', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>
                🔄 Request Reschedule
              </button>
            )}
          </div>
        )}

        {appt.status === 'bike_received' && (
          <div style={{ ...C.card, padding: '20px 22px', textAlign: 'center' }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>🔧</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>Bike Received — Repair Started!</p>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Your bike is now in the workshop. Track progress on the Dashboard.</p>
          </div>
        )}
      </div>

      {showReschedule && (
        <RescheduleModal
          apptId={appt.id}
          onClose={() => setShowReschedule(false)}
          onDone={fetchAppt}
        />
      )}
    </div>
  )
}
