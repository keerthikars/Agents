"""
ws_manager.py — WebSocket connection manager.

Maintains a set of active WebSocket connections.
Any backend code can call `manager.broadcast(event_dict)` to push
a real-time event to every connected browser tab.
"""

import json
import logging
from typing import Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.add(ws)
        logger.info("WS client connected. Total=%d", len(self.active))

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws)
        logger.info("WS client disconnected. Total=%d", len(self.active))

    async def broadcast(self, payload: dict):
        """Send JSON payload to every connected client. Dead connections are removed."""
        if not self.active:
            return
        message = json.dumps(payload, default=str)
        dead = set()
        for ws in list(self.active):
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.active.discard(ws)


# Singleton — imported everywhere
manager = ConnectionManager()
