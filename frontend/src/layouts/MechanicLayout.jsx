import { NavLink, useNavigate, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getServiceRequests } from '../api/orchestratorApi'

const M = {
  bg:      '#f8fafc',
  sidebar: '#ffffff',
  border:  '#e2e8f0',
  accent:  '#3b82f6',
  accentL: '#2563eb',
  text:    '#0f172a',
  muted:   '#64748b',
}

const NAV = [
  { to: '/mechanic',                  icon: '⊞',  label: 'Dashboard',        end: true },
  { to: '/mechanic/service-requests', icon: '📋', label: 'Service Requests'        },
  { to: '/mechanic/appointments',     icon: '📅', label: 'Appointments'            },
  { to: '/mechanic/diagnosis',        icon: '◎',  label: 'AI Diagnosis'            },
  { to: '/mechanic/inventory',        icon: '◫',  label: 'Inventory'               },
  { to: '/mechanic/repair',           icon: '🔧', label: 'Repair Status'           },
  { to: '/mechanic/payment',          icon: '💳', label: 'Payment Status'          },
  { to: '/mechanic/messages',         icon: '💬', label: 'Customer Messages'       },
  { to: '/mechanic/history',          icon: '◈',  label: 'History'                 },
  { to: '/mechanic/analytics',        icon: '📊', label: 'Analytics'               },
]

export default function MechanicLayout({ children }) {
  const { isAuthenticated, mechanicName, logout } = useAuth()
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) return
    const load = () => getServiceRequests('pending').then(r => setPendingCount((r.data || []).length)).catch(() => {})
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [isAuthenticated])

  if (!isAuthenticated) return <Navigate to="/mechanic/login" replace />

  const handleLogout = () => { logout(); navigate('/', { replace: true }) }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: M.bg, fontFamily: 'Inter, sans-serif' }}>
      <aside style={{ width: 220, background: M.sidebar, borderRight: `1px solid ${M.border}`, boxShadow: '2px 0 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', flexShrink: 0, minHeight: '100vh' }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${M.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔧</div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 13, color: M.text }}>MechMate <span style={{ color: M.accent }}>AI</span></p>
              <p style={{ fontSize: 9, color: M.muted, marginTop: 1 }}>Mechanic Portal</p>
            </div>
          </div>
        </div>

        {mechanicName && (
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${M.border}`, background: '#eff6ff' }}>
            <p style={{ fontSize: 10, color: M.muted, marginBottom: 1 }}>Logged in as</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: M.accentL }}>{mechanicName}</p>
          </div>
        )}

        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: M.muted, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 8px 8px' }}>Workshop</p>
          {NAV.map(({ to, icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 8px', borderRadius: 8, marginBottom: 1,
                textDecoration: 'none', transition: 'all 0.12s',
                background: isActive ? '#eff6ff' : 'transparent',
                borderLeft: isActive ? `3px solid ${M.accent}` : '3px solid transparent',
              })}
            >
              {({ isActive }) => (
                <>
                  <span style={{ width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: isActive ? M.accent : '#f1f5f9', color: isActive ? '#fff' : M.muted, flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? M.text : M.muted, flex: 1 }}>{label}</span>
                  {to === '/mechanic/service-requests' && pendingCount > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: '#f59e0b', color: '#fff', borderRadius: 99, padding: '1px 6px', minWidth: 16, textAlign: 'center' }}>{pendingCount}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '10px 12px', borderTop: `1px solid ${M.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#eff6ff', border: `1px solid #bfdbfe`, borderRadius: 8, padding: '7px 9px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <div>
              <p style={{ fontSize: 10, color: M.accentL, fontWeight: 600 }}>Orchestrator Online</p>
              <p style={{ fontSize: 9, color: M.muted }}>port 8004</p>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ width: '100%', padding: '7px', borderRadius: 8, border: `1px solid ${M.border}`, background: 'transparent', color: M.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = M.muted; e.currentTarget.style.borderColor = M.border }}
          >
            ⎋ Logout
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {children}
      </main>
    </div>
  )
}
