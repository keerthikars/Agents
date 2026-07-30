import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { mechanicLogin } from '../api/orchestratorApi'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function MechanicLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPw, setShowPw]     = useState(false)
  const [focusU, setFocusU]     = useState(false)
  const [focusP, setFocusP]     = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) { toast.error('Enter username and password'); return }
    setLoading(true)
    try {
      const res = await mechanicLogin(username.trim(), password)
      login(res.data.access_token, res.data.mechanic_name)
      toast.success(`Welcome, ${res.data.mechanic_name || username}!`)
      navigate('/mechanic', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally { setLoading(false) }
  }

  const inp = (focused) => ({
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    background: focused ? '#fff' : '#f8fafc',
    color: '#0f172a',
    border: `1.5px solid ${focused ? '#3b82f6' : '#e2e8f0'}`,
    outline: 'none', transition: 'all 0.15s', boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    boxShadow: focused ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Left panel ── */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg,#1d4ed8 0%,#3b82f6 50%,#0ea5e9 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, minHeight: '100vh' }}
        className="hidden-mobile">
        <div style={{ maxWidth: 380, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 22, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, margin: '0 auto 28px', border: '1px solid rgba(255,255,255,0.2)' }}>🔧</div>
          <h2 style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', marginBottom: 12 }}>Mechanic Portal</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 40 }}>
            Manage your workshop with AI-powered diagnosis, smart inventory, and real-time repair tracking.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['AI Diagnosis & Fault Detection', 'Smart Inventory Management', 'Real-time Repair Tracking', 'Automated Billing & Invoicing'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(4px)' }}>
                <span style={{ fontSize: 14, color: '#bfdbfe' }}>✓</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.06)' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', textDecoration: 'none', marginBottom: 36, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
            ← Back to Home
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔧</div>
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>MechMate AI</p>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Mechanic Login</h1>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Sign in to access your workshop dashboard</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)}
                onFocus={() => setFocusU(true)} onBlur={() => setFocusU(false)}
                placeholder="mechanic" autoComplete="username"
                style={inp(focusU)} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusP(true)} onBlur={() => setFocusP(false)}
                  placeholder="••••••••" autoComplete="current-password"
                  style={{ ...inp(focusP), paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#94a3b8', padding: 0 }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              marginTop: 4, width: '100%', padding: '13px', borderRadius: 12, border: 'none',
              background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
              color: loading ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(59,130,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}>
              {loading ? (
                <><span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #cbd5e1', borderTopColor: '#3b82f6', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />Signing in...</>
              ) : '🔑 Sign In'}
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </button>
          </form>

          {/* Credentials hint */}
          <div style={{ marginTop: 24, padding: '14px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', marginBottom: 5 }}>🔑 Default Credentials</p>
            <p style={{ fontSize: 12, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.7 }}>
              Username: mechanic<br />Password: mechmate123
            </p>
          </div>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#94a3b8' }}>
            Customer?{' '}
            <Link to="/customer/login" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Track your bike →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
