/**
 * CChat.jsx — Customer Chat with Mechanic
 * Real-time chat using WebSocket events + 3s polling fallback.
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getChat, sendChat, getRepairStatus, getCustomerRepairs } from '../../api/orchestratorApi'
import { useAuth } from '../../context/AuthContext'
import useRealtimeSync from '../../hooks/useRealtimeSync'

const C = {
  card: { background: '#fff', border: '1px solid #e0e7ff', borderRadius: 16, boxShadow: '0 2px 12px rgba(99,102,241,0.06)' },
}

export default function CChat() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { customerData } = useAuth()
  const repairIdParam = searchParams.get('repair_id')
  const id = repairIdParam ? parseInt(repairIdParam, 10) : null
  const [repairs, setRepairs] = useState([])
  const [messages, setMessages] = useState([])
  const [repair, setRepair]     = useState(null)
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    getCustomerRepairs().then(r => setRepairs(r.data || [])).catch(console.error)
  }, [])

  const fetchMessages = useCallback(() => {
    getChat(id).then(r => setMessages(r.data || [])).catch(console.error)
  }, [id])

  useEffect(() => {
    if (!id) { setLoading(false); return }
    Promise.all([getRepairStatus(id), getChat(id)])
      .then(([r, c]) => { setRepair(r.data); setMessages(c.data || []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time: refresh chat on chat_message event
  const handleEvent = useCallback((evt) => {
    if (evt.event === 'chat_message' || evt.event === 'poll_update') fetchMessages()
  }, [fetchMessages])

  useRealtimeSync({ repairId: id, onEvent: handleEvent, enabled: !!id })

  // Also poll chat every 3s independently
  useEffect(() => {
    const t = setInterval(fetchMessages, 3000)
    return () => clearInterval(t)
  }, [fetchMessages])

  const handleSend = async (e) => {
    e.preventDefault()
    const msg = text.trim()
    if (!msg || sending) return
    setSending(true)
    try {
      await sendChat(id, 'customer', customerData?.name || repair?.customer_name || 'Customer', msg)
      setText('')
      fetchMessages()
    } catch { } finally { setSending(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e0e7ff', borderTopColor: '#6366f1', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!id) {
    return (
      <div style={{ padding: '28px 28px', maxWidth: 700 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#6366f1,#818cf8)', borderRadius: 2 }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b' }}>Chat with Mechanic</h1>
          </div>
        </div>
        {repairs.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: 16, padding: '48px', textAlign: 'center', boxShadow: '0 2px 12px rgba(99,102,241,0.06)' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>💬</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#4338ca', marginBottom: 8 }}>No Active Repairs</p>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Chat will be available once your repair starts.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Select a repair to chat:</p>
            {repairs.map(r => (
              <button key={r.repair_id} onClick={() => navigate(`/customer/portal/chat?repair_id=${r.repair_id}`)}
                style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: 14, padding: '16px 20px', textAlign: 'left', cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.06)' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>{r.bike_model} <span style={{ fontSize: 10, color: '#a5b4fc', fontFamily: 'JetBrains Mono, monospace' }}>REP{r.repair_id}</span></p>
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{r.repair_status}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 28px', maxWidth: 700, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#6366f1,#818cf8)', borderRadius: 2 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b' }}>Chat with Mechanic</h1>
        </div>
        <p style={{ fontSize: 13, color: '#9ca3af', marginLeft: 14 }}>
          Repair #{repairIdParam} · {repair?.bike_model || ''}
        </p>
      </div>

      {/* Messages */}
      <div style={{ ...C.card, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#c4b5fd' }}>
              <span style={{ fontSize: 40 }}>💬</span>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#a5b4fc' }}>No messages yet</p>
              <p style={{ fontSize: 12, color: '#c4b5fd' }}>Start the conversation with your mechanic.</p>
            </div>
          )}
          {messages.map((m) => {
            const isCustomer = m.sender === 'customer'
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isCustomer ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '75%', padding: '10px 14px', borderRadius: isCustomer ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isCustomer ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#f5f3ff',
                  color: isCustomer ? '#fff' : '#1e1b4b',
                  boxShadow: isCustomer ? '0 2px 8px rgba(99,102,241,0.25)' : '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>{m.message}</p>
                </div>
                <p style={{ fontSize: 10, color: '#c4b5fd', marginTop: 3, paddingLeft: isCustomer ? 0 : 4, paddingRight: isCustomer ? 4 : 0 }}>
                  {m.sender_name} · {new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} style={{ padding: '12px 16px', borderTop: '1px solid #e0e7ff', display: 'flex', gap: 10 }}>
          <input
            value={text} onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1, background: '#f5f3ff', border: '1.5px solid #e0e7ff', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#1e1b4b', outline: 'none', fontFamily: 'Inter, sans-serif' }}
            onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
            onBlur={e => { e.target.style.borderColor = '#e0e7ff'; e.target.style.boxShadow = 'none' }}
          />
          <button type="submit" disabled={sending || !text.trim()} style={{
            padding: '10px 18px', borderRadius: 10, border: 'none',
            background: sending || !text.trim() ? '#e0e7ff' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
            color: sending || !text.trim() ? '#a5b4fc' : '#fff',
            fontWeight: 700, fontSize: 13, cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
            flexShrink: 0,
          }}>
            {sending ? '...' : 'Send →'}
          </button>
        </form>
      </div>
    </div>
  )
}
