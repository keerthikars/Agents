"""
agent_orchestrator.py — Central coordinator for the MechMate AI multi-agent workflow.

Workflow:
  Agent 1 (Intake) → Agent 2 (Diagnosis) → Agent 3 (Inventory)
  → Agent 5 (Repair Status: sets In Progress, PAUSES)
  → [Manual: POST /repairs/{id}/complete]
  → Agent 4 (Billing) → Agent 6 (Notification)
"""

import json
import logging
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from models import WorkflowRun, WorkflowLog, AgentOutput, RepairRecord
from agent_clients import (
    intake_register_customer, intake_register_bike,
    intake_submit_complaint, intake_get_summary,
    diagnosis_create_intake, diagnosis_ai_analyze, diagnosis_create,
    inventory_process_repair,
    billing_generate,
)
from inventory_agent import run_inventory_agent  # local fallback
from repair_status_agent import run_repair_agent
from notification_agent import run_notification_agent
from events import emit_event

logger = logging.getLogger(__name__)


# ── Local Diagnosis Engine ────────────────────────────────────────────────────
# (keyword_list, faulty_components, possible_cause, required_parts,
#  severity, repair_time, labor_charge, ai_explanation)

_RULES = [
    (
        ["oil leak", "oil leakage", "oil drip", "leaking oil", "engine oil leak"],
        ["Engine Gasket", "Oil Seal", "Oil Filter"],
        "Engine oil leakage due to worn gasket or damaged oil seal.",
        [{"part_name": "Gasket Set", "quantity": 1},
         {"part_name": "Oil Filter", "quantity": 1},
         {"part_name": "Engine Oil", "quantity": 1}],
        "High", "2-3 Hours", 800.0,
        "Oil leakage indicates a failed gasket set or cracked oil seal. Requires engine disassembly, gasket replacement, oil filter change, and fresh engine oil refill.",
    ),
    (
        ["brake", "brakes", "brake noise", "brake fail", "brake pad", "brake disc", "squeaking", "grinding"],
        ["Brake Pad", "Brake Disc", "Brake Cable"],
        "Worn brake pads or damaged brake disc causing noise or reduced braking efficiency.",
        [{"part_name": "Brake Pad", "quantity": 2},
         {"part_name": "Brake Disc", "quantity": 1}],
        "High", "1-2 Hours", 600.0,
        "Brake noise or failure is caused by worn brake pads or a warped disc. Immediate replacement required for rider safety.",
    ),
    (
        ["not start", "won't start", "not starting", "hard start", "kick start", "self start", "no start", "engine start"],
        ["Spark Plug", "Battery", "Fuel Filter", "Carburetor Jet"],
        "Engine starting failure due to faulty spark plug, weak battery, or clogged fuel system.",
        [{"part_name": "Spark Plug", "quantity": 1},
         {"part_name": "Fuel Filter", "quantity": 1}],
        "High", "1-2 Hours", 500.0,
        "Starting issues are commonly caused by a fouled spark plug, discharged battery, or blocked fuel filter/carburetor jet.",
    ),
    (
        ["battery", "battery dead", "battery drain", "battery weak", "no power", "electrical"],
        ["Battery", "Headlight Bulb", "Indicator Bulb"],
        "Battery discharge or electrical fault causing power loss.",
        [{"part_name": "Battery", "quantity": 1}],
        "Medium", "1 Hour", 400.0,
        "A dead or weak battery is the primary cause of electrical failures. Battery replacement and charging system check recommended.",
    ),
    (
        ["tyre", "tire", "puncture", "flat tyre", "flat tire", "tyre burst", "tube"],
        ["Tyre", "Tube"],
        "Tyre puncture or burst requiring tube/tyre replacement.",
        [{"part_name": "Tube (Rear)", "quantity": 1}],
        "Medium", "1 Hour", 300.0,
        "Tyre puncture or burst detected. Tube or full tyre replacement needed depending on damage severity.",
    ),
    (
        ["chain", "chain loose", "chain break", "chain slip", "sprocket"],
        ["Chain", "Chain Sprocket"],
        "Worn or broken drive chain and sprocket causing slipping or snapping.",
        [{"part_name": "Chain", "quantity": 1},
         {"part_name": "Chain Sprocket", "quantity": 1}],
        "Medium", "1-2 Hours", 500.0,
        "A loose or broken chain with worn sprocket teeth causes power loss and safety risk. Chain and sprocket set replacement recommended.",
    ),
    (
        ["clutch", "clutch slip", "clutch hard", "clutch plate", "gear slip", "gear change"],
        ["Clutch Plate", "Clutch Cable"],
        "Worn clutch plates or stretched clutch cable causing slipping or stiff engagement.",
        [{"part_name": "Clutch Plate", "quantity": 1},
         {"part_name": "Clutch Cable", "quantity": 1}],
        "Medium", "2 Hours", 700.0,
        "Clutch slipping or hard engagement is caused by worn friction plates or a stretched cable. Full clutch service required.",
    ),
    (
        ["overheating", "over heat", "engine hot", "coolant", "radiator", "temperature"],
        ["Coolant", "Radiator Cap", "Oil Filter"],
        "Engine overheating due to low coolant, blocked radiator, or oil degradation.",
        [{"part_name": "Coolant", "quantity": 1},
         {"part_name": "Radiator Cap", "quantity": 1},
         {"part_name": "Oil Filter", "quantity": 1}],
        "High", "2 Hours", 600.0,
        "Overheating is caused by insufficient coolant, a faulty radiator cap, or degraded engine oil. Coolant flush and oil service required.",
    ),
    (
        ["suspension", "shock", "shock absorber", "rough ride", "bumpy", "fork", "fork oil"],
        ["Shock Absorber", "Fork Oil"],
        "Worn shock absorbers or low fork oil causing poor ride quality.",
        [{"part_name": "Shock Absorber", "quantity": 1},
         {"part_name": "Fork Oil", "quantity": 1}],
        "Medium", "2-3 Hours", 900.0,
        "Suspension issues are caused by worn shock absorbers or degraded fork oil. Replacement and fork oil service recommended.",
    ),
    (
        ["exhaust", "silencer", "muffler", "exhaust noise", "exhaust smoke", "smoke"],
        ["Exhaust Pipe", "Gasket Set"],
        "Damaged exhaust pipe or blown exhaust gasket causing noise or smoke.",
        [{"part_name": "Exhaust Pipe", "quantity": 1},
         {"part_name": "Gasket Set", "quantity": 1}],
        "Medium", "1-2 Hours", 600.0,
        "Exhaust noise or smoke indicates a cracked exhaust pipe or blown gasket. Replacement required to prevent further engine damage.",
    ),
    (
        ["air filter", "poor pickup", "low pickup", "acceleration", "throttle", "throttle cable"],
        ["Air Filter", "Throttle Cable", "Carburetor Jet"],
        "Clogged air filter or worn throttle cable causing poor engine response.",
        [{"part_name": "Air Filter", "quantity": 1},
         {"part_name": "Throttle Cable", "quantity": 1}],
        "Low", "1 Hour", 350.0,
        "Poor pickup is typically caused by a clogged air filter restricting airflow or a stretched throttle cable. Service and replacement recommended.",
    ),
    (
        ["wheel bearing", "wheel noise", "wheel wobble", "bearing"],
        ["Wheel Bearing"],
        "Worn wheel bearings causing noise or wobble.",
        [{"part_name": "Wheel Bearing", "quantity": 2}],
        "High", "2 Hours", 700.0,
        "Wheel bearing failure causes dangerous wobble and noise. Immediate replacement of both bearings required.",
    ),
    (
        ["spark plug", "misfiring", "misfire", "rough idle", "idle", "stalling", "stall"],
        ["Spark Plug", "Air Filter", "Fuel Filter"],
        "Fouled spark plug or fuel/air mixture issue causing misfiring or rough idle.",
        [{"part_name": "Spark Plug", "quantity": 1},
         {"part_name": "Air Filter", "quantity": 1}],
        "Low", "1 Hour", 350.0,
        "Misfiring or rough idle is caused by a fouled spark plug or dirty air/fuel filter. Tune-up service recommended.",
    ),
    (
        ["headlight", "light not working", "indicator", "signal light", "bulb"],
        ["Headlight Bulb", "Indicator Bulb"],
        "Blown headlight or indicator bulb.",
        [{"part_name": "Headlight Bulb", "quantity": 1},
         {"part_name": "Indicator Bulb", "quantity": 2}],
        "Low", "30 Minutes", 200.0,
        "Electrical lighting failure due to blown bulbs. Quick replacement required for road safety compliance.",
    ),
    (
        ["piston", "piston ring", "compression", "low compression", "engine noise", "knocking", "engine knock"],
        ["Piston Ring", "Gasket Set", "Engine Oil"],
        "Worn piston rings or low compression causing engine knock or power loss.",
        [{"part_name": "Piston Ring", "quantity": 1},
         {"part_name": "Gasket Set", "quantity": 1},
         {"part_name": "Engine Oil", "quantity": 1}],
        "Critical", "4-5 Hours", 1500.0,
        "Engine knocking or low compression indicates worn piston rings. Major engine overhaul required including piston ring replacement and gasket set.",
    ),
    (
        ["valve", "valve clearance", "tappet", "tappet noise", "valve noise"],
        ["Valve", "Engine Oil"],
        "Incorrect valve clearance or worn valve causing tappet noise.",
        [{"part_name": "Valve", "quantity": 2},
         {"part_name": "Engine Oil", "quantity": 1}],
        "High", "3-4 Hours", 1200.0,
        "Tappet or valve noise indicates incorrect valve clearance or worn valves. Valve adjustment or replacement with fresh oil service required.",
    ),
    (
        ["fuel leak", "petrol leak", "fuel smell", "carburetor", "carb", "fuel"],
        ["Fuel Filter", "Carburetor Jet"],
        "Fuel leak or clogged carburetor causing poor fuel delivery.",
        [{"part_name": "Fuel Filter", "quantity": 1},
         {"part_name": "Carburetor Jet", "quantity": 1}],
        "High", "1-2 Hours", 500.0,
        "Fuel leakage or carburetor blockage is a fire hazard and causes poor engine performance. Immediate fuel system service required.",
    ),
    (
        ["service", "general service", "routine", "maintenance", "oil change", "tune up", "tune-up"],
        ["Engine Oil", "Oil Filter", "Air Filter", "Spark Plug"],
        "Routine maintenance service due.",
        [{"part_name": "Engine Oil", "quantity": 1},
         {"part_name": "Oil Filter", "quantity": 1},
         {"part_name": "Air Filter", "quantity": 1},
         {"part_name": "Spark Plug", "quantity": 1}],
        "Low", "1 Hour", 400.0,
        "Routine service includes engine oil change, oil filter replacement, air filter cleaning/replacement, and spark plug inspection.",
    ),
]

