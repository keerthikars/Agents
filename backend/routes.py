import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from database import get_db
from schemas import (
    WorkflowStartRequest, WorkflowRunOut, RepairRecordOut, NotificationOut,
    MechanicLoginRequest, CustomerLoginRequest, TokenResponse,
    CustomerRegisterRequest, CustomerTokenResponse,
    CustomerSessionResponse, CustomerCreate, CustomerOut,
    ChatMessageCreate, ChatMessageOut, TrackingLookupResponse,
    ServiceRequestCreate, ServiceRequestOut,
    AppointmentScheduleRequest, AppointmentRescheduleRequest, AppointmentOut,
)
from models import WorkflowRun, RepairRecord, Notification, AgentOutput, SparePart, Customer, Mechanic, ChatMessage, ServiceRequest, Appointment, Diagnosis
from agent_orchestrator import run_workflow, complete_repair_workflow
from agent_clients import billing_get_all
from inventory_agent import get_all_parts, get_low_stock_parts, add_stock
from events import emit_event
from auth import (
    verify_password, hash_password, create_access_token,
    get_current_mechanic, seed_mechanic, get_current_customer,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/auth/mechanic/login", response_model=TokenResponse)
def mechanic_login(req: MechanicLoginRequest, db: Session = Depends(get_db)):
    seed_mechanic(db)
    mechanic = db.query(Mechanic).filter(Mechanic.username == req.username).first()
    if not mechanic or not verify_password(req.password, mechanic.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token({"sub": mechanic.username})
    return TokenResponse(access_token=token, mechanic_name=mechanic.full_name or mechanic.username)


# ── Customer Auth ────────────────────────────────────────────────────────────

@router.post("/auth/customer/register", response_model=CustomerTokenResponse)
def customer_register(req: CustomerRegisterRequest, db: Session = Depends(get_db)):
    """Register a new customer account."""
    if db.query(Customer).filter(Customer.phone == req.phone).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")
    if db.query(Customer).filter(Customer.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    cust = Customer(
        name=req.name,
        phone=req.phone,
        email=req.email,
        hashed_password=hash_password(req.password),
    )
    db.add(cust)
    db.commit()
    db.refresh(cust)
    token = create_access_token({"sub": str(cust.id), "role": "customer"})
    return CustomerTokenResponse(
        access_token=token, customer_id=cust.id,
        customer_name=cust.name, phone=cust.phone, email=cust.email,
    )


@router.post("/auth/customer/login", response_model=CustomerTokenResponse)
def customer_login(req: CustomerLoginRequest, db: Session = Depends(get_db)):
    """Customer logs in with phone + password."""
    cust = db.query(Customer).filter(Customer.phone == req.phone).first()
    if not cust or not cust.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    if not verify_password(req.password, cust.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    token = create_access_token({"sub": str(cust.id), "role": "customer"})
    return CustomerTokenResponse(
        access_token=token, customer_id=cust.id,
        customer_name=cust.name, phone=cust.phone, email=cust.email,
    )


@router.get("/auth/customer/me")
def customer_me(cust: Customer = Depends(get_current_customer)):
    return {"id": cust.id, "name": cust.name, "phone": cust.phone, "email": cust.email}


# ── Service Requests ──────────────────────────────────────────────────────────────────

@router.post("/service-requests", response_model=ServiceRequestOut)
def create_service_request(req: ServiceRequestCreate, db: Session = Depends(get_db)):
    """Public — customer self-registers before mechanic accepts."""
    sr = ServiceRequest(**req.model_dump())
    db.add(sr)
    db.commit()
    db.refresh(sr)
    emit_event(
        event="new_service_request", agent=None, repair_id=0,
        stage="intake", status="pending",
        data={"service_request_id": sr.id, "customer_name": sr.customer_name},
    )
    return sr


@router.get("/customer/service-requests", response_model=list[ServiceRequestOut])
def customer_service_requests(
    db: Session = Depends(get_db),
    cust: Customer = Depends(get_current_customer),
):
    """Authenticated customer sees their own service requests."""
    return (
        db.query(ServiceRequest)
        .filter(ServiceRequest.phone == cust.phone)
        .order_by(ServiceRequest.created_at.desc())
        .all()
    )


@router.get("/customer/appointments", response_model=list[AppointmentOut])
def customer_appointments(
    db: Session = Depends(get_db),
    cust: Customer = Depends(get_current_customer),
):
    """Authenticated customer sees their own appointments."""
    return (
        db.query(Appointment)
        .filter(Appointment.customer_phone == cust.phone)
        .order_by(Appointment.created_at.desc())
        .all()
    )


@router.get("/customer/repairs")
def customer_repairs(
    db: Session = Depends(get_db),
    cust: Customer = Depends(get_current_customer),
):
    """Authenticated customer sees their own repairs."""
    records = (
        db.query(RepairRecord)
        .filter(RepairRecord.customer_phone == cust.phone)
        .order_by(RepairRecord.created_at.desc())
        .all()
    )
    return [{"repair_id": r.repair_id, "bike_model": r.bike_model, "brand": r.brand,
             "complaint": r.complaint, "repair_status": r.repair_status,
             "invoice_id": r.invoice_id, "grand_total": r.grand_total,
             "payment_status": r.payment_status, "created_at": r.created_at} for r in records]


@router.get("/service-requests/check-phone/{phone}")
def check_phone_requests(phone: str, db: Session = Depends(get_db)):
    """Public — customer checks if their phone has any accepted requests."""
    requests = db.query(ServiceRequest).filter(
        ServiceRequest.phone == phone,
        ServiceRequest.status == "accepted",
    ).order_by(ServiceRequest.created_at.desc()).all()
    return [{"tracking_id": r.tracking_id, "repair_id": r.repair_id, "bike_model": r.bike_model, "status": r.status} for r in requests]


@router.get("/service-requests", response_model=list[ServiceRequestOut])
def list_service_requests(
    status: str = Query(None),
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    q = db.query(ServiceRequest)
    if status:
        q = q.filter(ServiceRequest.status == status)
    return q.order_by(ServiceRequest.created_at.desc()).all()


@router.post("/service-requests/{sr_id}/accept")
def accept_service_request(
    sr_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    """Mechanic accepts request — marks as accepted. Appointment is scheduled separately."""
    sr = db.query(ServiceRequest).filter(ServiceRequest.id == sr_id).first()
    if not sr:
        raise HTTPException(status_code=404, detail="Service request not found")
    if sr.status == "accepted":
        return {"id": sr_id, "status": "accepted"}  # idempotent
    if sr.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request already {sr.status}")
    sr.status = "accepted"
    db.commit()
    emit_event(
        event="request_accepted", agent=None, repair_id=0,
        stage="intake", status="completed",
        data={"service_request_id": sr_id, "customer_name": sr.customer_name},
    )
    return {"id": sr_id, "status": "accepted"}


@router.post("/service-requests/{sr_id}/reject")
def reject_service_request(
    sr_id: int,
    body: dict = {},
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    sr = db.query(ServiceRequest).filter(ServiceRequest.id == sr_id).first()
    if not sr:
        raise HTTPException(status_code=404, detail="Service request not found")
    sr.status = "rejected"
    db.commit()
    emit_event(
        event="request_rejected", agent=None, repair_id=0,
        stage="intake", status="failed",
        data={"service_request_id": sr_id, "customer_name": sr.customer_name},
    )
    return {"id": sr_id, "status": "rejected"}


# ── Appointments ──────────────────────────────────────────────────────────────

@router.post("/appointments", response_model=AppointmentOut)
def schedule_appointment(
    req: AppointmentScheduleRequest,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    """Mechanic schedules an appointment after accepting a service request."""
    sr = db.query(ServiceRequest).filter(ServiceRequest.id == req.service_request_id).first()
    if not sr:
        raise HTTPException(status_code=404, detail="Service request not found")
    if sr.status not in ("accepted", "pending"):
        raise HTTPException(status_code=400, detail=f"Cannot schedule: request is {sr.status}")

    # Check no appointment already exists
    existing = db.query(Appointment).filter(
        Appointment.service_request_id == req.service_request_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Appointment already scheduled for this request")

    appt = Appointment(
        service_request_id=req.service_request_id,
        customer_name=sr.customer_name,
        customer_phone=sr.phone,
        bike_model=sr.bike_model,
        bike_brand=sr.bike_brand,
        registration_number=sr.registration_number,
        complaint=sr.complaint,
        appointment_date=req.appointment_date,
        appointment_time=req.appointment_time,
        inspection_duration=req.inspection_duration,
        mechanic_notes=req.mechanic_notes,
        status="scheduled",
    )
    db.add(appt)

    # Mark service request as appointment_scheduled and store tracking_id
    # Use appointment id as temporary tracking base; we'll update after flush
    db.flush()  # get appt.id
    tracking_id = f"APT{appt.id}"
    appt.tracking_id = tracking_id
    sr.status = "appointment_scheduled"
    sr.tracking_id = tracking_id
    db.commit()
    db.refresh(appt)

    # Store appointment notification in Notification table (repair_id=0 placeholder)
    notif_msg = (
        f"Hi {sr.customer_name}, your service request has been accepted. "
        f"Please bring your bike on {req.appointment_date} at {req.appointment_time}. "
        f"Your Tracking ID is {tracking_id}."
    )
    db.add(Notification(
        repair_id=appt.id,
        customer_name=sr.customer_name,
        notification_type="appointment_scheduled",
        message=notif_msg,
        channel="SMS",
        status="Sent",
    ))
    db.commit()

    emit_event(
        event="appointment_scheduled", agent=None, repair_id=appt.id,
        stage="appointment", status="scheduled",
        data={
            "tracking_id": tracking_id,
            "customer_name": sr.customer_name,
            "appointment_date": req.appointment_date,
            "appointment_time": req.appointment_time,
            "service_request_id": req.service_request_id,
        },
    )
    return appt


@router.get("/appointments/by-tracking/{tracking_id}", response_model=AppointmentOut)
def get_appointment_by_tracking(tracking_id: str, db: Session = Depends(get_db)):
    """Public — customer looks up appointment by tracking ID."""
    appt = db.query(Appointment).filter(Appointment.tracking_id == tracking_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt


@router.get("/appointments/by-phone/{phone}", response_model=list[AppointmentOut])
def get_appointments_by_phone(phone: str, db: Session = Depends(get_db)):
    """Public — customer looks up all their appointments by phone number."""
    appts = (
        db.query(Appointment)
        .filter(Appointment.customer_phone == phone)
        .order_by(Appointment.created_at.desc())
        .all()
    )
    return appts


@router.get("/appointments", response_model=list[AppointmentOut])
def list_appointments(
    status: str = Query(None),
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    q = db.query(Appointment)
    if status:
        q = q.filter(Appointment.status == status)
    return q.order_by(Appointment.appointment_date.asc(), Appointment.appointment_time.asc()).all()


@router.get("/appointments/{appt_id}", response_model=AppointmentOut)
def get_appointment(appt_id: int, db: Session = Depends(get_db)):
    """Public — customer reads their appointment."""
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt


@router.post("/appointments/{appt_id}/confirm")
def confirm_appointment(appt_id: int, db: Session = Depends(get_db)):
    """Public — customer confirms the appointment."""
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = "confirmed"
    db.commit()
    emit_event(
        event="appointment_confirmed", agent=None, repair_id=appt_id,
        stage="appointment", status="confirmed",
        data={"tracking_id": appt.tracking_id, "customer_name": appt.customer_name},
    )
    return {"id": appt_id, "status": "confirmed"}


@router.post("/appointments/{appt_id}/reschedule-request")
def request_reschedule(
    appt_id: int,
    req: AppointmentRescheduleRequest,
    db: Session = Depends(get_db),
):
    """Public — customer requests a reschedule."""
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = "reschedule_requested"
    appt.reschedule_date = req.reschedule_date
    appt.reschedule_time = req.reschedule_time
    appt.reschedule_reason = req.reschedule_reason
    db.commit()
    emit_event(
        event="reschedule_requested", agent=None, repair_id=appt_id,
        stage="appointment", status="reschedule_requested",
        data={
            "tracking_id": appt.tracking_id,
            "customer_name": appt.customer_name,
            "reschedule_date": req.reschedule_date,
            "reschedule_time": req.reschedule_time,
        },
    )
    return {"id": appt_id, "status": "reschedule_requested"}


@router.post("/appointments/{appt_id}/approve-reschedule")
def approve_reschedule(
    appt_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    """Mechanic approves the customer's reschedule request."""
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.status != "reschedule_requested":
        raise HTTPException(status_code=400, detail="No reschedule request pending")
    appt.appointment_date = appt.reschedule_date
    appt.appointment_time = appt.reschedule_time
    appt.reschedule_date = None
    appt.reschedule_time = None
    appt.reschedule_reason = None
    appt.status = "rescheduled"
    db.commit()
    emit_event(
        event="reschedule_approved", agent=None, repair_id=appt_id,
        stage="appointment", status="rescheduled",
        data={"tracking_id": appt.tracking_id, "customer_name": appt.customer_name,
              "appointment_date": appt.appointment_date, "appointment_time": appt.appointment_time},
    )
    return {"id": appt_id, "status": "rescheduled"}


@router.post("/appointments/{appt_id}/reject-reschedule")
def reject_reschedule(
    appt_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    """Mechanic rejects the reschedule request — keeps original date."""
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = "confirmed"
    appt.reschedule_date = None
    appt.reschedule_time = None
    appt.reschedule_reason = None
    db.commit()
    emit_event(
        event="reschedule_rejected", agent=None, repair_id=appt_id,
        stage="appointment", status="confirmed",
        data={"tracking_id": appt.tracking_id, "customer_name": appt.customer_name},
    )
    return {"id": appt_id, "status": "confirmed"}


@router.patch("/appointments/{appt_id}/status")
def update_appointment_status(
    appt_id: int,
    body: dict,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    """Mechanic updates appointment status (missed, reschedule with new date)."""
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    new_status = body.get("status")
    if new_status:
        appt.status = new_status
    if body.get("appointment_date"):
        appt.appointment_date = body["appointment_date"]
    if body.get("appointment_time"):
        appt.appointment_time = body["appointment_time"]
    db.commit()
    # Notify customer if missed
    if new_status == "missed":
        sr = db.query(ServiceRequest).filter(ServiceRequest.id == appt.service_request_id).first()
        db.add(Notification(
            repair_id=appt.id,
            customer_name=appt.customer_name,
            notification_type="appointment_missed",
            message=f"Hi {appt.customer_name}, your appointment on {appt.appointment_date} at {appt.appointment_time} was marked as missed. Please contact us to reschedule.",
            channel="SMS",
            status="Sent",
        ))
        db.commit()
    emit_event(
        event="appointment_status_updated", agent=None, repair_id=appt_id,
        stage="appointment", status=new_status or "updated",
        data={"tracking_id": appt.tracking_id, "customer_name": appt.customer_name, "status": new_status},
    )
    return {"id": appt_id, "status": appt.status, "appointment_date": appt.appointment_date, "appointment_time": appt.appointment_time}


@router.post("/appointments/{appt_id}/bike-received")
async def bike_received(
    appt_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    """
    Mechanic marks bike as received on appointment day.
    This triggers the full 6-agent AI workflow.
    """
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.status == "bike_received":
        raise HTTPException(status_code=400, detail="Bike already received")

    sr = db.query(ServiceRequest).filter(
        ServiceRequest.id == appt.service_request_id
    ).first()

    # Upsert customer
    cust = db.query(Customer).filter(Customer.phone == appt.customer_phone).first()
    if not cust:
        cust = Customer(
            name=appt.customer_name,
            phone=appt.customer_phone,
            email=sr.email if sr else None,
            address=sr.address if sr else None,
        )
        db.add(cust)
        db.commit()
        db.refresh(cust)

    payload = {
        "customer_details": {
            "customer_name": appt.customer_name,
            "phone": appt.customer_phone,
            "email": sr.email if sr else "",
            "address": sr.address if sr else "",
        },
        "bike_details": {
            "bike_model": appt.bike_model,
            "brand": appt.bike_brand or "",
            "registration_number": appt.registration_number or "",
            "manufacturing_year": None,
            "fuel_type": "Petrol",
        },
        "complaint": appt.complaint,
    }
    try:
        result = await run_workflow(db, payload, customer_id=cust.id)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    repair_id = result.get("repair_id")
    tracking_id = f"REP{repair_id}"

    # Update appointment with real repair_id and tracking_id
    appt.status = "bike_received"
    appt.repair_id = repair_id
    appt.tracking_id = tracking_id
    if sr:
        sr.repair_id = repair_id
        sr.tracking_id = tracking_id
        sr.status = "accepted"
    db.commit()

    emit_event(
        event="bike_received", agent=None, repair_id=repair_id,
        stage="intake", status="completed",
        data={"tracking_id": tracking_id, "customer_name": appt.customer_name,
              "repair_id": repair_id, "appointment_id": appt_id},
    )
    return {**result, "tracking_id": tracking_id, "appointment_id": appt_id}


# ── Diagnosis Agent (Agent 2 — mechanic-driven) ─────────────────────────────

@router.get("/diagnosis/appointment/{appointment_id}")
def get_diagnosis_context(appointment_id: int, db: Session = Depends(get_db), _: Mechanic = Depends(get_current_mechanic)):
    """Load all context needed for diagnosis: appointment, service request, repair history."""
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.status != "bike_received":
        raise HTTPException(status_code=400, detail=f"Bike not received yet. Status: {appt.status}")

    sr = db.query(ServiceRequest).filter(ServiceRequest.id == appt.service_request_id).first()

    # Repair history for this customer phone
    history = (
        db.query(RepairRecord)
        .filter(RepairRecord.customer_phone == appt.customer_phone)
        .order_by(RepairRecord.created_at.desc())
        .limit(5).all()
    )

    # Existing diagnosis if already run
    existing = db.query(Diagnosis).filter(Diagnosis.appointment_id == appointment_id).first()

    return {
        "appointment_id": appt.id,
        "repair_id": appt.repair_id,
        "customer_name": appt.customer_name,
        "customer_phone": appt.customer_phone,
        "bike_model": appt.bike_model,
        "bike_brand": appt.bike_brand or "",
        "registration_number": appt.registration_number or "",
        "complaint": appt.complaint,
        "service_request_id": appt.service_request_id,
        "email": sr.email if sr else "",
        "address": sr.address if sr else "",
        "repair_history": [
            {"repair_id": r.repair_id, "complaint": r.complaint,
             "repair_status": r.repair_status, "severity": r.severity,
             "created_at": str(r.created_at)}
            for r in history
        ],
        "existing_diagnosis": _diagnosis_to_dict(existing) if existing else None,
    }


@router.post("/diagnosis/run")
def run_diagnosis(
    body: dict,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    """
    Mechanic triggers AI diagnosis for a received bike.
    Runs local diagnosis engine, saves result, updates repair status,
    then automatically runs inventory check.
    """
    import json as _json
    from agent_orchestrator import _local_diagnosis, _SEVERITY_TO_PRIORITY
    from inventory_agent import run_inventory_agent, seed_parts

    appointment_id = body.get("appointment_id")
    repair_id = body.get("repair_id")
    inspection_notes = body.get("inspection_notes", "")
    additional_symptoms = body.get("additional_symptoms", "")

    if repair_id is None:
        raise HTTPException(status_code=400, detail="repair_id is required")

    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first() if appointment_id else None
    repair = db.query(RepairRecord).filter(RepairRecord.repair_id == repair_id).first()
    if not repair:
        raise HTTPException(status_code=404, detail="Repair record not found")

    # Build complaint text including mechanic notes
    complaint = repair.complaint or ""
    full_complaint = complaint
    if inspection_notes:
        full_complaint += f". Mechanic notes: {inspection_notes}"
    if additional_symptoms:
        full_complaint += f". Additional symptoms: {additional_symptoms}"

    # Run local AI diagnosis engine
    diag_result = _local_diagnosis(full_complaint, repair.bike_model or "")

    severity = diag_result.get("repair_severity", "Medium")
    priority = _SEVERITY_TO_PRIORITY.get(severity, "Medium")

    # Upsert diagnosis record
    existing = db.query(Diagnosis).filter(Diagnosis.repair_id == repair_id).first()
    if existing:
        diag_rec = existing
    else:
        diag_rec = Diagnosis(repair_id=repair_id)
        db.add(diag_rec)

    diag_rec.appointment_id = appointment_id
    diag_rec.customer_name = repair.customer_name
    diag_rec.bike_model = repair.bike_model
    diag_rec.complaint = complaint
    diag_rec.inspection_notes = inspection_notes
    diag_rec.additional_symptoms = additional_symptoms
    diag_rec.root_cause = diag_result.get("possible_cause", "")
    diag_rec.recommended_repair = diag_result.get("ai_explanation", "")
    diag_rec.faulty_components = _json.dumps(diag_result.get("faulty_components", []))
    diag_rec.required_parts = _json.dumps(diag_result.get("required_parts", []))
    diag_rec.estimated_repair_time = diag_result.get("estimated_repair_time", "")
    diag_rec.estimated_labor_charge = diag_result.get("estimated_labor_charge", 500.0)
    diag_rec.repair_severity = severity
    diag_rec.priority = priority
    diag_rec.confidence_score = diag_result.get("confidence_score", 70)
    diag_rec.ai_explanation = diag_result.get("ai_explanation", "")
    diag_rec.status = "completed"
    db.commit()
    db.refresh(diag_rec)

    # Update repair record severity/priority
    repair.severity = severity
    repair.priority = priority
    repair.repair_status = "Diagnosis Completed"
    db.commit()

    # Auto-trigger inventory check
    seed_parts(db)
    required_parts = diag_result.get("required_parts", [])
    inv_result = _check_inventory_for_parts(db, repair_id, required_parts)

    return {
        "diagnosis": _diagnosis_to_dict(diag_rec),
        "inventory": inv_result,
        "message": "Diagnosis completed and inventory checked successfully",
    }


@router.get("/diagnosis/{repair_id}")
def get_diagnosis(repair_id: int, db: Session = Depends(get_db), _: Mechanic = Depends(get_current_mechanic)):
    diag = db.query(Diagnosis).filter(Diagnosis.repair_id == repair_id).first()
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    return _diagnosis_to_dict(diag)


def _diagnosis_to_dict(d):
    import json as _json
    if not d:
        return None
    return {
        "id": d.id,
        "repair_id": d.repair_id,
        "appointment_id": d.appointment_id,
        "customer_name": d.customer_name,
        "bike_model": d.bike_model,
        "complaint": d.complaint,
        "inspection_notes": d.inspection_notes,
        "additional_symptoms": d.additional_symptoms,
        "root_cause": d.root_cause,
        "recommended_repair": d.recommended_repair,
        "faulty_components": _json.loads(d.faulty_components) if d.faulty_components else [],
        "required_parts": _json.loads(d.required_parts) if d.required_parts else [],
        "estimated_repair_time": d.estimated_repair_time,
        "estimated_labor_charge": d.estimated_labor_charge,
        "repair_severity": d.repair_severity,
        "priority": d.priority,
        "confidence_score": d.confidence_score,
        "ai_explanation": d.ai_explanation,
        "status": d.status,
        "created_at": str(d.created_at),
    }


# ── Inventory Agent — per-repair check ───────────────────────────────────────

def _check_inventory_for_parts(db: Session, repair_id: int, required_parts: list) -> dict:
    """Check inventory for required parts and reserve available stock."""
    import json as _json
    from inventory_agent import _find_part, seed_parts
    from datetime import datetime
    seed_parts(db)

    part_results = []
    total_cost = 0.0

    for item in required_parts:
        if isinstance(item, str):
            part_name, qty_needed = item, 1
        else:
            part_name = item.get("part_name") or item.get("part", str(item))
            qty_needed = int(item.get("quantity", 1))

        part = _find_part(db, part_name)
        available = part.quantity if part else 0
        reserved = part.reserved_quantity if part else 0
        unit_price = part.unit_price if part else 0.0
        threshold = part.low_stock_threshold if part else 3

        if part and available >= qty_needed:
            # Reserve the quantity
            part.quantity -= qty_needed
            part.reserved_quantity = (part.reserved_quantity or 0) + qty_needed
            part.updated_at = datetime.utcnow()
            db.commit()
            status = "Available"
            reserved_now = qty_needed
            need_to_purchase = 0
        elif part and available > 0:
            # Partial
            reserved_now = available
            need_to_purchase = qty_needed - available
            part.reserved_quantity = (part.reserved_quantity or 0) + available
            part.quantity = 0
            part.updated_at = datetime.utcnow()
            db.commit()
            status = "Low Stock"
        else:
            reserved_now = 0
            need_to_purchase = qty_needed
            status = "Out of Stock"

        total_cost += unit_price * reserved_now
        part_results.append({
            "part_name": part.part_name if part else part_name,
            "required_quantity": qty_needed,
            "available_quantity": available,
            "reserved_quantity": reserved_now,
            "minimum_stock": threshold,
            "unit_price": unit_price,
            "total_price": round(unit_price * reserved_now, 2),
            "status": status,
            "need_to_purchase": need_to_purchase,
        })

    overall = "PARTS_RESERVED"
    if any(p["status"] == "Out of Stock" for p in part_results):
        overall = "MISSING_PARTS" if all(p["status"] == "Out of Stock" for p in part_results) else "ALTERNATIVES_USED"
    elif any(p["status"] == "Low Stock" for p in part_results):
        overall = "ALTERNATIVES_USED"

    low_stock = db.query(SparePart).filter(SparePart.quantity <= SparePart.low_stock_threshold).all()
    out_of_stock = db.query(SparePart).filter(SparePart.quantity == 0).all()

    return {
        "repair_id": repair_id,
        "status": overall,
        "parts": part_results,
        "total_parts_cost": round(total_cost, 2),
        "low_stock_alerts": [{"part_name": p.part_name, "quantity": p.quantity, "threshold": p.low_stock_threshold} for p in low_stock],
        "out_of_stock_alerts": [{"part_name": p.part_name} for p in out_of_stock],
    }


@router.post("/inventory/check/{repair_id}")
def inventory_check(
    repair_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    """Re-run inventory check for a repair using its saved diagnosis."""
    import json as _json
    diag = db.query(Diagnosis).filter(Diagnosis.repair_id == repair_id).first()
    if not diag:
        raise HTTPException(status_code=404, detail="No diagnosis found for this repair")
    required_parts = _json.loads(diag.required_parts) if diag.required_parts else []
    return _check_inventory_for_parts(db, repair_id, required_parts)


@router.get("/inventory/result/{repair_id}")
def get_inventory_result(
    repair_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    """Get inventory check result for a repair (from diagnosis required_parts, read-only)."""
    import json as _json
    from inventory_agent import _find_part, seed_parts
    seed_parts(db)

    diag = db.query(Diagnosis).filter(Diagnosis.repair_id == repair_id).first()
    if not diag:
        raise HTTPException(status_code=404, detail="No diagnosis found")

    required_parts = _json.loads(diag.required_parts) if diag.required_parts else []
    part_results = []
    for item in required_parts:
        if isinstance(item, str):
            part_name, qty_needed = item, 1
        else:
            part_name = item.get("part_name") or item.get("part", str(item))
            qty_needed = int(item.get("quantity", 1))
        part = _find_part(db, part_name)
        available = part.quantity if part else 0
        reserved = part.reserved_quantity if part else 0
        unit_price = part.unit_price if part else 0.0
        threshold = part.low_stock_threshold if part else 3
        if available >= qty_needed:
            status = "Available"
        elif available > 0:
            status = "Low Stock"
        else:
            status = "Out of Stock"
        need_to_purchase = max(0, qty_needed - available)
        part_results.append({
            "part_name": part.part_name if part else part_name,
            "required_quantity": qty_needed,
            "available_quantity": available,
            "reserved_quantity": reserved,
            "minimum_stock": threshold,
            "unit_price": unit_price,
            "total_price": round(unit_price * min(available, qty_needed), 2),
            "status": status,
            "need_to_purchase": need_to_purchase,
        })

    low_stock = db.query(SparePart).filter(SparePart.quantity <= SparePart.low_stock_threshold).all()
    out_of_stock = db.query(SparePart).filter(SparePart.quantity == 0).all()
    return {
        "repair_id": repair_id,
        "parts": part_results,
        "low_stock_alerts": [{"part_name": p.part_name, "quantity": p.quantity, "threshold": p.low_stock_threshold} for p in low_stock],
        "out_of_stock_alerts": [{"part_name": p.part_name} for p in out_of_stock],
    }


# ── Inventory CRUD ────────────────────────────────────────────────────────────

@router.put("/inventory/parts/{part_id}")
def update_part(
    part_id: int,
    body: dict,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    from datetime import datetime
    part = db.query(SparePart).filter(SparePart.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    if "quantity" in body:
        part.quantity = int(body["quantity"])
    if "unit_price" in body:
        part.unit_price = float(body["unit_price"])
    if "low_stock_threshold" in body:
        part.low_stock_threshold = int(body["low_stock_threshold"])
    if "part_name" in body:
        part.part_name = body["part_name"]
    part.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(part)
    return {"id": part.id, "part_name": part.part_name, "quantity": part.quantity,
            "reserved_quantity": part.reserved_quantity or 0,
            "unit_price": part.unit_price, "low_stock_threshold": part.low_stock_threshold,
            "is_low_stock": part.quantity <= part.low_stock_threshold}


@router.delete("/inventory/parts/{part_id}")
def delete_part(
    part_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    part = db.query(SparePart).filter(SparePart.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    db.delete(part)
    db.commit()
    return {"deleted": part_id}


@router.patch("/inventory/parts/{part_id}/quantity")
def adjust_quantity(
    part_id: int,
    body: dict,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    """Increase or decrease quantity. body: {delta: int} positive=increase, negative=decrease."""
    from datetime import datetime
    part = db.query(SparePart).filter(SparePart.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    delta = int(body.get("delta", 0))
    part.quantity = max(0, part.quantity + delta)
    part.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(part)
    return {"id": part.id, "part_name": part.part_name, "quantity": part.quantity,
            "is_low_stock": part.quantity <= part.low_stock_threshold}


# ── Customers ─────────────────────────────────────────────────────────────────

@router.post("/customers", response_model=CustomerOut)
def create_customer(
    req: CustomerCreate,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    existing = db.query(Customer).filter(Customer.phone == req.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this phone already exists")
    cust = Customer(**req.model_dump())
    db.add(cust)
    db.commit()
    db.refresh(cust)
    return cust


@router.get("/customers", response_model=list[CustomerOut])
def list_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str = Query(""),
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    q = db.query(Customer)
    if search:
        q = q.filter(
            Customer.name.ilike(f"%{search}%") |
            Customer.phone.ilike(f"%{search}%")
        )
    return q.order_by(Customer.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/customers/count")
def count_customers(db: Session = Depends(get_db), _: Mechanic = Depends(get_current_mechanic)):
    return {"total": db.query(Customer).count()}


@router.get("/customers/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    return cust


@router.get("/customers/{customer_id}/repairs")
def get_customer_repairs(
    customer_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    return db.query(RepairRecord).filter(
        RepairRecord.customer_id == customer_id
    ).order_by(RepairRecord.created_at.desc()).all()


@router.put("/customers/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    req: CustomerCreate,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(cust, k, v)
    db.commit()
    db.refresh(cust)
    return cust


@router.delete("/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(cust)
    db.commit()
    return {"deleted": customer_id}


# ── Workflow ──────────────────────────────────────────────────────────────────

@router.post("/workflow/start")
async def start_workflow(
    request: WorkflowStartRequest,
    db: Session = Depends(get_db),
    mechanic: Mechanic = Depends(get_current_mechanic),
):
    """Execute the full 6-agent workflow. Auto-creates/links Customer record."""
    # Upsert customer by phone
    phone = request.customer_details.phone
    cust = db.query(Customer).filter(Customer.phone == phone).first()
    if not cust:
        cust = Customer(
            name=request.customer_details.customer_name,
            phone=phone,
            email=request.customer_details.email,
            address=request.customer_details.address,
        )
        db.add(cust)
        db.commit()
        db.refresh(cust)
    try:
        result = await run_workflow(db, request.model_dump(), customer_id=cust.id)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/workflow/history")
def workflow_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    runs = (
        db.query(WorkflowRun)
        .order_by(WorkflowRun.started_at.desc())
        .offset(skip).limit(limit).all()
    )
    total = db.query(WorkflowRun).count()
    return {"total": total, "runs": runs}


@router.get("/workflow/{workflow_id}", response_model=WorkflowRunOut)
def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    run = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return run


@router.get("/workflow/{workflow_id}/outputs")
def get_workflow_outputs(
    workflow_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    outputs = db.query(AgentOutput).filter(AgentOutput.workflow_id == workflow_id).all()
    return [
        {
            "agent_name": o.agent_name,
            "agent_number": o.agent_number,
            "output": json.loads(o.output_json),
            "created_at": o.created_at,
        }
        for o in outputs
    ]


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard/stats")
async def dashboard_stats(
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    from inventory_agent import seed_parts
    seed_parts(db)
    total_customers = db.query(Customer).count()
    total_repairs = db.query(RepairRecord).count()
    pending = db.query(RepairRecord).filter(RepairRecord.repair_status == "Pending").count()
    in_progress = db.query(RepairRecord).filter(RepairRecord.repair_status == "In Progress").count()
    completed = db.query(RepairRecord).filter(RepairRecord.repair_status == "Completed").count()
    revenue = sum(r.grand_total for r in db.query(RepairRecord).all() if r.grand_total)
    workflows_today = db.query(WorkflowRun).count()
    failed_workflows = db.query(WorkflowRun).filter(WorkflowRun.status == "failed").count()
    low_stock_count = db.query(SparePart).filter(
        SparePart.quantity <= SparePart.low_stock_threshold
    ).count()
    invoices_generated = db.query(RepairRecord).filter(
        RepairRecord.invoice_id.isnot(None)
    ).count()
    pending_payments = db.query(RepairRecord).filter(
        RepairRecord.invoice_id.isnot(None),
        RepairRecord.payment_status != "Paid"
    ).count()
    pending_service_requests = db.query(ServiceRequest).filter(ServiceRequest.status == "pending").count()
    bike_received_count = db.query(Appointment).filter(Appointment.status == "bike_received").count()
    return {
        "total_customers": total_customers,
        "total_repairs": total_repairs,
        "pending_repairs": pending,
        "in_progress_repairs": in_progress,
        "completed_repairs": completed,
        "total_revenue": round(revenue, 2),
        "workflows_today": workflows_today,
        "failed_workflows": failed_workflows,
        "low_stock_count": low_stock_count,
        "invoices_generated": invoices_generated,
        "pending_payments": pending_payments,
        "pending_service_requests": pending_service_requests,
        "bike_received_count": bike_received_count,
    }


# ── Repairs ───────────────────────────────────────────────────────────────────

@router.get("/repairs")
def list_repairs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    records = (
        db.query(RepairRecord)
        .order_by(RepairRecord.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    total = db.query(RepairRecord).count()
    return {"total": total, "records": records}


@router.get("/repairs/{repair_id}/status")
def get_repair_status(repair_id: int, db: Session = Depends(get_db)):
    """Public endpoint — used by customer portal (no JWT required)."""
    record = db.query(RepairRecord).filter(RepairRecord.repair_id == repair_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Repair not found")
    notifs = (
        db.query(Notification)
        .filter(Notification.repair_id == repair_id)
        .order_by(Notification.sent_at.desc())
        .limit(20).all()
    )
    return {
        "repair_id": record.repair_id,
        "customer_id": record.customer_id,
        "customer_name": record.customer_name,
        "bike_model": record.bike_model,
        "brand": record.brand,
        "complaint": record.complaint,
        "priority": record.priority,
        "severity": record.severity,
        "repair_status": record.repair_status,
        "invoice_id": record.invoice_id,
        "grand_total": record.grand_total,
        "payment_status": record.payment_status,
        "payment_method": record.payment_method,
        "paid_at": record.paid_at,
        "created_at": record.created_at,
        "completed_at": record.completed_at,
        "notifications": [
            {"type": n.notification_type, "message": n.message, "sent_at": n.sent_at}
            for n in notifs
        ],
    }


@router.get("/repairs/{repair_id}", response_model=RepairRecordOut)
def get_repair(
    repair_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    record = db.query(RepairRecord).filter(RepairRecord.repair_id == repair_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Repair not found")
    return record


@router.delete("/repairs/{repair_id}")
def delete_repair(
    repair_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    record = db.query(RepairRecord).filter(RepairRecord.repair_id == repair_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Repair not found")
    db.delete(record)
    db.commit()
    return {"deleted": repair_id}


@router.delete("/workflow/{workflow_id}")
def delete_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    from models import WorkflowLog, AgentOutput
    run = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(run)
    db.commit()
    return {"deleted": workflow_id}


@router.patch("/repairs/{repair_id}/status")
async def update_repair_status(
    repair_id: int,
    body: dict,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    record = db.query(RepairRecord).filter(RepairRecord.repair_id == repair_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Repair not found")
    new_status = body.get("repair_status")
    if not new_status:
        raise HTTPException(status_code=400, detail="repair_status required")
    record.repair_status = new_status
    db.commit()
    db.refresh(record)
    emit_event(
        event="repair_status_updated", agent="Agent 5",
        repair_id=repair_id, stage="repair", status="in_progress",
        data={"repair_status": new_status},
    )
    return {"repair_id": repair_id, "repair_status": new_status}


@router.post("/repairs/{repair_id}/complete")
async def mark_repair_complete(
    repair_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    record = db.query(RepairRecord).filter(RepairRecord.repair_id == repair_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Repair not found")
    if record.repair_status == "Completed":
        raise HTTPException(status_code=400, detail="Repair already completed")
    try:
        result = await complete_repair_workflow(db, repair_id)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Notifications ─────────────────────────────────────────────────────────────

@router.get("/notifications")
def list_notifications(
    repair_id: int = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Public — customer portal reads notifications without JWT."""
    q = db.query(Notification)
    if repair_id:
        q = q.filter(Notification.repair_id == repair_id)
    total = q.count()
    records = q.order_by(Notification.sent_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "notifications": records}


# ── Inventory ─────────────────────────────────────────────────────────────────

class AddStockRequest(BaseModel):
    part_name: str
    quantity: int
    unit_price: Optional[float] = None


@router.get("/inventory/parts")
def list_parts(
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    parts = get_all_parts(db)
    return [{"id": p.id, "part_name": p.part_name, "quantity": p.quantity,
             "reserved_quantity": p.reserved_quantity or 0,
             "unit_price": p.unit_price, "low_stock_threshold": p.low_stock_threshold,
             "is_low_stock": p.quantity <= p.low_stock_threshold} for p in parts]


@router.get("/inventory/low-stock")
def low_stock(db: Session = Depends(get_db), _: Mechanic = Depends(get_current_mechanic)):
    parts = get_low_stock_parts(db)
    return [{"id": p.id, "part_name": p.part_name, "quantity": p.quantity,
             "unit_price": p.unit_price, "low_stock_threshold": p.low_stock_threshold} for p in parts]


@router.get("/inventory/stats")
def inventory_stats(db: Session = Depends(get_db), _: Mechanic = Depends(get_current_mechanic)):
    from inventory_agent import seed_parts
    seed_parts(db)
    total = db.query(SparePart).count()
    low = db.query(SparePart).filter(SparePart.quantity <= SparePart.low_stock_threshold).count()
    out_of_stock = db.query(SparePart).filter(SparePart.quantity == 0).count()
    return {"total_parts": total, "low_stock_items": low, "out_of_stock": out_of_stock}


@router.post("/inventory/add-stock")
def add_spare_part_stock(
    req: AddStockRequest,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    part = add_stock(db, req.part_name, req.quantity, req.unit_price)
    return {"id": part.id, "part_name": part.part_name, "quantity": part.quantity,
            "unit_price": part.unit_price}


# ── Billing / Payment ─────────────────────────────────────────────────────────

@router.post("/billing/{repair_id}/pay")
def record_payment(repair_id: int, body: dict, db: Session = Depends(get_db)):
    """Public — customer pays without JWT."""
    record = db.query(RepairRecord).filter(RepairRecord.repair_id == repair_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Repair not found")
    if record.payment_status == "Paid":
        raise HTTPException(status_code=400, detail="Already paid")
    if not record.invoice_id:
        raise HTTPException(status_code=400, detail="Invoice not generated yet")
    from datetime import datetime
    method = body.get("payment_method", "Cash")
    is_paid = method in ("UPI", "Card", "Net Banking", "Cash_Collected")
    display_method = "Cash" if method == "Cash_Collected" else method
    record.payment_method = display_method
    record.payment_status = "Paid" if is_paid else "Pending"
    if is_paid:
        record.paid_at = datetime.utcnow()
    db.commit()
    db.refresh(record)
    emit_event(
        event="payment_received" if is_paid else "payment_pending",
        agent=None, repair_id=repair_id,
        stage="payment", status="completed" if is_paid else "in_progress",
        data={
            "invoice_id": record.invoice_id,
            "grand_total": record.grand_total,
            "payment_status": record.payment_status,
            "payment_method": display_method,
            "customer_name": record.customer_name,
        },
    )
    return {
        "repair_id": repair_id,
        "invoice_id": record.invoice_id,
        "grand_total": record.grand_total,
        "payment_status": record.payment_status,
        "payment_method": display_method,
        "paid_at": record.paid_at.isoformat() if record.paid_at else None,
    }


@router.post("/billing/{repair_id}/mark-cash-paid")
def mark_cash_paid(
    repair_id: int,
    db: Session = Depends(get_db),
    _: Mechanic = Depends(get_current_mechanic),
):
    """Mechanic marks cash as collected."""
    record = db.query(RepairRecord).filter(RepairRecord.repair_id == repair_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Repair not found")
    from datetime import datetime
    record.payment_status = "Paid"
    record.paid_at = datetime.utcnow()
    db.commit()
    db.refresh(record)
    emit_event(
        event="payment_received", agent=None, repair_id=repair_id,
        stage="payment", status="completed",
        data={"invoice_id": record.invoice_id, "grand_total": record.grand_total,
              "payment_status": "Paid", "payment_method": record.payment_method,
              "customer_name": record.customer_name},
    )
    return {"repair_id": repair_id, "payment_status": "Paid"}


@router.get("/billing/all")
async def proxy_billing_all(_: Mechanic = Depends(get_current_mechanic)):
    try:
        return await billing_get_all()
    except Exception:
        return []


# ── Tracking ID lookup (public) ────────────────────────────────────────────────────

@router.get("/track/{tracking_id}", response_model=TrackingLookupResponse)
def lookup_tracking_id(tracking_id: str, db: Session = Depends(get_db)):
    tid = tracking_id.upper()
    # REP{id} — repair-based tracking
    if tid.startswith("REP"):
        try:
            rid = int(tid.replace("REP", ""))
        except ValueError:
            raise HTTPException(status_code=404, detail="Tracking ID not found")
        record = db.query(RepairRecord).filter(RepairRecord.repair_id == rid).first()
        if not record:
            raise HTTPException(status_code=404, detail="Tracking ID not found")
        return TrackingLookupResponse(
            repair_id=record.repair_id,
            customer_name=record.customer_name,
            bike_model=record.bike_model,
            repair_status=record.repair_status,
        )
    # APT{id} — appointment-based tracking (before bike received)
    if tid.startswith("APT"):
        try:
            aid = int(tid.replace("APT", ""))
        except ValueError:
            raise HTTPException(status_code=404, detail="Tracking ID not found")
        appt = db.query(Appointment).filter(Appointment.id == aid).first()
        if not appt:
            raise HTTPException(status_code=404, detail="Tracking ID not found")
        return TrackingLookupResponse(
            repair_id=appt.repair_id or 0,
            customer_name=appt.customer_name,
            bike_model=appt.bike_model,
            repair_status=f"Appointment {appt.status.replace('_', ' ').title()}",
        )
    raise HTTPException(status_code=404, detail="Tracking ID not found")


# ── Chat ──────────────────────────────────────────────────────────────────────────────

@router.get("/chat/{repair_id}", response_model=list[ChatMessageOut])
def get_chat(repair_id: int, db: Session = Depends(get_db)):
    """Public — both customer and mechanic read chat history."""
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.repair_id == repair_id)
        .order_by(ChatMessage.sent_at.asc())
        .all()
    )


@router.post("/chat", response_model=ChatMessageOut)
def send_chat(req: ChatMessageCreate, db: Session = Depends(get_db)):
    """Public — customer or mechanic sends a message."""
    record = db.query(RepairRecord).filter(RepairRecord.repair_id == req.repair_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Repair not found")
    msg = ChatMessage(
        repair_id=req.repair_id,
        sender=req.sender,
        sender_name=req.sender_name,
        message=req.message,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    # Broadcast so the other side updates in real-time
    emit_event(
        event="chat_message",
        agent=req.sender,
        repair_id=req.repair_id,
        stage="chat",
        status="new",
        data={"sender": req.sender, "sender_name": req.sender_name, "message": req.message, "id": msg.id},
    )
    return msg
