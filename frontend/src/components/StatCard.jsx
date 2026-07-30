const ACCENTS = {
  violet: { bg: '#ede9fe', border: '#ddd6fe', text: '#7c3aed', icon: '#f5f3ff', shadow: '0 4px 16px rgba(124,58,237,0.15)' },
  indigo: { bg: '#e0e7ff', border: '#c7d2fe', text: '#4338ca', icon: '#eef2ff', shadow: '0 4px 16px rgba(67,56,202,0.15)' },
  green:  { bg: '#dcfce7', border: '#bbf7d0', text: '#16a34a', icon: '#f0fdf4', shadow: '0 4px 16px rgba(22,163,74,0.15)'  },
  amber:  { bg: '#fef3c7', border: '#fde68a', text: '#d97706', icon: '#fffbeb', shadow: '0 4px 16px rgba(217,119,6,0.15)'  },
  red:    { bg: '#fee2e2', border: '#fecaca', text: '#dc2626', icon: '#fef2f2', shadow: '0 4px 16px rgba(220,38,38,0.15)'  },
  blue:   { bg: '#dbeafe', border: '#bfdbfe', text: '#2563eb', icon: '#eff6ff', shadow: '0 4px 16px rgba(37,99,235,0.15)'  },
  teal:   { bg: '#ccfbf1', border: '#99f6e4', text: '#0d9488', icon: '#f0fdfa', shadow: '0 4px 16px rgba(13,148,136,0.15)' },
  pink:   { bg: '#fce7f3', border: '#fbcfe8', text: '#db2777', icon: '#fdf2f8', shadow: '0 4px 16px rgba(219,39,119,0.15)' },
}

export default function StatCard({ icon, label, value, sub, color = 'violet' }) {
  const a = ACCENTS[color] || ACCENTS.violet
  return (
    <div style={{
      background: '#ffffff',
      border: `1px solid ${a.border}`,
      borderRadius: 14,
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      transition: 'box-shadow 0.2s, transform 0.2s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = a.shadow; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none' }}
    >
      <div style={{
        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
        background: a.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>{icon}</div>

      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{value ?? '—'}</p>
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: 500 }}>{label}</p>
        {sub && <p style={{ fontSize: 10, color: a.text, marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  )
}
