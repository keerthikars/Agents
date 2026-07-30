import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models  # register ORM models
from routes import router
from ws_manager import manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MechMate AI — Multi-Agent Orchestrator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Real-time event stream.
    Frontend connects once; backend pushes JSON events on every agent action.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; client sends pings, we ignore them
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@app.get("/")
def root():
    return {
        "app": "MechMate AI",
        "description": "Multi-Agent Bike Repair Management System",
        "agents": [
            "Agent 1 — Customer Intake (port 8000)",
            "Agent 2 — AI Diagnosis (port 8001)",
            "Agent 3 — Inventory Intelligence (port 8002)",
            "Agent 4 — Smart Billing (port 8003)",
            "Agent 5 — Repair Status (built-in)",
            "Agent 6 — Customer Notification (built-in)",
        ],
        "orchestrator_port": 8004,
    }
