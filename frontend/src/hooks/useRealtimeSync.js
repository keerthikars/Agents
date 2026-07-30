/**
 * useRealtimeSync.js
 *
 * Real-time sync hook for the Customer Dashboard.
 *
 * Strategy:
 *   1. Open WebSocket to ws://localhost:8004/ws
 *   2. Filter incoming events by repairId → call onEvent(evt)
 *   3. If WS fails → fall back to polling GET /api/repairs/:id/status every 5 s
 *   4. Auto-reconnect WS after 3 s on unexpected close
 */

import { useEffect, useRef, useCallback } from 'react'

const WS_URL = `ws://${window.location.hostname}:8004/ws`
const POLL_MS = 5000
const RECONNECT_MS = 3000

export default function useRealtimeSync({ repairId, onEvent, enabled = true }) {
  const wsRef        = useRef(null)
  const pollRef      = useRef(null)
  const reconnectRef = useRef(null)
  const isPolling    = useRef(false)
  const failCount    = useRef(0)

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    failCount.current = 0
  }, [])

  const startPoll = useCallback(() => {
    if (pollRef.current || !repairId) return  // no polling when repairId is null (mechanic)
    isPolling.current = true
    pollRef.current = setInterval(async () => {
      // Back off after 3 consecutive failures — stop polling until WS reconnects
      if (failCount.current >= 3) return
      try {
        const res = await fetch(`/api/repairs/${repairId}/status`)
        if (!res.ok) { failCount.current++; return }
        failCount.current = 0
        const data = await res.json()
        onEvent({ event: 'poll_update', repair_id: repairId, stage: 'poll', status: 'ok', data })
      } catch { failCount.current++ }
    }, POLL_MS)
  }, [repairId, onEvent])

  const connectWS = useCallback(() => {
    if (!enabled) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      isPolling.current = false
      stopPoll()
    }

    ws.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data)
        // repairId null = mechanic broadcast listener (all events)
        if (repairId === null || !evt.repair_id || evt.repair_id === repairId) onEvent(evt)
      } catch { /* ignore */ }
    }

    ws.onerror = () => { startPoll() }

    ws.onclose = () => {
      startPoll()
      reconnectRef.current = setTimeout(() => {
        if (enabled) connectWS()
      }, RECONNECT_MS)
    }
  }, [repairId, enabled, onEvent, startPoll, stopPoll])

  useEffect(() => {
    if (!enabled) return
    connectWS()
    return () => {
      wsRef.current?.close()
      stopPoll()
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
    }
  }, [repairId, enabled, connectWS, stopPoll])
}
