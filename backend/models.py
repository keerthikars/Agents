from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Mechanic(Base):
    """Single mechanic / shop owner account."""
    __tablename__ = "mechanics"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Customer(Base):
    """Registered customers — one mechanic serves many customers."""
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False, unique=True, index=True)
    email = Column(String, nullable=True, unique=True, index=True)
    address = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)   # null for mechanic-created customers
    created_at = Column(DateTime, default=datetime.utcnow)

    repairs = relationship("RepairRecord", back_populates="customer", cascade="all, delete-orphan")


class WorkflowRun(Base):
    """Tracks each full multi-agent workflow execution."""
    __tablename__ = "workflow_runs"

    id = Column(Integer, primary_key=True, index=True)
    repair_id = Column(Integer, unique=True, index=True)
    customer_name = Column(String, nullable=False)
    bike_model = Column(String, nullable=False)
    complaint = Column(Text, nullable=False)
    current_stage = Column(String, default="intake")   # intake|diagnosis|inventory|repair|billing|notification|completed|failed
    status = Column(String, default="running")          # running|completed|failed
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    logs = relationship("WorkflowLog", back_populates="workflow", cascade="all, delete-orphan")
    agent_outputs = relationship("AgentOutput", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowLog(Base):
    """Per-agent execution log entries."""
    __tablename__ = "workflow_logs"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflow_runs.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    agent_number = Column(Integer, nullable=False)
    status = Column(String, nullable=False)   # started|completed|failed
    message = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    workflow = relationship("WorkflowRun", back_populates="logs")


class AgentOutput(Base):
    """Stores structured JSON output from each agent."""
    __tablename__ = "agent_outputs"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflow_runs.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    agent_number = Column(Integer, nullable=False)
    output_json = Column(Text, nullable=False)   # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

    workflow = relationship("WorkflowRun", back_populates="agent_outputs")


class RepairRecord(Base):
    """Central repair record linking all agents via repair_id."""
    __tablename__ = "repair_records"

    id = Column(Integer, primary_key=True, index=True)
    repair_id = Column(Integer, unique=True, index=True)
    # FK to Customer table (nullable for backward compat with existing rows)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, nullable=True)
    bike_model = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    complaint = Column(Text, nullable=False)
    priority = Column(String, nullable=True)
    severity = Column(String, nullable=True)
    repair_status = Column(String, default="Pending")   # Pending|In Progress|Completed
    invoice_id = Column(String, nullable=True)
    grand_total = Column(Float, nullable=True)
    payment_status = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)  # Cash|UPI|Card|Net Banking
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    customer = relationship("Customer", back_populates="repairs")


class SparePart(Base):
    """Local spare parts inventory stock."""
    __tablename__ = "spare_parts"

    id = Column(Integer, primary_key=True, index=True)
    part_name = Column(String, nullable=False, unique=True, index=True)
    quantity = Column(Integer, default=0)
    reserved_quantity = Column(Integer, default=0)
    unit_price = Column(Float, default=50.0)
    low_stock_threshold = Column(Integer, default=3)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Diagnosis(Base):
    """Diagnosis record created by mechanic after bike is received."""
    __tablename__ = "diagnoses"

    id = Column(Integer, primary_key=True, index=True)
    repair_id = Column(Integer, unique=True, index=True, nullable=False)
    appointment_id = Column(Integer, nullable=True)
    customer_name = Column(String, nullable=True)
    bike_model = Column(String, nullable=True)
    complaint = Column(Text, nullable=True)
    inspection_notes = Column(Text, nullable=True)
    additional_symptoms = Column(Text, nullable=True)
    root_cause = Column(Text, nullable=True)
    recommended_repair = Column(Text, nullable=True)
    faulty_components = Column(Text, nullable=True)   # JSON string
    required_parts = Column(Text, nullable=True)       # JSON string
    estimated_repair_time = Column(String, nullable=True)
    estimated_labor_charge = Column(Float, nullable=True)
    repair_severity = Column(String, nullable=True)
    priority = Column(String, nullable=True)
    confidence_score = Column(Integer, nullable=True)
    ai_explanation = Column(Text, nullable=True)
    status = Column(String, default="pending")  # pending | completed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Notification(Base):
    """Customer notification log."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    repair_id = Column(Integer, index=True, nullable=False)
    customer_name = Column(String, nullable=False)
    notification_type = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    channel = Column(String, default="SMS")
    status = Column(String, default="Sent")
    sent_at = Column(DateTime, default=datetime.utcnow)


class ServiceRequest(Base):
    """Customer self-registration before mechanic accepts."""
    __tablename__ = "service_requests"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    customer_name = Column(String, nullable=False)
    phone = Column(String, nullable=False, index=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    bike_brand = Column(String, nullable=False)
    bike_model = Column(String, nullable=False)
    registration_number = Column(String, nullable=True)
    complaint = Column(Text, nullable=False)
    preferred_date = Column(String, nullable=True)
    preferred_time = Column(String, nullable=True)
    emergency_contact = Column(String, nullable=True)
    # status: pending | accepted | rejected
    status = Column(String, default="pending", nullable=False)
    # set when mechanic accepts — links to RepairRecord
    repair_id = Column(Integer, nullable=True)
    tracking_id = Column(String, nullable=True)   # e.g. REP1001
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ChatMessage(Base):
    """Chat messages between customer and mechanic for a repair."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    repair_id = Column(Integer, index=True, nullable=False)
    sender = Column(String, nullable=False)   # 'customer' | 'mechanic'
    sender_name = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)


class Appointment(Base):
    """Appointment scheduled by mechanic after accepting a service request."""
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    service_request_id = Column(Integer, ForeignKey("service_requests.id"), nullable=False, index=True)
    repair_id = Column(Integer, nullable=True, index=True)   # set after bike_received triggers workflow
    tracking_id = Column(String, nullable=True, index=True)  # e.g. REP1001

    # Customer info (denormalised for quick access)
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, nullable=False)
    bike_model = Column(String, nullable=False)
    bike_brand = Column(String, nullable=True)
    registration_number = Column(String, nullable=True)
    complaint = Column(Text, nullable=False)

    # Appointment details
    appointment_date = Column(String, nullable=False)          # e.g. "2026-07-25"
    appointment_time = Column(String, nullable=False)          # e.g. "10:00 AM"
    inspection_duration = Column(String, nullable=True)        # e.g. "30 Minutes"
    mechanic_notes = Column(Text, nullable=True)

    # status: scheduled | confirmed | reschedule_requested | rescheduled | bike_received | missed | cancelled
    status = Column(String, default="scheduled", nullable=False)

    # Reschedule request from customer
    reschedule_date = Column(String, nullable=True)
    reschedule_time = Column(String, nullable=True)
    reschedule_reason = Column(Text, nullable=True)

    bike_received_at = Column(DateTime, nullable=True)  # timestamp when bike was received

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    service_request = relationship("ServiceRequest", backref="appointment")
