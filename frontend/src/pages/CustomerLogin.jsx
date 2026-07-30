import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { customerRegister, customerAuthLogin } from '../api/orchestratorApi'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function CustomerLogin() {
  const [tab, setTab]       = useState('login')
  const [loading, setLoading] = useState(false)
  const { customerLogin, isCustomerAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isCustomerAuthenticated) navigate('/customer/portal', { replace: true })
  }, [isCustomerAuthenticated, navigate])

  const [lForm, setLForm]   = useState({ phone: '', password: '' })
  const [lFocus, setLFocus] = useState({})
  const [lErr, setLErr]     = useState({})

  const [rForm, setRForm]   = useState({ name: '', phone: '', email: '', password: '', confirm: '' })
  const [rFocus, setRFocus] = useState({})
  const [rErr, setRErr]     = useState({})
  const [showPw, setShowPw] = useState(false)

  const inp = (focused, error) => ({
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    background: focused ? '#fff' : '#f8fafc',
    color: '#0f172a',
    border: `1.5px solid ${error ? '#fca5a5' : focused ? '#7c3aed' : '#e2e8f0'}`,
    outline: 'none', transition: 'all 0.15s', boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    boxShadow: focused ? '0 0 0 3px rgba(124,58,237,0.1)' : error ? '0 0 0 3px rgba(239,68,68,0.08)' : 'none',
  })

  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }

  const handleLogin = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!lForm.phone.trim()) errs.phone = true
    if (!lForm.password.trim()) errs.password = true
    if (Object.keys(errs).length) { setLErr(errs); return }
    setLoading(true)
    try {
      const res = await customerAuthLogin(lForm.phone.trim(), lForm.password)
      const d = res.data
      customerLogin(d.access_token, { id: d.customer_id, name: d.customer_name, phone: d.phone, email: d.email })
      toast.success(`Welcome back, ${d.customer_name}!`)
      navigate('/customer/portal', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally { setLoading(false) }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!rForm.name.trim()) errs.name = true
    if (!rForm.phone.trim()) errs.phone = true
    if (!rForm.email.trim()) errs.email = true
    if (!rForm.password || rForm.password.length < 6) errs.password = true
    if (rForm.password !== rForm.confirm) errs.confirm = true
    if (Object.keys(errs).length) { setRErr(errs); toast.error('Please fix the errors'); return }
    setLoading(true)
    try {
      const res = await customerRegister({ name: rForm.name.trim(), phone: rForm.phone.trim(), email: rForm.email.trim(), password: rForm.password })
      const d = res.data
      customerLogin(d.access_token, { id: d.customer_id, name: d.customer_name, phone: d.phone, email: d.email })
      toast.success(`Account created! Welcome, ${d.customer_name}!`)
      navigate('/customer/portal', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Left panel ── */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#9333ea 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, minHeight: '100vh' }}>
        <div style={{ maxWidth: 380, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 22, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, margin: '0 auto 28px', border: '1px solid rgba(255,255,255,0.2)' }}>🏍️</div>
          <h2 style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', marginBottom: 12 }}>Customer Portal</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 40 }}>
            Book your bike service, track repairs in real-time, and stay connected with your mechanic.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Book Service Online', 'Live Repair Progress Tracking', 'Digital Invoice & Payments', 'Chat with Your Mechanic'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(4px)' }}>
                <span style={{ fontSize: 14, color: '#c4b5fd' }}>✓</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.06)', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', textDecoration: 'none', marginBottom: 32, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#7c3aed'}
            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
            ← Back to Home
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏍️</div>
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>MechMate AI</p>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Customer Portal</h1>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Sign in or create an account to get started</p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: '#f1f5f9', borderRadius: 11, padding: 4 }}>
            {[['login', '🔑 Sign In'], ['register', '📝 Register']].map(([key, label]) => (
              <button key={key} onClick={() => { setTab(key); setLErr({}); setRErr({}) }}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  background: tab === key ? '#fff' : 'transparent',
                  color: tab === key ? '#7c3aed' : '#94a3b8',
                  boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}>{label}</button>
            ))}
          </div>

          {/* ── LOGIN ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={lbl}>Mobile Number</label>
                <input value={lForm.phone} onChange={e => { setLForm(f => ({ ...f, phone: e.target.value })); setLErr(p => ({ ...p, phone: false })) }}
                  onFocus={() => setLFocus(p => ({ ...p, phone: true }))} onBlur={() => setLFocus(p => ({ ...p, phone: false }))}
                  placeholder="9876543210" style={inp(lFocus.phone, lErr.phone)} />
                {lErr.phone && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Required</p>}
              </div>
              <div>
                <label style={lbl}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={lForm.password}
                    onChange={e => { setLForm(f => ({ ...f, password: e.target.value })); setLErr(p => ({ ...p, password: false })) }}
                    onFocus={() => setLFocus(p => ({ ...p, password: true }))} onBlur={() => setLFocus(p => ({ ...p, password: false }))}
                    placeholder="••••••••" style={{ ...inp(lFocus.password, lErr.password), paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#94a3b8', padding: 0 }}>
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
                {lErr.password && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Required</p>}
              </div>
              <button type="submit" disabled={loading} style={{
                marginTop: 4, width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                color: loading ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(124,58,237,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {loading ? <><span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #ddd6fe', borderTopColor: '#7c3aed', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />Signing in...</> : '🔑 Sign In'}
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </button>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                No account?{' '}
                <button type="button" onClick={() => setTab('register')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 }}>Register here →</button>
              </p>
            </form>
          )}

          {/* ── REGISTER ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[['name', 'Full Name', 'text', 'John Doe'], ['phone', 'Mobile Number', 'tel', '9876543210'], ['email', 'Email Address', 'email', 'john@example.com']].map(([key, label, type, ph]) => (
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <input type={type} value={rForm[key]}
                    onChange={e => { setRForm(f => ({ ...f, [key]: e.target.value })); setRErr(p => ({ ...p, [key]: false })) }}
                    onFocus={() => setRFocus(p => ({ ...p, [key]: true }))} onBlur={() => setRFocus(p => ({ ...p, [key]: false }))}
                    placeholder={ph} style={inp(rFocus[key], rErr[key])} />
                  {rErr[key] && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Required</p>}
                </div>
              ))}
              <div>
                <label style={lbl}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={rForm.password}
                    onChange={e => { setRForm(f => ({ ...f, password: e.target.value })); setRErr(p => ({ ...p, password: false })) }}
                    onFocus={() => setRFocus(p => ({ ...p, password: true }))} onBlur={() => setRFocus(p => ({ ...p, password: false }))}
                    placeholder="Min 6 characters" style={{ ...inp(rFocus.password, rErr.password), paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#94a3b8', padding: 0 }}>
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
                {rErr.password && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Min 6 characters</p>}
              </div>
              <div>
                <label style={lbl}>Confirm Password</label>
                <input type="password" value={rForm.confirm}
                  onChange={e => { setRForm(f => ({ ...f, confirm: e.target.value })); setRErr(p => ({ ...p, confirm: false })) }}
                  onFocus={() => setRFocus(p => ({ ...p, confirm: true }))} onBlur={() => setRFocus(p => ({ ...p, confirm: false }))}
                  placeholder="Re-enter password" style={inp(rFocus.confirm, rErr.confirm)} />
                {rErr.confirm && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Passwords do not match</p>}
              </div>
              <button type="submit" disabled={loading} style={{
                marginTop: 4, width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                color: loading ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(124,58,237,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {loading ? <><span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #ddd6fe', borderTopColor: '#7c3aed', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />Creating account...</> : '📝 Create Account'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                Already have an account?{' '}
                <button type="button" onClick={() => setTab('login')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 }}>Sign in →</button>
              </p>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: '#94a3b8' }}>
            Mechanic?{' '}
            <Link to="/mechanic/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>Login here →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
