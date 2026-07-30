"""
events.py — Structured event emitter for real-time sync.

Every agent completion calls emit_event() which:
  1. Broadcasts the event over WebSocket to all connected clients.
  2. The Customer Dashboard listens and updates its UI instantly.

Event shape:
{
    "event":      "agent_completed" | "repair_updated" | "payment_received" | ...,
    "agent":      1-6 | null,
    "repair_id":  int,
    "stage":      "intake" | "diagnosis" | "inventory" | "repair" | "billing" | "notification",
    "status":     "completed" | "in_progress" | "failed",
    "data":       { ...agent-specific payload },
    "timestamp":  "ISO string"
}
"""

import asyncio
import logging
from datetime import datetime, timezone
from ws_manager import manager

logger = logging.getLogger(__name__)

# Maps stage name → human-readable customer message
_STAGE_MESSAGES = {
    "appointment": "Your appointment has been updated.",
    "intake":       "Your bike has been received and registered.",
    "diagnosis":    "AI diagnosis completed. Faulty components identified.",
    "inventory":    "Spare parts checked and reserved for your repair.",
    "repair":       "Repair work is in progress.",
    "billing":      "Invoice generated. Your bike is ready for pickup.",
    "notification": "All notifications sent.",
    "completed":    "Repair fully completed. Please collect your bike.",
    "payment":      "Payment received. Thank you!",
}


def emit_event(
    event: str,
    repair_id: int,
    stage: str,
    status: str,
    data: dict,
    agent: int | None = None,
):
    """
    Fire-and-forget broadcast. Safe to call from sync or async context.
    Uses asyncio.create_task when an event loop is running,
    otherwise schedules via run_coroutine_threadsafe.
    """
    payload = {
        "event":      event,
        "agent":      agent,
        "repair_id":  repair_id,
        "stage":      stage,
        "status":     status,
        "message":    _STAGE_MESSAGES.get(stage, "Repair status updated."),
        "data":       data,
        "timestamp":  datetime.now(timezone.utc).isoformat(),
    }

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(manager.broadcast(payload))
        else:
            loop.run_until_complete(manager.broadcast(payload))
    except Exception as e:
        logger.warning("emit_event failed: %s", e)
