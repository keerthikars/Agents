"""
agent_clients.py — HTTP clients that call each existing agent's API.
Each function maps to one agent's primary endpoint.
"""

import httpx
from typing import Any

# Agent base URLs (each runs on its own port)
AGENT_URLS = {
    "intake":    "http://localhost:8000",
    "diagnosis": "http://localhost:8001",
    "inventory": "http://localhost:8002",
    "billing":   "http://localhost:8003",
}

TIMEOUT = 60.0


async def _post(url: str, payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()
        return r.json()


async def _get(url: str) -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.json()


# ── Agent 1: Customer Intake ──────────────────────────────────────────────────

async def intake_register_customer(data: dict) -> dict:
    return await _post(f"{AGENT_URLS['intake']}/customers/", data)


async def intake_register_bike(data: dict) -> dict:
    return await _post(f"{AGENT_URLS['intake']}/bikes/", data)


async def intake_submit_complaint(data: dict) -> dict:
    return await _post(f"{AGENT_URLS['intake']}/complaints/", data)


async def intake_get_summary(customer_id: int) -> dict:
    return await _get(f"{AGENT_URLS['intake']}/customers/{customer_id}/summary")


# ── Agent 2: Diagnosis ────────────────────────────────────────────────────────

async def diagnosis_create_intake(repair_id: int, customer_name: str, bike_model: str, complaint: str) -> dict:
    return await _post(f"{AGENT_URLS['diagnosis']}/diagnosis/intake", {
        "repair_id": repair_id,
        "customer_name": customer_name,
        "bike_model": bike_model,
        "complaint": complaint,
    })


async def diagnosis_ai_analyze(repair_id: int, observation: str) -> dict:
    return await _post(f"{AGENT_URLS['diagnosis']}/diagnosis/ai-analyze", {
        "repair_id": repair_id,
        "mechanic_observation": observation,
    })


async def diagnosis_create(payload: dict) -> dict:
    return await _post(f"{AGENT_URLS['diagnosis']}/diagnosis/create", payload)


async def diagnosis_forward(repair_id: int) -> dict:
    return await _post(f"{AGENT_URLS['diagnosis']}/diagnosis/forward", {"repair_id": repair_id})


# ── Agent 3: Inventory ────────────────────────────────────────────────────────

async def inventory_process_repair(repair_id: int, bike_model: str, required_parts: list) -> dict:
    return await _post(f"{AGENT_URLS['inventory']}/inventory/process-repair", {
        "repair_id": repair_id,
        "bike_model": bike_model,
        "required_parts": required_parts,
    })


async def inventory_get_stats() -> dict:
    return await _get(f"{AGENT_URLS['inventory']}/inventory/stats")


async def inventory_get_low_stock() -> list:
    return await _get(f"{AGENT_URLS['inventory']}/inventory/low-stock")


# ── Agent 4: Billing ──────────────────────────────────────────────────────────

async def billing_generate(payload: dict) -> dict:
    return await _post(f"{AGENT_URLS['billing']}/billing/generate", payload)


async def billing_get_invoice(repair_id: int) -> dict:
    return await _get(f"{AGENT_URLS['billing']}/billing/{repair_id}")


async def billing_get_all() -> list:
    return await _get(f"{AGENT_URLS['billing']}/billing/all")
