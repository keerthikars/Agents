import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'

// Quick-jump to customer dashboard by repair ID
function CustomerPortalLink() {
  const [rid, setRid] = useState('')
  const navigate = useNavigate()
  const go = () => {
    const id = rid.trim()
    if (id) { navigate(`/customer/${id}`); setRid('') }
  }
  return (
    <div style={{ padding: '4px 4px 0' }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          value={rid}
          onChange={e => setRid(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          placeholder="Repair ID..."
          style={{
            flex: 1, background: '#faf9ff', border: '1px solid #ede9fe',
            borderRadius: 7, padding: '5px 8px', fontSize: 11, color: '#4338ca',
            outline: 'none', fontFamily: 'JetBrains Mono, monospace',
          }}
        />
        <button onClick={go} style={{
          padding: '5px 9px', borderRadius: 7, border: 'none',
          background: '#7c3aed', color: '#fff', fontSize: 11,
          fontWeight: 700, cursor: 'pointer',
        }}>→</button>
      </div>
      <p style={{ fontSize: 9, color: '#c4b5fd', marginTop: 4, paddingLeft: 2 }}>Enter repair ID to open customer view</p>
    </div>
  )
}

const NAV = [
  { to: '/',              icon: '⊞',  label: 'Dashboard',       sub: 'Overview' },
  { to: '/workflow',      icon: '⚡',  label: 'Start Workflow',  sub: 'Run agents' },
  { to: '/history',       icon: '◈',  label: 'History',         sub: 'All runs' },
  { to: '/intake',        icon: '◉',  label: 'Customer Intake', sub: 'Agent 1' },
  { to: '/diagnosis',     icon: '◎',  label: 'AI Diagnosis',    sub: 'Agent 2' },
  { to: '/inventory',     icon: '◫',  label: 'Inventory',       sub: 'Agent 3' },
  { to: '/repair',        icon: '◌',  label: 'Repair Status',   sub: 'Agent 5' },
  { to: '/billing',       icon: '◈',  label: 'Billing',         sub: 'Agent 4' },
  { to: '/notifications', icon: '◉',  label: 'Notifications',   sub: 'Agent 6' },
]

const CUSTOMER_NAV = [
  { to: '/customer',      icon: '👤',  label: 'Customer View',   sub: 'Real-time tracker' },
]

const AGENTS = [
  { label: 'Intake',    port: 8000, color: '#7c3aed' },
  { label: 'Diagnosis', port: 8001, color: '#6d28d9' },
  { label: 'Inventory', port: 8002, color: '#8b5cf6' },
  { label: 'Billing',   port: 8003, color: '#a78bfa' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: 240,
      background: '#ffffff',
      borderRight: '1px solid #ede9fe',
      boxShadow: '2px 0 16px rgba(109,40,217,0.06)',
    }} className="min-h-screen flex flex-col flex-shrink-0">

      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #ede9fe' }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
          }}>🏍️</div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 14, color: '#1e1b4b', letterSpacing: '-0.3px' }}>
              MechMate <span style={{ color: '#7c3aed' }}>AI</span>
            </p>
            <p style={{ fontSize: 10, color: '#a78bfa', marginTop: 1, fontWeight: 500 }}>Multi-Agent System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.12em', padding: '4px 10px 8px', textTransform: 'uppercase' }}>
          Navigation
        </p>
        {NAV.map(({ to, icon, label, sub }) => (
          <NavLink key={to} to={to} end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 10, marginBottom: 2,
              textDecoration: 'none', transition: 'all 0.15s',
              background: isActive ? 'linear-gradient(90deg, #ede9fe, #f5f3ff)' : 'transparent',
              borderLeft: isActive ? '3px solid #7c3aed' : '3px solid transparent',
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13,
                  background: isActive ? '#7c3aed' : '#f5f3ff',
                  color: isActive ? '#fff' : '#a78bfa',
                  boxShadow: isActive ? '0 2px 8px rgba(124,58,237,0.3)' : 'none',
                }}>{icon}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontSize: 12.5, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#1e1b4b' : '#6b7280',
                    lineHeight: 1.2,
                  }}>{label}</p>
                  <p style={{ fontSize: 10, color: isActive ? '#7c3aed' : '#c4b5fd' }}>{sub}</p>
                </div>
              </>
            )}
          </NavLink>
        ))}

        {/* Agent status */}
        <div style={{ marginTop: 20, padding: '0 4px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.12em', padding: '4px 6px 8px', textTransform: 'uppercase' }}>
            Customer Portal
          </p>
          <CustomerPortalLink />
        </div>

        {/* Agent status */}
        <div style={{ marginTop: 12, padding: '0 4px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.12em', padding: '4px 6px 8px', textTransform: 'uppercase' }}>
            Agent Services
          </p>
          {AGENTS.map(a => (
            <div key={a.port} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '5px 8px', borderRadius: 8, marginBottom: 2,
              background: '#faf9ff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.color }} />
                <span style={{ fontSize: 11, color: '#6b7280' }}>{a.label}</span>
              </div>
              <span style={{ fontSize: 10, color: '#c4b5fd', fontFamily: 'JetBrains Mono, monospace' }}>:{a.port}</span>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #ede9fe' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(90deg, #ede9fe, #f5f3ff)',
          border: '1px solid #ddd6fe',
          borderRadius: 10, padding: '8px 10px',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', flexShrink: 0, boxShadow: '0 0 6px rgba(124,58,237,0.5)' }} />
          <div>
            <p style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>Orchestrator Online</p>
            <p style={{ fontSize: 9, color: '#a78bfa' }}>port 8004</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
