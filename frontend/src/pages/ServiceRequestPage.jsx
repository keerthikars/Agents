/**
 * ServiceRequestPage.jsx — Public page for new customers to register a service request.
 * No login required. On success shows tracking ID and instructions.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createServiceRequest } from '../api/orchestratorApi'
import toast from 'react-hot-toast'

const BRANDS = ['Honda', 'Yamaha', 'Bajaj', 'TVS', 'Hero', 'Royal Enfield', 'Suzuki', 'KTM', 'Kawasaki', 'Other']

export default function ServiceRequestPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    customer_name: '', phone: '', email: '', address: '',
    bike_brand: '', bike_model: '', registration_number: '', complaint: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(null)  // { tracking_id, customer_name }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const inp = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 13,
    background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)',
    color: '#e2e8f0', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }
  const lbl = {
    display: 'block', fontSize: 11, fontWeight: 600, color: '#a78bfa',
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em',
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customer_name || !form.phone || !form.bike_brand || !form.bike_model || !form.complaint) {
      toast.error('Please fill all required fields')
      return
    }
    setLoading(true)
    try {
      await createServiceRequest(form)
      setSubmitted({ customer_name: form.customer_name, phone: form.phone })
      toast.success('Service request submitted!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f0c29,#1e1b4b,#24243e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '40px 36px', backdropFilter: 'blur(12px)', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#16a34a,#15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 20px', boxShadow: '0 6px 20px rgba(22,163,74,0.4)' }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Request Submitted!</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 28, lineHeight: 1.7 }}>
              Hi <strong style={{ color: '#a78bfa' }}>{submitted.customer_name}</strong>, your service request has been received.<br />
              The mechanic will review it and schedule an appointment.<br />
              You'll receive a <strong style={{ color: '#a78bfa' }}>Tracking ID</strong> once the appointment is confirmed.
            </p>

            <div style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12, padding: '16px 20px', marginBottom: 28, textAlign: 'left' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 8 }}>ℹ What happens next?</p>
              {['Mechanic reviews your request', 'Appointment date & time is scheduled', 'You receive a Tracking ID via notification', 'Use Tracking ID to access your Customer Portal'].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.2)', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{s}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => navigate('/customer/login')} style={{ width: '100%', padding: '12px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                🔍 Track My Bike
              </button>
              <button onClick={() => { setSubmitted(null); setForm({ customer_name: '', phone: '', email: '', address: '', bike_brand: '', bike_model: '', registration_number: '', complaint: '' }) }} style={{ width: '100%', padding: '12px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Submit Another Request
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f0c29,#1e1b4b,#24243e)', fontFamily: 'Inter, sans-serif', padding: '32px 24px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', marginBottom: 28 }}>
          ← Back to Home
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px', boxShadow: '0 6px 20px rgba(124,58,237,0.4)' }}>🏍️</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Register Service Request</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Fill in your details and we'll schedule an appointment for you</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '32px 28px', backdropFilter: 'blur(12px)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Customer Details */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
                👤 Customer Details
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>Full Name *</label>
                  <input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="John Doe" style={inp}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                </div>
                <div>
                  <label style={lbl}>Mobile Number *</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="9876543210" style={inp}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                </div>
                <div>
                  <label style={lbl}>Email (Optional)</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" style={inp}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                </div>
                <div>
                  <label style={lbl}>Address (Optional)</label>
                  <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" style={inp}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                </div>
              </div>
            </div>

            {/* Bike Details */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
                🏍️ Bike Details
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>Bike Brand *</label>
                  <select value={form.bike_brand} onChange={e => set('bike_brand', e.target.value)}
                    style={{ ...inp, cursor: 'pointer' }}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}>
                    <option value="">Select Brand</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Bike Model *</label>
                  <input value={form.bike_model} onChange={e => set('bike_model', e.target.value)} placeholder="e.g. CB300R, Pulsar 150" style={inp}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Registration Number (Optional)</label>
                  <input value={form.registration_number} onChange={e => set('registration_number', e.target.value.toUpperCase())} placeholder="MH01AB1234" style={{ ...inp, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                </div>
              </div>
            </div>

            {/* Complaint */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
                🔧 Complaint
              </p>
              <label style={lbl}>Describe the Problem *</label>
              <textarea value={form.complaint} onChange={e => set('complaint', e.target.value)}
                rows={4} placeholder="e.g. Brake making noise when applied, engine not starting, oil leaking..."
                style={{ ...inp, resize: 'vertical', lineHeight: 1.7 }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
            </div>

            <button type="submit" disabled={loading} style={{
              marginTop: 4, width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: loading ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              color: loading ? '#64748b' : '#fff', fontWeight: 700, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(124,58,237,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? (
                <><span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #3b0764', borderTopColor: '#a78bfa', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />Submitting...</>
              ) : '📋 Submit Service Request'}
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          Already have a Tracking ID?{' '}
          <Link to="/customer/login" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>Track your bike →</Link>
        </p>
      </div>
    </div>
  )
}
