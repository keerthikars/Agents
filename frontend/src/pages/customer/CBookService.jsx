/**
 * CBookService.jsx — Customer Portal: Book a Service
 * Pre-fills customer details from auth context.
 * Submits a service request → status "Waiting for Mechanic Review"
 */
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createServiceRequest } from '../../api/orchestratorApi'
import toast from 'react-hot-toast'

const BRANDS = ['Honda', 'Yamaha', 'Bajaj', 'TVS', 'Hero', 'Royal Enfield', 'Suzuki', 'KTM', 'Kawasaki', 'Other']

const C = {
  card: { background: '#fff', border: '1px solid #e0e7ff', borderRadius: 16, boxShadow: '0 2px 12px rgba(99,102,241,0.06)' },
}

function Field({ label, error, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6366f1', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>{error}</p>}
    </div>
  )
}

const INP = {
  width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 13,
  background: '#f8f7ff', border: '1.5px solid #e0e7ff', color: '#1e1b4b',
  outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

export default function CBookService() {
  const { customerData } = useAuth()
  const [form, setForm] = useState({
    bike_brand: '', bike_model: '', registration_number: '',
    complaint: '', preferred_date: '', preferred_time: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(null)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.bike_brand) e.bike_brand = 'Required'
    if (!form.bike_model.trim()) e.bike_model = 'Required'
    if (!form.complaint.trim()) e.complaint = 'Required'
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); toast.error('Please fill required fields'); return }
    setLoading(true)
    try {
      const payload = {
        customer_name: customerData?.name || '',
        phone: customerData?.phone || '',
        email: customerData?.email || '',
        bike_brand: form.bike_brand,
        bike_model: form.bike_model,
        registration_number: form.registration_number,
        complaint: form.complaint,
        preferred_date: form.preferred_date,
        preferred_time: form.preferred_time,
      }
      const res = await createServiceRequest(payload)
      setSubmitted(res.data)
      toast.success('Service request submitted!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed')
    } finally { setLoading(false) }
  }

  if (submitted) {
    return (
      <div style={{ padding: '32px 28px', maxWidth: 600 }}>
        <div style={{ ...C.card, padding: '36px 32px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#16a34a,#15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 20px', boxShadow: '0 6px 20px rgba(22,163,74,0.3)' }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b', marginBottom: 8 }}>Request Submitted!</h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 1.7 }}>
            Your service request has been submitted successfully.<br />
            The mechanic will review it and schedule an appointment.
          </p>

          <div style={{ background: '#f5f3ff', border: '1px solid #e0e7ff', borderRadius: 12, padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Request Summary</p>
            {[
              ['Status', '⏳ Waiting for Mechanic Review'],
              ['Bike', `${submitted.bike_brand} ${submitted.bike_model}`],
              ['Complaint', submitted.complaint],
              ...(submitted.preferred_date ? [['Preferred Date', submitted.preferred_date]] : []),
              ...(submitted.preferred_time ? [['Preferred Time', submitted.preferred_time]] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #ede9fe' }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#4338ca', textAlign: 'right', maxWidth: 260 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 24, textAlign: 'left' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 6 }}>ℹ What happens next?</p>
            {['Mechanic reviews your request', 'Appointment date & time is scheduled', 'You receive a Tracking ID', 'Check My Appointments for updates'].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#dcfce7', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                <span style={{ fontSize: 12, color: '#374151' }}>{s}</span>
              </div>
            ))}
          </div>

          <button onClick={() => { setSubmitted(null); setForm({ bike_brand: '', bike_model: '', registration_number: '', complaint: '', preferred_date: '', preferred_time: '' }) }}
            style={{ width: '100%', padding: '12px', borderRadius: 11, border: '1px solid #e0e7ff', background: 'transparent', color: '#6366f1', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            + Book Another Service
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 28px', maxWidth: 700 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', borderRadius: 18, padding: '22px 28px', marginBottom: 24, color: '#fff' }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Customer Portal</p>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>🔧 Book a Service</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Fill in your bike details and describe the problem</p>
      </div>

      <div style={{ ...C.card, padding: '28px 28px' }}>
        {/* Customer info banner */}
        <div style={{ background: '#f5f3ff', border: '1px solid #e0e7ff', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>👤</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>{customerData?.name}</p>
            <p style={{ fontSize: 12, color: '#6b7280' }}>{customerData?.phone} · {customerData?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Bike Details */}
          <p style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #e0e7ff', paddingBottom: 8 }}>🏍️ Bike Details</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Bike Brand *" error={errors.bike_brand}>
              <select value={form.bike_brand} onChange={e => set('bike_brand', e.target.value)}
                style={{ ...INP, cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e0e7ff'}>
                <option value="">Select Brand</option>
                {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Bike Model *" error={errors.bike_model}>
              <input value={form.bike_model} onChange={e => set('bike_model', e.target.value)}
                placeholder="e.g. CB300R, Pulsar 150" style={INP}
                onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e0e7ff'} />
            </Field>
            <Field label="Registration Number">
              <input value={form.registration_number} onChange={e => set('registration_number', e.target.value.toUpperCase())}
                placeholder="MH01AB1234" style={{ ...INP, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}
                onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e0e7ff'} />
            </Field>
          </div>

          {/* Complaint */}
          <p style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #e0e7ff', paddingBottom: 8, marginTop: 4 }}>🔧 Complaint</p>
          <Field label="Describe the Problem *" error={errors.complaint}>
            <textarea value={form.complaint} onChange={e => set('complaint', e.target.value)}
              rows={4} placeholder="e.g. Brake making noise when applied, engine not starting..."
              style={{ ...INP, resize: 'vertical', lineHeight: 1.7 }}
              onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e0e7ff'} />
          </Field>

          {/* Preferred Schedule */}
          <p style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #e0e7ff', paddingBottom: 8, marginTop: 4 }}>📅 Preferred Schedule (Optional)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Preferred Date">
              <input type="date" value={form.preferred_date} onChange={e => set('preferred_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]} style={INP}
                onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e0e7ff'} />
            </Field>
            <Field label="Preferred Time">
              <input type="time" value={form.preferred_time} onChange={e => set('preferred_time', e.target.value)}
                style={INP}
                onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e0e7ff'} />
            </Field>
          </div>

          <button type="submit" disabled={loading} style={{
            marginTop: 8, width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: loading ? '#e0e7ff' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
            color: loading ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading ? <><span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #c7d2fe', borderTopColor: '#6366f1', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />Submitting...</> : '📋 Submit Service Request'}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </button>
        </form>
      </div>
    </div>
  )
}
