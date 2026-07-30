import { useEffect, useState, useRef, useCallback } from 'react'
import { getRepairs, getChat, sendChat } from '../../api/orchestratorApi'
import useRealtimeSync from '../../hooks/useRealtimeSync'
import toast from 'react-hot-toast'

const MONO = { fontFamily: 'JetBrains Mono, monospace' }
const CARD = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }

export default function MChat() {
  const [repairs, setRepairs]   = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [unread, setUnread]     = useState({})
  const bottomRef = useRef(null)

  const fetchRepairs = useCallback(() => {
    getRepairs(0, 50).then(r => setRepairs(r.data.records || [])).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchRepairs() }, [fetchRepairs])

  const fetchMessages = useCallback(() => {
    if (!selected) return
    getChat(selected.repair_id)
      .then(r => { setMessages(r.data || []); setUnread(prev => ({ ...prev, [selected.repair_id]: 0 })) })
      .catch(console.error)
  }, [selected])

  useEffect(() => { fetchMessages() }, [fetchMessages])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleEvent = useCallback((evt) => {
    if (evt.event === 'chat_message') {
      const rid = evt.repair_id || evt.data?.repair_id
      if (selected && rid === selected.repair_id) fetchMessages()
      else if (rid) setUnread(prev => ({ ...prev, [rid]: (prev[rid] || 0) + 1 }))
    }
  }, [selected, fetchMessages])
  useRealtimeSync({ repairId: null, onEvent: handleEvent, enabled: true })

  useEffect(() => {
    if (!selected) return
    const t = setInterval(fetchMessages, 3000)
    return () => clearInterval(t)
  }, [selected, fetchMessages])

  const handleSend = async (e) => {
    e.preventDefault()
    const msg = text.trim()
    if (!msg || sending || !selected) return
    setSending(true)
    try { await sendChat(selected.repair_id, 'mechanic', 'Mechanic', msg); setText(''); fetchMessages() }
    catch { toast.error('Failed to send') } finally { setSending(false) }
  }

  return (
    <div style={{ padding: '32px 36px', height: 'calc(100vh - 0px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#3b82f6,#60a5fa)', borderRadius: 2 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Customer Messages</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginLeft: 14 }}>Reply to customer queries about their repairs</p>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Repair list sidebar */}
        <div style={{ ...CARD, width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Repairs</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <p style={{ padding: '20px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>Loading...</p>}
            {!loading && repairs.length === 0 && <p style={{ padding: '20px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>No repairs yet.</p>}
            {repairs.map(r => {
              const isSelected = selected?.repair_id === r.repair_id
              const hasUnread  = (unread[r.repair_id] || 0) > 0
              return (
                <button key={r.repair_id} onClick={() => setSelected(r)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px', background: isSelected ? '#eff6ff' : 'transparent',
                  border: 'none', borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                  borderBottom: '1px solid #f8fafc',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: isSelected ? '#2563eb' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.customer_name}</p>
                      {hasUnread && <span style={{ fontSize: 10, fontWeight: 700, background: '#3b82f6', color: '#fff', borderRadius: 99, padding: '1px 6px', flexShrink: 0 }}>{unread[r.repair_id]}</span>}
                    </div>
                    <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 1, ...MONO }}>#{r.repair_id} · {r.bike_model}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chat area */}
        <div style={{ ...CARD, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#94a3b8' }}>
              <span style={{ fontSize: 48 }}>💬</span>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>Select a repair to view messages</p>
              <p style={{ fontSize: 12 }}>Choose a customer from the list on the left.</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{selected.customer_name}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', ...MONO }}>#{selected.repair_id} · {selected.bike_model}</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                  background: selected.repair_status === 'Completed' ? '#dcfce7' : selected.repair_status === 'In Progress' ? '#dbeafe' : '#f5f3ff',
                  color: selected.repair_status === 'Completed' ? '#16a34a' : selected.repair_status === 'In Progress' ? '#2563eb' : '#7c3aed',
                }}>{selected.repair_status}</span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages.length === 0 && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94a3b8' }}>
                    <span style={{ fontSize: 32 }}>💬</span>
                    <p style={{ fontSize: 13 }}>No messages yet. Start the conversation.</p>
                  </div>
                )}
                {messages.map(m => {
                  const isMechanic = m.sender === 'mechanic'
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMechanic ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '75%', padding: '10px 14px',
                        borderRadius: isMechanic ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isMechanic ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)' : '#f1f5f9',
                        color: isMechanic ? '#fff' : '#0f172a',
                        boxShadow: isMechanic ? '0 2px 8px rgba(59,130,246,0.2)' : 'none',
                      }}>
                        <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>{m.message}</p>
                      </div>
                      <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, paddingLeft: isMechanic ? 0 : 4, paddingRight: isMechanic ? 4 : 0 }}>
                        {m.sender_name} · {new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10 }}>
                <input value={text} onChange={e => setText(e.target.value)} placeholder="Reply to customer..."
                  style={{ flex: 1, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#0f172a', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <button type="submit" disabled={sending || !text.trim()} style={{
                  padding: '10px 18px', borderRadius: 10, border: 'none',
                  background: sending || !text.trim() ? '#e2e8f0' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                  color: sending || !text.trim() ? '#94a3b8' : '#fff',
                  fontWeight: 700, fontSize: 13, cursor: sending || !text.trim() ? 'not-allowed' : 'pointer', flexShrink: 0,
                }}>
                  {sending ? '...' : 'Send →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
