"""
repair_status_agent.py — Agent 5: Repair Status Agent
Sets repair to In Progress. Workflow PAUSES here.
Billing and Notification only run after POST /repairs/{id}/complete is called.
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import RepairRecord, WorkflowLog

STAGE_DURATIONS = {
    "Critical": 180,
    "High":     120,
    "Medium":   60,
    "Low":      30,
}


def run_repair_agent(db: Session, workflow_id: int, repair_id: int, severity: str) -> dict:
    """Set repair to In Progress. Workflow pauses — billing runs only after completion."""
    record = db.query(RepairRecord).filter(RepairRecord.repair_id == repair_id).first()
    if record:
        record.repair_status = "In Progress"
        db.commit()

    minutes = STAGE_DURATIONS.get(severity, 60)
    estimated_completion = datetime.utcnow() + timedelta(minutes=minutes)

    _log(db, workflow_id, "started",
         f"Repair started. Status set to In Progress. Estimated: {minutes} min.")

    return {
        "repair_id": repair_id,
        "repair_status": "In Progress",
        "severity": severity,
        "estimated_minutes": minutes,
        "estimated_completion": estimated_completion.strftime("%I:%M %p"),
        "started_at": datetime.utcnow().isoformat(),
        "note": "Workflow paused. Mark repair complete to trigger billing and notification.",
    }


def complete_repair(db: Session, repair_id: int) -> RepairRecord:
    """Mark repair as Completed. Called by POST /repairs/{id}/complete."""
    record = db.query(RepairRecord).filter(RepairRecord.repair_id == repair_id).first()
    if not record:
        return None
    record.repair_status = "Completed"
    record.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(record)
    return record


def _log(db: Session, workflow_id: int, status: str, message: str):
    db.add(WorkflowLog(
        workflow_id=workflow_id,
        agent_name="Repair Status Agent",
        agent_number=5,
        status=status,
        message=message,
    ))
    db.commit()
