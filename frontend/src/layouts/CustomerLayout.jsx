import { NavLink, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const C = {
  bg:      '#f0f4ff',
  sidebar: '#ffffff',
  border:  '#e0e7ff',
  accent:  '#4f46e5',
  text:    '#1e1b4b',
  muted:   '#6b7280',
}

const NAV = [
  { to: '',               icon: '⊞',  label: 'Dashboard'          },
  { to: '/book-service',  icon: '🔧', label: 'Book Service'        },
  { to: '/appointments',  icon: '📅', label: 'My Appointments'     },
  { to: '/track',         icon: '📍', label: 'Track Repair'        },
  { to: '/billing',       icon: '🧾', label: 'Billing & Invoice'   },
  { to: '/notifications', icon: '🔔', label: 'Notifications'       },
  { to: '/chat',          icon: '💬', label: 'Chat with Mechanic'  },
  { to: '/profile',       icon: '👤', label: 'Profile'             },
]

function CustomerSidebar() {
  const { customerData, customerLogout } = useAuth()
  const navigate = useNavigate()
  const base = '/customer/portal'

  const handleLogout = () => {
    customerLogout()
    navigate('/customer/login', { replace: true })
  }

  return (
    <aside style={{ width: 215, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, minHeight: '100vh' }}>
      {/* Logo */}
      <div style={{ padding: '16px 14px 12px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🏍️</div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 12.5, color: C.text }}>MechMate <span style={{ color: C.accent }}>AI</span></p>
            <p style={{ fontSize: 9, color: '#a5b4fc', marginTop: 1 }}>Customer Portal</p>
          </div>
        </div>
      </div>

      {/* Customer badge */}
      {customerData && (
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}`, background: '#f5f3ff' }}>
          <p style={{ fontSize: 9, color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Logged in as</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{customerData.name}</p>
          <p style={{ fontSize: 10, color: C.muted }}>{customerData.phone}</p>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {NAV.map(({ to, icon, label }) => {
          const fullTo = base + to
          return (
            <NavLink key={to} to={fullTo} end={to === ''}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 9px', borderRadius: 9, marginBottom: 2,
                textDecoration: 'none', transition: 'all 0.12s',
                background: isActive ? '#eef2ff' : 'transparent',
                borderLeft: isActive ? `3px solid ${C.accent}` : '3px solid transparent',
              })}
            >
              {({ isActive }) => (
                <>
                  <span style={{ width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: isActive ? C.accent : '#f5f3ff', color: isActive ? '#fff' : '#a5b4fc', flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? C.text : C.muted }}>{label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}` }}>
        <button onClick={handleLogout}
          style={{ width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border }}>
          ⎋ Logout
        </button>
      </div>
    </aside>
  )
}

export default function CustomerLayout({ children }) {
  const { isCustomerAuthenticated } = useAuth()

  if (!isCustomerAuthenticated) return <Navigate to="/customer/login" replace />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: 'Inter, sans-serif' }}>
      <CustomerSidebar />
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {children}
      </main>
    </div>
  )
}
