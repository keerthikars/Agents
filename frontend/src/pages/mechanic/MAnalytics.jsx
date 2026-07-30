import { useEffect, useState } from 'react'
import { getDashboardStats, getRepairs } from '../../api/orchestratorApi'

const MONO = { fontFamily:'JetBrains Mono, monospace' }

function StatBox({ label, value, color, bg, border }) {
  return (
    <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:14, padding:'20px 22px' }}>
      <p style={{ fontSize:28, fontWeight:800, color, lineHeight:1 }}>{value ?? '—'}</p>
      <p style={{ fontSize:12, color:'#64748b', marginTop:6, fontWeight:500 }}>{label}</p>
    </div>
  )
}

function SimpleBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:12, color:'#64748b' }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color, ...MONO }}>{value}</span>
      </div>
      <div style={{ background:'#f1f5f9', borderRadius:99, height:8, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', borderRadius:99, background:color, transition:'width 0.6s' }} />
      </div>
    </div>
  )
}

export default function MAnalytics() {
  const [stats, setStats]   = useState(null)
  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDashboardStats(), getRepairs(0, 100)])
      .then(([s, r]) => { setStats(s.data); setRepairs(r.data.records || []) })
      .catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid #e2e8f0', borderTopColor:'#3b82f6', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const severityCounts = repairs.reduce((a, r) => { if (r.severity) a[r.severity] = (a[r.severity]||0)+1; return a }, {})
  const priorityCounts = repairs.reduce((a, r) => { if (r.priority) a[r.priority] = (a[r.priority]||0)+1; return a }, {})
  const paymentMethods = repairs.filter(r => r.payment_method).reduce((a, r) => { a[r.payment_method] = (a[r.payment_method]||0)+1; return a }, {})
  const completionRate = stats?.total_repairs > 0 ? Math.round((stats.completed_repairs / stats.total_repairs) * 100) : 0
  const avgRevenue     = stats?.completed_repairs > 0 ? (stats.total_revenue / stats.completed_repairs).toFixed(0) : 0

  return (
    <div style={{ padding:'32px 36px', maxWidth:1200 }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <div style={{ width:4, height:24, background:'linear-gradient(180deg,#3b82f6,#60a5fa)', borderRadius:2 }} />
          <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>Analytics</h1>
        </div>
        <p style={{ fontSize:13, color:'#64748b', marginLeft:14 }}>Workshop performance overview</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <StatBox label="Total Repairs"      value={stats?.total_repairs}                         color="#0f172a" bg="#f8fafc" border="#e2e8f0" />
        <StatBox label="Completion Rate"    value={`${completionRate}%`}                         color="#16a34a" bg="#f0fdf4" border="#bbf7d0" />
        <StatBox label="Total Revenue"      value={`₹${stats?.total_revenue?.toFixed(0) ?? 0}`} color="#2563eb" bg="#eff6ff" border="#bfdbfe" />
        <StatBox label="Avg Revenue/Repair" value={`₹${avgRevenue}`}                            color="#7c3aed" bg="#faf5ff" border="#ddd6fe" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:18 }}>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'20px 22px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:18 }}>Repair Status</p>
          <SimpleBar label="Pending"     value={stats?.pending_repairs || 0}     max={stats?.total_repairs || 1} color="#7c3aed" />
          <SimpleBar label="In Progress" value={stats?.in_progress_repairs || 0} max={stats?.total_repairs || 1} color="#3b82f6" />
          <SimpleBar label="Completed"   value={stats?.completed_repairs || 0}   max={stats?.total_repairs || 1} color="#16a34a" />
        </div>

        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'20px 22px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:18 }}>Severity Breakdown</p>
          {[['Critical','#dc2626'],['High','#ea580c'],['Medium','#d97706'],['Low','#16a34a']].map(([sev, color]) => (
            <SimpleBar key={sev} label={sev} value={severityCounts[sev]||0} max={repairs.length||1} color={color} />
          ))}
        </div>

        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'20px 22px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:18 }}>Payment Methods</p>
          {Object.entries(paymentMethods).length === 0
            ? <p style={{ fontSize:12, color:'#94a3b8' }}>No payments yet.</p>
            : Object.entries(paymentMethods).map(([method, count]) => (
                <SimpleBar key={method} label={method} value={count} max={repairs.filter(r=>r.payment_method).length||1} color="#3b82f6" />
              ))
          }
          <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid #f1f5f9' }}>
            {[['Invoices Generated', stats?.invoices_generated || 0, '#0f172a'],
              ['Pending Payments', stats?.pending_payments || 0, '#d97706'],
              ['Low Stock Items', stats?.low_stock_count || 0, '#dc2626'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:12, color:'#64748b' }}>{label}</span>
                <span style={{ fontSize:12, fontWeight:700, color, ...MONO }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'20px 22px', marginTop:18, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:16 }}>Priority Distribution</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[['High','#dc2626','#fff5f5','#fecaca'],['Medium','#d97706','#fffbeb','#fde68a'],['Low','#16a34a','#f0fdf4','#bbf7d0']].map(([p, color, bg, border]) => (
            <div key={p} style={{ background:bg, border:`1px solid ${border}`, borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
              <p style={{ fontSize:28, fontWeight:800, color }}>{priorityCounts[p]||0}</p>
              <p style={{ fontSize:11, color:'#64748b', marginTop:4 }}>{p} Priority</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