_SEVERITY_TO_PRIORITY = {"Critical": "High", "High": "High", "Medium": "Medium", "Low": "Low"}


def _local_diagnosis(complaint: str, bike_model: str) -> dict:
    """Rule-based local diagnosis engine. Matches complaint keywords to known fault patterns."""
    text = complaint.lower()
    best_rule = None
    best_score = 0

    for rule in _RULES:
        keywords = rule[0]
        score = sum(1 for kw in keywords if kw in text)
        if score > best_score:
            best_score = score
            best_rule = rule

    if not best_rule or best_score == 0:
        return {
            "repair_severity": "Medium",
            "estimated_repair_time": "1-2 Hours",
            "estimated_labor_charge": 500.0,
            "required_parts": [{"part_name": "Engine Oil", "quantity": 1},
                                {"part_name": "Oil Filter", "quantity": 1}],
            "faulty_components": ["General Inspection Required"],
            "possible_cause": f"Detailed inspection needed for: {complaint}",
            "confidence_score": 55,
            "ai_explanation": (
                f"Complaint '{complaint}' requires physical inspection by mechanic. "
                "Basic service parts allocated. Further diagnosis needed on-site."
            ),
        }

    keywords, components, cause, parts, severity, repair_time, labor, explanation = best_rule
    return {
        "repair_severity": severity,
        "estimated_repair_time": repair_time,
        "estimated_labor_charge": labor,
        "required_parts": parts,
        "faulty_components": components,
        "possible_cause": cause,
        "confidence_score": min(95, 70 + best_score * 8),
        "ai_explanation": explanation,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _log(db: Session, workflow_id: int, agent_name: str, agent_number: int, status: str, message: str):
    db.add(WorkflowLog(
        workflow_id=workflow_id,
        agent_name=agent_name,
        agent_number=agent_number,
        status=status,
        message=message,
    ))
    db.commit()


def _save_output(db: Session, workflow_id: int, agent_name: str, agent_number: int, output: dict):
    db.add(AgentOutput(
        workflow_id=workflow_id,
        agent_name=agent_name,
        agent_number=agent_number,
        output_json=json.dumps(output),
    ))
    db.commit()


def _set_stage(db: Session, workflow: WorkflowRun, stage: str):
    workflow.current_stage = stage
    db.commit()


def _fail(db: Session, workflow: WorkflowRun, agent_name: str, agent_number: int, error: str):
    workflow.status = "failed"
    workflow.current_stage = "failed"
    workflow.error_message = error
    db.commit()
    _log(db, workflow.id, agent_name, agent_number, "failed", error)
    raise RuntimeError(f"[{agent_name}] {error}")


# ── Phase 1: Intake → Diagnosis → Inventory → Repair Start ───────────────────

async def run_workflow(db: Session, request: dict, customer_id: int = None) -> dict:
    customer = request["customer_details"]
    bike = request["bike_details"]
    complaint_text = request["complaint"]

    workflow = WorkflowRun(
        repair_id=None,
        customer_name=customer.get("customer_name", "Unknown"),
        bike_model=bike.get("bike_model", "Unknown"),
        complaint=complaint_text,
        current_stage="intake",
        status="running",
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)

    results = {}

    try:
        # ════════════════════════════════════════════════════════════════════
        # AGENT 1 — Customer Intake
        # ════════════════════════════════════════════════════════════════════
        _log(db, workflow.id, "Customer Intake Agent", 1, "started", "Registering customer and bike.")
        _set_stage(db, workflow, "intake")

        try:
            cust_resp = await intake_register_customer(customer)
            customer_id = cust_resp["id"]

            bike_payload = {**bike, "customer_id": customer_id}
            bike_resp = await intake_register_bike(bike_payload)
            bike_id = bike_resp["id"]

            complaint_payload = {
                "bike_id": bike_id,
                "complaint": complaint_text,
                "follow_up_answers": [],
            }
            complaint_resp = await intake_submit_complaint(complaint_payload)
            repair_id = complaint_resp["id"]

            summary = await intake_get_summary(customer_id)
        except Exception:
            _log(db, workflow.id, "Customer Intake Agent", 1, "started",
                 "Agent 1 unreachable — using local fallback.")
            repair_id = int(uuid.uuid4().int % 10**7)
            # ensure uniqueness
            while db.query(RepairRecord).filter(RepairRecord.repair_id == repair_id).first() or \
                  db.query(WorkflowRun).filter(WorkflowRun.repair_id == repair_id).first():
                repair_id = int(uuid.uuid4().int % 10**7)
            customer_id = repair_id
            cust_resp = {"id": customer_id, **customer}
            bike_resp = {"id": repair_id, **bike, "customer_id": customer_id}
            complaint_resp = {"id": repair_id, "complaint": complaint_text}
            # Derive priority from local diagnosis
            diag_preview = _local_diagnosis(complaint_text, bike.get("bike_model", ""))
            priority = _SEVERITY_TO_PRIORITY.get(diag_preview["repair_severity"], "Medium")
            summary = {"priority": priority, "category": "General Repair"}

        workflow.repair_id = repair_id
        db.commit()

        repair_record = RepairRecord(
            repair_id=repair_id,
            customer_id=customer_id,
            customer_name=customer.get("customer_name"),
            customer_phone=customer.get("phone"),
            bike_model=bike.get("bike_model"),
            brand=bike.get("brand"),
            complaint=complaint_text,
            priority=summary.get("priority", "Medium"),
            repair_status="Pending",
        )
        db.add(repair_record)
        db.commit()

        agent1_output = {
            "repair_id": repair_id,
            "customer_id": customer_id,
            "customer_details": cust_resp,
            "bike_details": bike_resp,
            "complaint": complaint_resp,
            "priority": summary.get("priority"),
            "category": summary.get("category"),
        }
        _save_output(db, workflow.id, "Customer Intake Agent", 1, agent1_output)
        _log(db, workflow.id, "Customer Intake Agent", 1, "completed",
             f"Customer registered. repair_id={repair_id}, priority={summary.get('priority')}")
        results["agent1"] = agent1_output
        emit_event(
            event="agent_completed", agent=1, repair_id=repair_id,
            stage="intake", status="completed",
            data={
                "customer_name": customer.get("customer_name"),
                "bike_model": bike.get("bike_model"),
                "complaint": complaint_text,
                "priority": summary.get("priority"),
                "repair_status": "Pending",
            },
        )

        # ════════════════════════════════════════════════════════════════════
        # AGENT 2 — AI Diagnosis
        # ════════════════════════════════════════════════════════════════════
        _log(db, workflow.id, "AI Diagnosis Agent", 2, "started", "Running AI diagnosis.")
        _set_stage(db, workflow, "diagnosis")

        try:
            await diagnosis_create_intake(
                repair_id=repair_id,
                customer_name=customer.get("customer_name"),
                bike_model=bike.get("bike_model"),
                complaint=complaint_text,
            )
            ai_result = await diagnosis_ai_analyze(
                repair_id=repair_id,
                observation=f"Customer complaint: {complaint_text}. Auto-analyzed by orchestrator.",
            )
            diagnosis_payload = {
                "repair_id": repair_id,
                "mechanic_observation": f"Auto-diagnosis via orchestrator. Complaint: {complaint_text}",
                "faulty_components": ai_result.get("faulty_components", []),
                "possible_cause": ai_result.get("possible_cause", ""),
                "repair_severity": ai_result.get("repair_severity", "Medium"),
                "estimated_repair_time": ai_result.get("estimated_repair_time", "1 Hour"),
                "estimated_labor_charge": ai_result.get("estimated_labor_charge", 500.0),
                "required_parts": ai_result.get("required_parts", []),
                "confidence_score": ai_result.get("confidence_score"),
                "ai_explanation": ai_result.get("ai_explanation"),
            }
            await diagnosis_create(diagnosis_payload)
        except Exception:
            _log(db, workflow.id, "AI Diagnosis Agent", 2, "started",
                 "Agent 2 unreachable — using local diagnosis engine.")
            ai_result = _local_diagnosis(complaint_text, bike.get("bike_model", ""))

        repair_record.severity = ai_result.get("repair_severity", "Medium")
        repair_record.priority = _SEVERITY_TO_PRIORITY.get(ai_result.get("repair_severity", "Medium"), "Medium")
        db.commit()

        agent2_output = {
            "repair_id": repair_id,
            "required_parts": ai_result.get("required_parts", []),
            "labor_charge": ai_result.get("estimated_labor_charge", 500.0),
            "repair_time": ai_result.get("estimated_repair_time"),
            "severity": ai_result.get("repair_severity"),
            "faulty_components": ai_result.get("faulty_components", []),
            "possible_cause": ai_result.get("possible_cause"),
            "confidence_score": ai_result.get("confidence_score"),
            "ai_explanation": ai_result.get("ai_explanation"),
        }
        _save_output(db, workflow.id, "AI Diagnosis Agent", 2, agent2_output)
        _log(db, workflow.id, "AI Diagnosis Agent", 2, "completed",
             f"Diagnosis complete. Severity={ai_result.get('repair_severity')}, "
             f"Parts={len(ai_result.get('required_parts', []))}, "
             f"Confidence={ai_result.get('confidence_score')}%")
        results["agent2"] = agent2_output
        emit_event(
            event="agent_completed", agent=2, repair_id=repair_id,
            stage="diagnosis", status="completed",
            data={
                "severity": ai_result.get("repair_severity"),
                "repair_time": ai_result.get("estimated_repair_time"),
                "labor_charge": ai_result.get("estimated_labor_charge"),
                "faulty_components": ai_result.get("faulty_components", []),
                "required_parts": ai_result.get("required_parts", []),
                "confidence_score": ai_result.get("confidence_score"),
                "ai_explanation": ai_result.get("ai_explanation"),
            },
        )

        # ════════════════════════════════════════════════════════════════════
        # AGENT 3 — Inventory Intelligence (local)
        # ════════════════════════════════════════════════════════════════════
        _log(db, workflow.id, "Inventory Intelligence Agent", 3, "started",
             "Checking stock and reserving parts.")
        _set_stage(db, workflow, "inventory")

        try:
            inv_result = await inventory_process_repair(
                repair_id=repair_id,
                bike_model=bike.get("bike_model", ""),
                required_parts=ai_result.get("required_parts", []),
            )
        except Exception:
            _log(db, workflow.id, "Inventory Intelligence Agent", 3, "started",
                 "Agent 3 (port 8002) unreachable — using local inventory fallback.")
            inv_result = run_inventory_agent(
                db=db,
                workflow_id=workflow.id,
                repair_id=repair_id,
                required_parts=ai_result.get("required_parts", []),
            )

        _save_output(db, workflow.id, "Inventory Intelligence Agent", 3, inv_result)
        _log(db, workflow.id, "Inventory Intelligence Agent", 3, "completed",
             f"Status={inv_result['status']}. Reserved={len(inv_result['reserved_parts'])}, "
             f"Missing={len(inv_result['missing_parts'])}, LowStock={len(inv_result['low_stock_alerts'])}")
        results["agent3"] = inv_result
        emit_event(
            event="agent_completed", agent=3, repair_id=repair_id,
            stage="inventory", status="completed",
            data={
                "inventory_status": inv_result.get("status"),
                "reserved_parts": inv_result.get("reserved_parts", []),
                "missing_parts": inv_result.get("missing_parts", []),
                "low_stock_alerts": inv_result.get("low_stock_alerts", []),
            },
        )

        # ════════════════════════════════════════════════════════════════════
        # AGENT 5 — Repair Status (sets In Progress, PAUSES workflow)
        # ════════════════════════════════════════════════════════════════════
        _log(db, workflow.id, "Repair Status Agent", 5, "started", "Setting repair to In Progress.")
        _set_stage(db, workflow, "repair")

        repair_result = run_repair_agent(
            db=db,
            workflow_id=workflow.id,
            repair_id=repair_id,
            severity=ai_result.get("repair_severity", "Medium"),
        )

        _save_output(db, workflow.id, "Repair Status Agent", 5, repair_result)
        results["agent5"] = repair_result
        emit_event(
            event="agent_completed", agent=5, repair_id=repair_id,
            stage="repair", status="in_progress",
            data={
                "repair_status": "In Progress",
                "severity": ai_result.get("repair_severity"),
                "estimated_completion": repair_result.get("estimated_completion"),
                "progress": 25,
            },
        )

        # Store context needed for phase 2 (billing + notification)
        workflow.error_message = json.dumps({
            "_pending_billing": True,
            "labor_charge": ai_result.get("estimated_labor_charge", 500.0),
            "reserved_parts": inv_result.get("reserved_parts", []),
        })
        workflow.status = "repair_in_progress"
        workflow.current_stage = "repair"
        db.commit()

        logger.info("Workflow paused at repair stage for repair_id=%s", repair_id)

        return {
            "workflow_id": workflow.id,
            "repair_id": repair_id,
            "status": "repair_in_progress",
            "message": "Repair started. Call POST /repairs/{repair_id}/complete when bike is fixed.",
            "results": results,
        }

    except (RuntimeError, IntegrityError, Exception) as e:
        logger.error("Workflow failed: %s", e)
        try:
            workflow.status = "failed"
            workflow.current_stage = "failed"
            workflow.error_message = str(e)
            db.commit()
        except Exception:
            db.rollback()
        raise RuntimeError(str(e)) from e


# ── Phase 2: Complete Repair → Billing → Notification ────────────────────────

async def complete_repair_workflow(db: Session, repair_id: int) -> dict:
    """
    Called after mechanic marks repair complete.
    Runs Agent 4 (Billing) and Agent 6 (Notification).
    """
    from repair_status_agent import complete_repair

    repair_record = db.query(RepairRecord).filter(RepairRecord.repair_id == repair_id).first()
    if not repair_record:
        raise RuntimeError(f"Repair {repair_id} not found.")

    workflow = db.query(WorkflowRun).filter(WorkflowRun.repair_id == repair_id).first()
    if not workflow:
        raise RuntimeError(f"No workflow found for repair_id={repair_id}.")

    # Parse stored billing context
    pending_ctx = {}
    try:
        if workflow.error_message:
            ctx = json.loads(workflow.error_message)
            if ctx.get("_pending_billing"):
                pending_ctx = ctx
    except Exception:
        pass

    labor_charge = pending_ctx.get("labor_charge", 500.0)
    reserved_parts = pending_ctx.get("reserved_parts", [])

    # Mark repair completed
    complete_repair(db, repair_id)
    _log(db, workflow.id, "Repair Status Agent", 5, "completed",
         f"Repair {repair_id} marked as Completed.")

    results = {}

    # ════════════════════════════════════════════════════════════════════
    # AGENT 4 — Smart Billing
    # ════════════════════════════════════════════════════════════════════
    _log(db, workflow.id, "Smart Billing Agent", 4, "started", "Generating invoice.")
    _set_stage(db, workflow, "billing")

    used_parts = [
        {
            "part_name": rp.get("part") or rp.get("part_name", ""),
            "quantity": rp.get("quantity", 1),
            "price": rp.get("unit_price", 50.0),
        }
        for rp in reserved_parts
    ]

    billing_payload = {
        "repair_id": repair_id,
        "customer_name": repair_record.customer_name,
        "bike_model": repair_record.bike_model,
        "repair_status": "COMPLETED",
        "used_parts": used_parts,
        "labor_charge": labor_charge,
        "customer_type": "Regular",
    }

    try:
        bill_result = await billing_generate(billing_payload)
    except Exception:
        _log(db, workflow.id, "Smart Billing Agent", 4, "started",
             "Agent 4 unreachable — using local fallback.")
        parts_total = sum(p["price"] * p["quantity"] for p in used_parts)
        subtotal = labor_charge + parts_total
        gst = round(subtotal * 0.18, 2)
        bill_result = {
            "invoice_number": f"INV-{repair_id}",
            "subtotal": round(subtotal, 2),
            "gst": gst,
            "discount": 0,
            "labor_charge": labor_charge,
            "grand_total": round(subtotal + gst, 2),
            "payment_status": "Pending",
        }

    invoice_id = bill_result.get("invoice_number", f"INV-{repair_id}")
    grand_total = bill_result.get("grand_total", 0.0)

    repair_record.invoice_id = invoice_id
    repair_record.grand_total = grand_total
    repair_record.payment_status = bill_result.get("payment_status", "Pending")
    db.commit()

    agent4_output = {
        "repair_id": repair_id,
        "invoice_id": invoice_id,
        "grand_total": grand_total,
        "subtotal": bill_result.get("subtotal"),
        "gst": bill_result.get("gst"),
        "discount": bill_result.get("discount"),
        "labor_charge": bill_result.get("labor_charge"),
        "payment_status": bill_result.get("payment_status", "Pending"),
    }
    _save_output(db, workflow.id, "Smart Billing Agent", 4, agent4_output)
    _log(db, workflow.id, "Smart Billing Agent", 4, "completed",
         f"Invoice {invoice_id} generated. Total: ₹{grand_total}")
    results["agent4"] = agent4_output
    emit_event(
        event="agent_completed", agent=4, repair_id=repair_id,
        stage="billing", status="completed",
        data={
            "invoice_id": invoice_id,
            "grand_total": grand_total,
            "subtotal": bill_result.get("subtotal"),
            "gst": bill_result.get("gst"),
            "labor_charge": bill_result.get("labor_charge"),
            "payment_status": "Pending",
        },
    )

    # ════════════════════════════════════════════════════════════════════
    # AGENT 6 — Customer Notification
    # ════════════════════════════════════════════════════════════════════
    _log(db, workflow.id, "Customer Notification Agent", 6, "started", "Sending notifications.")
    _set_stage(db, workflow, "notification")

    notifications = run_notification_agent(
        db=db,
        workflow_id=workflow.id,
        repair_id=repair_id,
        customer_name=repair_record.customer_name,
        bike_model=repair_record.bike_model,
        invoice_id=invoice_id,
        grand_total=grand_total,
    )

    agent6_output = {"repair_id": repair_id, "notifications": notifications}
    _save_output(db, workflow.id, "Customer Notification Agent", 6, agent6_output)
    results["agent6"] = agent6_output
    emit_event(
        event="agent_completed", agent=6, repair_id=repair_id,
        stage="notification", status="completed",
        data={"notifications": [n.get("type") for n in notifications if isinstance(n, dict)]},
    )

    # Complete workflow
    workflow.status = "completed"
    workflow.current_stage = "completed"
    workflow.completed_at = datetime.utcnow()
    workflow.error_message = None
    db.commit()
    emit_event(
        event="workflow_completed", agent=None, repair_id=repair_id,
        stage="completed", status="completed",
        data={"invoice_id": invoice_id, "grand_total": grand_total, "repair_status": "Completed"},
    )

    logger.info("Workflow fully completed for repair_id=%s", repair_id)

    return {
        "workflow_id": workflow.id,
        "repair_id": repair_id,
        "status": "completed",
        "invoice_id": invoice_id,
        "grand_total": grand_total,
        "results": results,
    }
