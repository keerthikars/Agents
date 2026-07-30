import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'

const FEATURES = [
  { icon: '🤖', title: 'AI-Powered Diagnosis', desc: 'Multi-agent system auto-diagnoses faults with confidence scoring' },
  { icon: '📅', title: 'Smart Scheduling', desc: 'Seamless appointment booking with real-time availability' },
  { icon: '📦', title: 'Inventory Intelligence', desc: 'Auto-reserve parts and get low-stock alerts instantly' },
  { icon: '💬', title: 'Live Chat', desc: 'Real-time messaging between customer and mechanic' },
  { icon: '💳', title: 'Digital Billing', desc: 'Auto-generated invoices with UPI, Card & Cash support' },
  { icon: '🔔', title: 'Smart Notifications', desc: 'Every repair milestone triggers instant customer alerts' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isCustomerAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) navigate('/mechanic', { replace: true })
    else if (isCustomerAuthenticated) navigate('/customer/portal', { replace: true })
  }, [isAuthenticated, isCustomerAuthenticated, navigate])

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(248,250,252,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0', padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏍️</div>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>MechMate <span style={{ color: '#7c3aed' }}>AI</span></span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/mechanic/login')} style={{ padding: '8px 18px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
            Mechanic Login
          </button>
          <button onClick={() => navigate('/customer/login')} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 10px rgba(124,58,237,0.3)' }}>
            Customer Portal
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: '80px 40px 60px', textAlign: 'center', maxWidth: 860, margin: '0 auto' }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 99, padding: '5px 14px', marginBottom: 28 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed' }}>6 AI Agents · Real-Time Sync · Multi-Portal</span>
        </div>

        {/* Logo */}
        <div style={{ width: 88, height: 88, borderRadius: 24, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, margin: '0 auto 28px', boxShadow: '0 12px 40px rgba(124,58,237,0.25)' }}>🏍️</div>

        <h1 style={{ fontSize: 52, fontWeight: 900, color: '#0f172a', letterSpacing: '-2px', lineHeight: 1.1, marginBottom: 18 }}>
          MechMate <span style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span>
        </h1>
        <p style={{ fontSize: 18, color: '#64748b', lineHeight: 1.7, marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' }}>
          AI-Powered Multi-Agent Bike Repair Management System.<br />
          From booking to billing — fully automated.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
          <button onClick={() => navigate('/customer/login')} style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 6px 24px rgba(124,58,237,0.35)', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(124,58,237,0.45)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(124,58,237,0.35)' }}>
            🏍️ Book a Service
          </button>
          <button onClick={() => navigate('/mechanic/login')} style={{ padding: '14px 32px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#2563eb' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#374151' }}>
            🔧 Mechanic Login
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 0, justifyContent: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 0', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', maxWidth: 600, margin: '0 auto' }}>
          {[['6', 'AI Agents'], ['Real-Time', 'Sync'], ['Full', 'Automation'], ['Multi', 'Portal']].map(([val, label], i, arr) => (
            <div key={label} style={{ flex: 1, textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none', padding: '0 20px' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed', lineHeight: 1 }}>{val}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: 500 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Portal Cards ── */}
      <section style={{ padding: '20px 40px 60px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Mechanic Card */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '36px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', transition: 'all 0.2s', cursor: 'default' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(59,130,246,0.12)'; e.currentTarget.style.borderColor = '#bfdbfe' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#e2e8f0' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20, boxShadow: '0 6px 20px rgba(59,130,246,0.25)' }}>🔧</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Mechanic Portal</h2>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>
              Manage customer repairs, run AI diagnosis, track inventory, update repair status, and monitor payments — all in one dashboard.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['AI Diagnosis & Inventory', 'Appointment Scheduling', 'Real-time Repair Tracking', 'Payment Monitoring'].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#2563eb', flexShrink: 0 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate('/mechanic/login')} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px rgba(59,130,246,0.3)' }}>
              🔑 Login as Mechanic
            </button>
          </div>

          {/* Customer Card */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '36px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', transition: 'all 0.2s', cursor: 'default' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(124,58,237,0.12)'; e.currentTarget.style.borderColor = '#ddd6fe' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#e2e8f0' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20, boxShadow: '0 6px 20px rgba(124,58,237,0.25)' }}>👤</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Customer Portal</h2>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>
              Book your bike service, track repair progress in real-time, view invoices, make payments, and chat directly with your mechanic.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Book Service Online', 'Live Repair Tracking', 'Digital Invoice & Payment', 'Chat with Mechanic'].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#7c3aed', flexShrink: 0 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate('/customer/login')} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
              🏍️ Customer Login / Register
            </button>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section style={{ padding: '20px 40px 60px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Powered by AI</p>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Everything your workshop needs</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 16, padding: '22px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#ddd6fe'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{title}</p>
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid #f1f5f9', padding: '24px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#cbd5e1' }}>
          MechMate AI · Powered by 6 AI Agents · FastAPI + React · Built for modern workshops
        </p>
      </footer>
    </div>
  )
}
