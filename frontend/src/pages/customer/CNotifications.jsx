/**
 * CNotifications.jsx — Customer Notifications (Agent 6)
 * Shows all notifications for this repair in real-time.
 */
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getNotifications, getCustomerRepairs } from '../../api/orchestratorApi'
import useRealtimeSync from '../../hooks/useRealtimeSync'

const TYPE_CONFIG = {
  appointment_scheduled: { icon:'📅', label:'Appointment Scheduled', bg:'#eff6ff',  color:'#2563eb', border:'#bfdbfe' },
  diagnosis_complete: { icon:'🔬', label:'Diagnosis Complete', bg:'#eff6ff',  color:'#2563eb', border:'#bfdbfe' },
  repair_started:     { icon:'🔧', label:'Repair Started',     bg:'#fffbeb',  color:'#d97706', border:'#fde68a' },
  repair_completed:   { icon:'✅', label:'Repair Completed',   bg:'#f0fdf4',  color:'#16a34a', border:'#bbf7d0' },
  invoice_ready:      { icon:'🧾', label:'Invoice Ready',      bg:'#f5f3ff',  color:'#7c3aed', border:'#ddd6fe' },
  pickup_ready:       { icon:'🏍️', label:'Ready for Pickup',  bg:'#f0fdfa',  color:'#0d9488', border:'#99f6e4' },
  payment_received:   { icon:'💳', label:'Payment Received',   bg:'#f0fdf4',  color:'#16a34a', border:'#bbf7d0' },
}

export default function CNotifications() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const repairIdParam = searchParams.get('repair_id')
  const id = repairIdParam ? parseInt(repairIdParam, 10) : null
  const [repairs, setRepairs] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    getCustomerRepairs().then(r => setRepairs(r.data || [])).catch(console.error)
  }, [])

  const fetchNotifs = useCallback(() => {
    getNotifications(id)
      .then(r => setNotifications(r.data.notifications || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])

  const handleEvent = useCallback((evt) => {
    if (evt.event === 'poll_update') { fetchNotifs(); return }
    if (evt.stage === 'notification' || evt.stage === 'billing' || evt.stage === 'completed') {
      setLiveCount(c => c + 1)
      fetchNotifs()
    }
  }, [fetchNotifs])

  useRealtimeSync({ repairId: id, onEvent: handleEvent, enabled: true })

  if (!id) {
    return (
      <div style={{ padding:'28px 28px', maxWidth:700 }}>
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <div style={{ width:4, height:24, background:'linear-gradient(180deg,#6366f1,#818cf8)', borderRadius:2 }} />
            <h1 style={{ fontSize:22, fontWeight:800, color:'#1e1b4b' }}>Notifications</h1>
          </div>
        </div>
        {repairs.length === 0 ? (
          <div style={{ background:'#fff', border:'1px solid #e0e7ff', borderRadius:16, padding:'48px', textAlign:'center', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' }}>
            <p style={{ fontSize:36, marginBottom:12 }}>🔔</p>
            <p style={{ fontSize:15, fontWeight:700, color:'#4338ca', marginBottom:8 }}>No Notifications Yet</p>
            <p style={{ fontSize:13, color:'#9ca3af' }}>Notifications will appear here once your repair starts.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <p style={{ fontSize:13, color:'#6b7280', marginBottom:4 }}>Select a repair to view notifications:</p>
            {repairs.map(r => (
              <button key={r.repair_id} onClick={() => navigate(`/customer/portal/notifications?repair_id=${r.repair_id}`)}
                style={{ background:'#fff', border:'1px solid #e0e7ff', borderRadius:14, padding:'16px 20px', textAlign:'left', cursor:'pointer', boxShadow:'0 2px 8px rgba(99,102,241,0.06)' }}>
                <p style={{ fontSize:14, fontWeight:700, color:'#1e1b4b' }}>{r.bike_model} <span style={{ fontSize:10, color:'#a5b4fc', fontFamily:'JetBrains Mono, monospace' }}>REP{r.repair_id}</span></p>
                <p style={{ fontSize:12, color:'#9ca3af', marginTop:3 }}>{r.repair_status}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding:'28px 28px', maxWidth:700 }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <div style={{ width:4, height:24, background:'linear-gradient(180deg,#6366f1,#818cf8)', borderRadius:2 }} />
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1e1b4b' }}>Notifications</h1>
        </div>
      <p style={{ fontSize:13, color:'#9ca3af', marginLeft:14 }}>Real-time updates for Repair #{repairIdParam}</p>
      </div>

      {/* Type summary */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const count = notifications.filter(n => n.notification_type === type).length
          if (count === 0) return null
          return (
            <div key={type} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 12px', borderRadius:10, background:cfg.bg, border:`1px solid ${cfg.border}` }}>
              <span style={{ fontSize:14 }}>{cfg.icon}</span>
              <span style={{ fontSize:11, fontWeight:600, color:cfg.color }}>{cfg.label}</span>
              <span style={{ fontSize:12, fontWeight:800, color:cfg.color, background:'#fff', borderRadius:99, padding:'1px 7px', border:`1px solid ${cfg.border}` }}>{count}</span>
            </div>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
          <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid #e0e7ff', borderTopColor:'#6366f1', animation:'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ background:'#fff', border:'1px solid #e0e7ff', borderRadius:16, padding:'48px', textAlign:'center', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' }}>
          <p style={{ fontSize:36, marginBottom:12 }}>🔔</p>
          <p style={{ fontSize:15, fontWeight:700, color:'#4338ca', marginBottom:8 }}>No Notifications Yet</p>
          <p style={{ fontSize:13, color:'#9ca3af' }}>You'll receive updates as your repair progresses.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {notifications.map((n, i) => {
            const cfg = TYPE_CONFIG[n.notification_type] || { icon:'📢', label:n.notification_type, bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe' }
            return (
              <div key={n.id || i} style={{ background:'#fff', border:`1px solid ${cfg.border}`, borderRadius:14, padding:'16px 20px', boxShadow:'0 2px 8px rgba(99,102,241,0.06)', display:'flex', alignItems:'flex-start', gap:14 }}>
                <div style={{ width:42, height:42, borderRadius:12, background:cfg.bg, border:`1px solid ${cfg.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>{cfg.label}</span>
                    <span style={{ fontSize:11, color:'#9ca3af', fontFamily:'JetBrains Mono, monospace' }}>{n.sent_at ? new Date(n.sent_at).toLocaleString() : ''}</span>
                  </div>
                  <p style={{ fontSize:13, color:'#374151', lineHeight:1.6 }}>{n.message}</p>
                  <div style={{ display:'flex', gap:8, marginTop:6 }}>
                    <span style={{ fontSize:10, color:'#9ca3af' }}>{n.channel}</span>
                    <span style={{ fontSize:10, fontWeight:600, color:n.status==='Sent'?'#16a34a':'#9ca3af' }}>● {n.status}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
