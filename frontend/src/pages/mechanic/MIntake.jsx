import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getServiceRequests, acceptServiceRequest, rejectServiceRequest, scheduleAppointment } from '../../api/orchestratorApi'
import useRealtimeSync from '../../hooks/useRealtimeSync'

const MONO = { fontFamily: 'JetBrains Mono, monospace' }
const CARD = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }

const STATUS_STYLE = {
  pending:               { bg: '#fef3c7', color: '#d97706' },
  accepted:              { bg: '#dbeafe', color: '#2563eb' },
  appointment_scheduled: { bg: '#f5f3ff', color: '#7c3aed' },
  rejected:              { bg: '#fee2e2', color: '#dc2626' },
}

const DURATIONS = ['15 Minutes', '30 Minutes', '45 Minutes', '1 Hour', '1.5 Hours', '2 Hours']

function ScheduleDialog({ sr, onClose, onDone }) {
  const [form, setForm] = useState({ appointment_date: '', appointment_time: '', inspection_duration: '30 Minutes', mechanic_notes: sr.mechanic_notes || '' })
  const [saving, setSaving] = useState(false)

  const inp = { width: '100%', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '9px 12px', fontSize: 13, color: '#0f172a', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.appointment_date || !form.appointment_time) { toast.error('Date and time are required'); return }
    setSaving(true)
    try {
      if (sr.status === 'pending') await acceptServiceRequest(sr.id)
      await scheduleAppointment({ service_request_id: sr.id, ...form })
      toast.success(`Appointment scheduled for ${sr.customer_name}`)
      onDone(); onClose()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to schedule') } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '28px', width: 460, border: '1px solid #e2e8f0', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Schedule Service Appointment</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{sr.customer_name} · {sr.bike_model}</p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 16, color: '#64748b', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Request Summary</p>
          {[['Bike', `${sr.bike_brand} ${sr.bike_model}`], ['Reg No', sr.registration_number || '—'], ['Phone', sr.phone], ['Complaint', sr.complaint]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 60 }}>{k}:</span>
              <span style={{ fontSize: 11, color: '#475569' }}>{v}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Service Date *</label>
              <input type="date" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} min={new Date().toISOString().split('T')[0]} style={inp} />
            </div>
            <div>
              <label style={lbl}>Service Time *</label>
              <input type="time" value={form.appointment_time} onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))} style={inp} />
            </div>
          </div>
          <div>
            <label style={lbl}>Estimated Inspection Duration</label>
            <select value={form.inspection_duration} onChange={e => setForm(f => ({ ...f, inspection_duration: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
              {DURATIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Notes (Optional)</label>
            <textarea value={form.mechanic_notes} onChange={e => setForm(f => ({ ...f, mechanic_notes: e.target.value }))} rows={3} placeholder="e.g. Please bring the RC book." style={{ ...inp, resize: 'none', lineHeight: 1.6 }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: saving ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 13 }}>
              {saving ? 'Scheduling...' : '📅 Confirm Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MIntake() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [scheduleFor, setScheduleFor] = useState(null)
  const [rejectId, setRejectId]       = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchRequests = useCallback(() => {
    setLoading(true)
    getServiceRequests().then(r => setRequests(r.data || [])).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleEvent = useCallback((evt) => {
    if (['request_accepted','request_rejected','appointment_scheduled'].includes(evt.event)) fetchRequests()
  }, [fetchRequests])
  useRealtimeSync({ repairId: null, onEvent: handleEvent, enabled: true })

  const handleReject = async () => {
    if (!rejectId) return
    try {
      await rejectServiceRequest(rejectId)
      toast.success('Request rejected')
      setRejectId(null); setRejectReason(''); fetchRequests()
    } catch { toast.error('Failed') }
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)
  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    appointment_scheduled: requests.filter(r => r.status === 'appointment_scheduled').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#7c3aed,#3b82f6)', borderRadius: 2 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Service Requests</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginLeft: 14 }}>Review incoming customer requests and schedule appointments</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 22 }}>
        {[['Total', counts.all, '#0f172a', '#f8fafc', '#e2e8f0'],
          ['Pending', counts.pending, '#d97706', '#fffbeb', '#fde68a'],
          ['Accepted', counts.accepted, '#2563eb', '#dbeafe', '#bfdbfe'],
          ['Scheduled', counts.appointment_scheduled, '#7c3aed', '#faf5ff', '#ddd6fe'],
          ['Rejected', counts.rejected, '#dc2626', '#fff5f5', '#fecaca'],
        ].map(([label, val, color, bg, border]) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 20px' }}>
            <p style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{val}</p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 5, fontWeight: 500 }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[['all','All'],['pending','Pending'],['accepted','Accepted'],['appointment_scheduled','Scheduled'],['rejected','Rejected']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: filter === key ? '#7c3aed' : '#fff',
            color: filter === key ? '#fff' : '#64748b',
            border: filter === key ? '1.5px solid #7c3aed' : '1.5px solid #e2e8f0',
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 0', fontSize: 13 }}>No requests found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(sr => {
            const st = STATUS_STYLE[sr.status] || STATUS_STYLE.pending
            const isPending = sr.status === 'pending'
            return (
              <div key={sr.id} style={{ ...CARD, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{sr.customer_name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color }}>
                        {sr.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                      {sr.tracking_id && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 6, padding: '2px 7px', ...MONO }}>{sr.tracking_id}</span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '4px 16px', marginBottom: 6 }}>
                      {[['📱', sr.phone], ['🏍️', `${sr.bike_brand} ${sr.bike_model}`], ['🔢', sr.registration_number || '—']].map(([icon, val]) => (
                        <span key={icon} style={{ fontSize: 12, color: '#64748b' }}>{icon} {val}</span>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>💬 {sr.complaint}</p>
                    <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4, ...MONO }}>{new Date(sr.created_at).toLocaleString()}</p>
                  </div>

                  {(isPending || sr.status === 'accepted') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => setScheduleFor(sr)} style={{ padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none', whiteSpace: 'nowrap' }}>
                        📅 {isPending ? 'Accept & Schedule' : 'Schedule Appointment'}
                      </button>
                      {isPending && (
                        <button onClick={() => { setRejectId(sr.id); setRejectReason('') }} style={{ padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
                          ✕ Reject
                        </button>
                      )}
                    </div>
                  )}
                  {sr.status === 'appointment_scheduled' && (
                    <div style={{ flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>✓ Appointment Scheduled</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {scheduleFor && <ScheduleDialog sr={scheduleFor} onClose={() => setScheduleFor(null)} onDone={fetchRequests} />}

      {rejectId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 400, border: '1px solid #fecaca', boxShadow: '0 16px 48px rgba(0,0,0,0.12)' }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Reject Service Request?</p>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>This will notify the customer that their request was not accepted.</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Reason (Optional)</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="e.g. Fully booked this week..."
                style={{ width: '100%', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '9px 12px', fontSize: 13, color: '#0f172a', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setRejectId(null); setRejectReason('') }} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleReject} style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✕ Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
