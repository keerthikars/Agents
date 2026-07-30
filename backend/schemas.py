from pydantic import BaseModel
from typing import Optional, List, Any, Dict


# ── Auth ──────────────────────────────────────────────────────────────────────

class MechanicLoginRequest(BaseModel):
    username: str
    password: str


class CustomerRegisterRequest(BaseModel):
    name: str
    phone: str
    email: str
    password: str


class CustomerLoginRequest(BaseModel):
    phone: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    mechanic_name: Optional[str] = None


class CustomerTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    customer_id: int
    customer_name: str
    phone: str
    email: Optional[str] = None


class CustomerSessionResponse(BaseModel):
    repair_id: int
    customer_id: int
    customer_name: str
    phone: str
    bike_model: str


# ── Customer ──────────────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None


class CustomerOut(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str]
    address: Optional[str]
    created_at: Any

    class Config:
        from_attributes = True


# ── Existing ──────────────────────────────────────────────────────────────────

class CustomerDetails(BaseModel):
    customer_name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None


class BikeDetails(BaseModel):
    bike_model: str
    brand: str
    registration_number: Optional[str] = None
    manufacturing_year: Optional[int] = None
    fuel_type: Optional[str] = "Petrol"


class WorkflowStartRequest(BaseModel):
    customer_details: CustomerDetails
    bike_details: BikeDetails
    complaint: str


class WorkflowLogOut(BaseModel):
    id: int
    agent_name: str
    agent_number: int
    status: str
    message: Optional[str]
    timestamp: Any

    class Config:
        from_attributes = True


class AgentOutputOut(BaseModel):
    id: int
    agent_name: str
    agent_number: int
    output_json: str
    created_at: Any

    class Config:
        from_attributes = True


class WorkflowRunOut(BaseModel):
    id: int
    repair_id: Optional[int]
    customer_name: str
    bike_model: str
    complaint: str
    current_stage: str
    status: str
    error_message: Optional[str]
    started_at: Any
    completed_at: Optional[Any]
    logs: List[WorkflowLogOut] = []
    agent_outputs: List[AgentOutputOut] = []

    class Config:
        from_attributes = True


class RepairRecordOut(BaseModel):
    id: int
    repair_id: int
    customer_name: str
    customer_phone: Optional[str]
    bike_model: str
    brand: Optional[str]
    complaint: str
    priority: Optional[str]
    severity: Optional[str]
    repair_status: str
    invoice_id: Optional[str]
    grand_total: Optional[float]
    payment_status: Optional[str]
    created_at: Any
    completed_at: Optional[Any]

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: int
    repair_id: int
    customer_name: str
    notification_type: str
    message: str
    channel: str
    status: str
    sent_at: Any

    class Config:
        from_attributes = True


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatMessageCreate(BaseModel):
    repair_id: int
    sender: str        # 'customer' | 'mechanic'
    sender_name: str
    message: str


class ChatMessageOut(BaseModel):
    id: int
    repair_id: int
    sender: str
    sender_name: str
    message: str
    sent_at: Any

    class Config:
        from_attributes = True


# ── Service Requests (customer self-registration) ────────────────────────────

class ServiceRequestCreate(BaseModel):
    customer_id: Optional[int] = None
    customer_name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    bike_brand: str
    bike_model: str
    registration_number: Optional[str] = None
    complaint: str
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    emergency_contact: Optional[str] = None


class ServiceRequestOut(BaseModel):
    id: int
    customer_name: str
    phone: str
    email: Optional[str]
    address: Optional[str]
    bike_brand: str
    bike_model: str
    registration_number: Optional[str]
    complaint: str
    preferred_date: Optional[str]
    preferred_time: Optional[str]
    emergency_contact: Optional[str]
    status: str
    repair_id: Optional[int]
    tracking_id: Optional[str]
    created_at: Any

    class Config:
        from_attributes = True


# ── Appointments ─────────────────────────────────────────────────────────────

class AppointmentScheduleRequest(BaseModel):
    service_request_id: int
    appointment_date: str
    appointment_time: str
    inspection_duration: Optional[str] = "30 Minutes"
    mechanic_notes: Optional[str] = None


class AppointmentRescheduleRequest(BaseModel):
    reschedule_date: str
    reschedule_time: str
    reschedule_reason: Optional[str] = None


class AppointmentOut(BaseModel):
    id: int
    service_request_id: int
    repair_id: Optional[int]
    tracking_id: Optional[str]
    customer_name: str
    customer_phone: str
    bike_model: str
    bike_brand: Optional[str]
    registration_number: Optional[str]
    complaint: str
    appointment_date: str
    appointment_time: str
    inspection_duration: Optional[str]
    mechanic_notes: Optional[str]
    status: str
    reschedule_date: Optional[str]
    reschedule_time: Optional[str]
    reschedule_reason: Optional[str]
    created_at: Any
    updated_at: Any

    class Config:
        from_attributes = True


# ── Tracking ID lookup ────────────────────────────────────────────────────────

class TrackingLookupResponse(BaseModel):
    repair_id: int
    customer_name: str
    bike_model: str
    repair_status: str
