"""
Inventory Intelligence Agent — Standalone FastAPI service (port 8002)
Agent 3: Manages spare parts stock, processes repair part requests,
deducts inventory, tracks low-stock alerts.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime

# ── DB Setup ──────────────────────────────────────────────────────────────────

DATABASE_URL = "sqlite:///./inventory.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class SparePart(Base):
    __tablename__ = "spare_parts"
    id                  = Column(Integer, primary_key=True, index=True)
    part_name           = Column(String, nullable=False, unique=True, index=True)
    quantity            = Column(Integer, default=0)
    unit_price          = Column(Float, default=50.0)
    low_stock_threshold = Column(Integer, default=3)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


Base.metadata.create_all(bind=engine)

# ── Seed Data ─────────────────────────────────────────────────────────────────

DEFAULT_PARTS = [
    ("Brake Pad",       20, 150.0),  ("Brake Disc",      10, 800.0),
    ("Brake Cable",     15, 120.0),  ("Engine Oil",      30, 250.0),
    ("Oil Filter",      25, 180.0),  ("Air Filter",      20, 200.0),
    ("Spark Plug",      30, 100.0),  ("Chain",           12, 600.0),
    ("Chain Sprocket",  10, 450.0),  ("Clutch Plate",     8, 700.0),
    ("Clutch Cable",    15, 130.0),  ("Throttle Cable",  12, 140.0),
    ("Tyre (Front)",     6, 1800.0), ("Tyre (Rear)",      6, 2000.0),
    ("Tube (Front)",    10, 300.0),  ("Tube (Rear)",     10, 350.0),
    ("Battery",          8, 1500.0), ("Headlight Bulb",  20, 120.0),
    ("Indicator Bulb",  25, 50.0),   ("Fuel Filter",     15, 200.0),
    ("Coolant",         18, 300.0),  ("Radiator Cap",    10, 150.0),
    ("Shock Absorber",   4, 2500.0), ("Fork Oil",        12, 400.0),
    ("Wheel Bearing",   10, 350.0),  ("Carburetor Jet",   8, 250.0),
    ("Piston Ring",      6, 900.0),  ("Valve",            5, 600.0),
    ("Gasket Set",       8, 500.0),  ("Exhaust Pipe",     4, 3000.0),
]


def seed_parts(db: Session):
    if db.query(SparePart).count() == 0:
        for name, qty, price in DEFAULT_PARTS:
            db.add(SparePart(part_name=name, quantity=qty, unit_price=price, low_stock_threshold=3))
        db.commit()


def get_db():
    db = SessionLocal()
    try:
        seed_parts(db)
        yield db
    finally:
        db.close()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _find_part(db: Session, name: str) -> SparePart | None:
    norm = name.lower().strip()
    parts = db.query(SparePart).all()
    for p in parts:
        if p.part_name.lower().strip() == norm:
            return p
    for p in parts:
        if norm in p.part_name.lower() or p.part_name.lower() in norm:
            return p
    return None


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Inventory Intelligence Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class PartItem(BaseModel):
    part_name: str
    quantity: int = 1


class ProcessRepairRequest(BaseModel):
    repair_id: int
    bike_model: str
    required_parts: list[PartItem]


class AddStockRequest(BaseModel):
    part_name: str
    quantity: int
    unit_price: Optional[float] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"agent": "Inventory Intelligence Agent", "port": 8002}


@app.post("/inventory/process-repair")
def process_repair(req: ProcessRepairRequest):
    db = SessionLocal()
    seed_parts(db)
    try:
        reserved_parts = []
        missing_parts = []
        low_stock_alerts = []
        total_parts_cost = 0.0

        for item in req.required_parts:
            part_name = item.part_name
            qty_needed = item.quantity
            part = _find_part(db, part_name)

            if part and part.quantity >= qty_needed:
                part.quantity -= qty_needed
                db.commit()
                total_parts_cost += part.unit_price * qty_needed
                reserved_parts.append({
                    "part": part.part_name,
                    "quantity": qty_needed,
                    "unit_price": part.unit_price,
                    "remaining_stock": part.quantity,
                })
                if part.quantity <= part.low_stock_threshold:
                    low_stock_alerts.append({
                        "part_name": part.part_name,
                        "remaining": part.quantity,
                        "threshold": part.low_stock_threshold,
                    })
            elif part and part.quantity > 0:
                available = part.quantity
                part.quantity = 0
                db.commit()
                total_parts_cost += part.unit_price * available
                reserved_parts.append({
                    "part": part.part_name,
                    "quantity": available,
                    "unit_price": part.unit_price,
                    "remaining_stock": 0,
                    "note": f"Only {available} available, {qty_needed - available} short",
                })
                missing_parts.append({"part_name": part_name, "quantity_short": qty_needed - available})
                low_stock_alerts.append({"part_name": part.part_name, "remaining": 0, "threshold": part.low_stock_threshold})
            else:
                missing_parts.append({"part_name": part_name, "quantity_short": qty_needed})

        if not req.required_parts:
            status = "READY_FOR_REPAIR"
        elif missing_parts and not reserved_parts:
            status = "MISSING_PARTS"
        elif missing_parts:
            status = "ALTERNATIVES_USED"
        else:
            status = "PARTS_RESERVED"

        all_low = db.query(SparePart).filter(SparePart.quantity <= SparePart.low_stock_threshold).all()

        return {
            "repair_id": req.repair_id,
            "status": status,
            "reserved_parts": reserved_parts,
            "missing_parts": missing_parts,
            "low_stock_alerts": [{"part_name": p.part_name, "remaining": p.quantity, "threshold": p.low_stock_threshold} for p in all_low],
            "total_parts_cost": round(total_parts_cost, 2),
            "llm_reasoning": (
                f"Processed {len(req.required_parts)} required parts for repair #{req.repair_id} ({req.bike_model}). "
                f"Reserved {len(reserved_parts)}, missing {len(missing_parts)}. "
                f"{len(all_low)} part(s) at low stock level."
            ),
        }
    finally:
        db.close()


@app.get("/inventory/stats")
def inventory_stats():
    db = SessionLocal()
    seed_parts(db)
    try:
        total = db.query(SparePart).count()
        low   = db.query(SparePart).filter(SparePart.quantity <= SparePart.low_stock_threshold).count()
        out   = db.query(SparePart).filter(SparePart.quantity == 0).count()
        return {"total_parts": total, "low_stock_items": low, "out_of_stock": out}
    finally:
        db.close()


@app.get("/inventory/low-stock")
def low_stock():
    db = SessionLocal()
    seed_parts(db)
    try:
        parts = db.query(SparePart).filter(SparePart.quantity <= SparePart.low_stock_threshold).order_by(SparePart.quantity).all()
        return [{"id": p.id, "part_name": p.part_name, "quantity": p.quantity, "unit_price": p.unit_price, "low_stock_threshold": p.low_stock_threshold} for p in parts]
    finally:
        db.close()


@app.get("/inventory/parts")
def list_parts():
    db = SessionLocal()
    seed_parts(db)
    try:
        parts = db.query(SparePart).order_by(SparePart.part_name).all()
        return [{"id": p.id, "part_name": p.part_name, "quantity": p.quantity, "unit_price": p.unit_price,
                 "low_stock_threshold": p.low_stock_threshold, "is_low_stock": p.quantity <= p.low_stock_threshold} for p in parts]
    finally:
        db.close()


@app.post("/inventory/add-stock")
def add_stock(req: AddStockRequest):
    db = SessionLocal()
    try:
        part = _find_part(db, req.part_name)
        if part:
            part.quantity += req.quantity
            if req.unit_price is not None:
                part.unit_price = req.unit_price
            part.updated_at = datetime.utcnow()
        else:
            part = SparePart(
                part_name=req.part_name,
                quantity=req.quantity,
                unit_price=req.unit_price or 50.0,
                low_stock_threshold=3,
            )
            db.add(part)
        db.commit()
        db.refresh(part)
        return {"id": part.id, "part_name": part.part_name, "quantity": part.quantity, "unit_price": part.unit_price}
    finally:
        db.close()
