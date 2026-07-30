/**
 * CProfile.jsx — Customer Profile & Support
 * Shows repair info, contact details, and support options.
 */
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getCustomerRepairs, getCustomerAppointments } from '../../api/orchestratorApi'

const C = {
  card: { background:'#fff', border:'1px solid #e0e7ff', borderRadius:16, padding:'22px 24px', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' },
}

export default function CProfile() {
  const { customerData } = useAuth()
  const [repairs, setRepairs] = useState([])
  const [appts, setAppts]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getCustomerRepairs().then(r => setRepairs(r.data || [])).catch(console.error),
      getCustomerAppointments().then(r => setAppts(r.data || [])).catch(console.error),
    ]).finally(() => setLoading(false))
  }, [])

  const latestRepair = repairs[0]
  const latestAppt   = appts[0]

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #e0e7ff', borderTopColor:'#6366f1', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding:'28px 28px', maxWidth:700 }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <div style={{ width:4, height:24, background:'linear-gradient(180deg,#6366f1,#818cf8)', borderRadius:2 }} />
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1e1b4b' }}>Profile</h1>
        </div>
        <p style={{ fontSize:13, color:'#9ca3af', marginLeft:14 }}>Your account and service information</p>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Customer info */}
        <div style={C.card}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18 }}>
            <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(135deg,#6366f1,#4f46e5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>👤</div>
            <div>
              <p style={{ fontSize:17, fontWeight:800, color:'#1e1b4b' }}>{customerData?.name}</p>
              <p style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>Customer Account</p>
            </div>
          </div>
          {[['Phone', customerData?.phone || '—'], ['Email', customerData?.email || '—'], ['Total Repairs', repairs.length], ['Total Appointments', appts.length]].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f5f3ff' }}>
              <span style={{ fontSize:12, color:'#9ca3af' }}>{k}</span>
              <span style={{ fontSize:12, fontWeight:500, color:'#1e1b4b' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Latest repair */}
        {latestRepair && (
          <div style={C.card}>
            <p style={{ fontSize:13, fontWeight:700, color:'#4338ca', marginBottom:12 }}>🔧 Latest Repair</p>
            {[['Bike', latestRepair.bike_model], ['Status', latestRepair.repair_status], ['Invoice', latestRepair.invoice_id || '—'], ['Amount', latestRepair.grand_total ? `₹${latestRepair.grand_total.toFixed(2)}` : '—']].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f5f3ff' }}>
                <span style={{ fontSize:12, color:'#9ca3af' }}>{k}</span>
                <span style={{ fontSize:12, fontWeight:500, color:'#1e1b4b' }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Support */}
        <div style={C.card}>
          <p style={{ fontSize:13, fontWeight:700, color:'#4338ca', marginBottom:14 }}>🛠 Support</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[['📞 Call Workshop','tel:+911234567890','#eff6ff','#2563eb','#bfdbfe'],['📧 Email Support','mailto:support@mechmate.ai','#f5f3ff','#7c3aed','#ddd6fe'],['💬 WhatsApp','https://wa.me/911234567890','#f0fdf4','#16a34a','#bbf7d0']].map(([label,href,bg,color,border]) => (
              <a key={label} href={href} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:10, background:bg, border:`1px solid ${border}`, textDecoration:'none', color, fontSize:13, fontWeight:600 }}>
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Workshop info */}
        <div style={C.card}>
          <p style={{ fontSize:13, fontWeight:700, color:'#4338ca', marginBottom:14 }}>🏪 Workshop Info</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[['Name','MechMate AI Workshop'],['Address','123 Workshop Lane, Auto Nagar'],['Hours','Mon–Sat: 9AM – 7PM'],['Phone','+91 12345 67890']].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f5f3ff' }}>
                <span style={{ fontSize:12, color:'#9ca3af' }}>{k}</span>
                <span style={{ fontSize:12, fontWeight:500, color:'#1e1b4b' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
