"""
notification_agent.py — Agent 6: Customer Notification Agent
Generates and stores customer-friendly notifications at each workflow stage.
"""

from datetime import datetime
from sqlalchemy.orm import Session
from models import Notification, WorkflowLog


TEMPLATES = {
    "diagnosis_complete": "Hi {name}, your bike ({bike}) has been diagnosed. Issue: {detail}. Our mechanic will begin repairs shortly.",
    "repair_started":     "Hi {name}, repair work has started on your {bike}. Estimated completion: {detail}.",
    "repair_completed":   "Hi {name}, great news! Your {bike} repair is complete as of {detail}.",
    "invoice_ready":      "Hi {name}, your invoice #{detail} is ready. Total amount: ₹{extra}. Please visit us for pickup.",
    "pickup_ready":       "Hi {name}, your {bike} is ready for pickup! Invoice #{detail} — Amount: ₹{extra}. Thank you for choosing MechMate!",
}


def send_notification(
    db: Session,
    workflow_id: int,
    repair_id: int,
    customer_name: str,
    bike_model: str,
    notification_type: str,
    detail: str = "",
    extra: str = "",
) -> dict:
    template = TEMPLATES.get(notification_type, "Hi {name}, your repair status has been updated.")
    message = template.format(name=customer_name, bike=bike_model, detail=detail, extra=extra)

    notif = Notification(
        repair_id=repair_id,
        customer_name=customer_name,
        notification_type=notification_type,
        message=message,
        channel="SMS",
        status="Sent",
        sent_at=datetime.utcnow(),
    )
    db.add(notif)

    db.add(WorkflowLog(
        workflow_id=workflow_id,
        agent_name="Customer Notification Agent",
        agent_number=6,
        status="completed",
        message=f"Notification sent: {notification_type} — {message[:80]}",
    ))
    db.commit()
    db.refresh(notif)

    return {
        "notification_id": notif.id,
        "repair_id": repair_id,
        "type": notification_type,
        "message": message,
        "channel": "SMS",
        "status": "Sent",
        "sent_at": notif.sent_at.isoformat(),
    }


def run_notification_agent(
    db: Session,
    workflow_id: int,
    repair_id: int,
    customer_name: str,
    bike_model: str,
    invoice_id: str,
    grand_total: float,
) -> list:
    """Send all end-of-workflow notifications."""
    notifications = []

    notifications.append(send_notification(
        db, workflow_id, repair_id, customer_name, bike_model,
        "repair_completed", detail=datetime.utcnow().strftime("%I:%M %p"),
    ))
    notifications.append(send_notification(
        db, workflow_id, repair_id, customer_name, bike_model,
        "invoice_ready", detail=invoice_id, extra=str(grand_total),
    ))
    notifications.append(send_notification(
        db, workflow_id, repair_id, customer_name, bike_model,
        "pickup_ready", detail=invoice_id, extra=str(grand_total),
    ))

    return notifications
