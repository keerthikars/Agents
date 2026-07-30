"""
inventory_agent.py — Agent 3 (built-in): Inventory Intelligence
Manages local spare parts stock. Auto-detects required parts from diagnosis,
deducts stock, tracks low-stock alerts. No external HTTP service needed.
"""

from datetime import datetime
from sqlalchemy.orm import Session
from models import SparePart, WorkflowLog

LOW_STOCK_THRESHOLD = 3

# Default parts catalogue seeded on first use
DEFAULT_PARTS = [
    ("Brake Pad",           20, 150.0),
    ("Brake Disc",          10, 800.0),
    ("Brake Cable",         15, 120.0),
    ("Engine Oil",          30, 250.0),
    ("Oil Filter",          25, 180.0),
    ("Air Filter",          20, 200.0),
    ("Spark Plug",          30, 100.0),
    ("Chain",               12, 600.0),
    ("Chain Sprocket",      10, 450.0),
    ("Clutch Plate",        8,  700.0),
    ("Clutch Cable",        15, 130.0),
    ("Throttle Cable",      12, 140.0),
    ("Tyre (Front)",        6,  1800.0),
    ("Tyre (Rear)",         6,  2000.0),
    ("Tube (Front)",        10, 300.0),
    ("Tube (Rear)",         10, 350.0),
    ("Battery",             8,  1500.0),
    ("Headlight Bulb",      20, 120.0),
    ("Indicator Bulb",      25, 50.0),
    ("Fuel Filter",         15, 200.0),
    ("Coolant",             18, 300.0),
    ("Radiator Cap",        10, 150.0),
    ("Shock Absorber",      4,  2500.0),
    ("Fork Oil",            12, 400.0),
    ("Wheel Bearing",       10, 350.0),
    ("Carburetor Jet",      8,  250.0),
    ("Piston Ring",         6,  900.0),
    ("Valve",               5,  600.0),
    ("Gasket Set",          8,  500.0),
    ("Exhaust Pipe",        4,  3000.0),
]


def seed_parts(db: Session):
    """Seed default parts if table is empty."""
    if db.query(SparePart).count() == 0:
        for name, qty, price in DEFAULT_PARTS:
            db.add(SparePart(part_name=name, quantity=qty, unit_price=price, low_stock_threshold=LOW_STOCK_THRESHOLD))
        db.commit()


def _normalize(name: str) -> str:
    return name.lower().strip()


def _find_part(db: Session, name: str) -> SparePart | None:
    """Fuzzy match part name from DB."""
    norm = _normalize(name)
    all_parts = db.query(SparePart).all()
    # Exact match first
    for p in all_parts:
        if _normalize(p.part_name) == norm:
            return p
    # Partial match
    for p in all_parts:
        if norm in _normalize(p.part_name) or _normalize(p.part_name) in norm:
            return p
    return None


def run_inventory_agent(
    db: Session,
    workflow_id: int,
    repair_id: int,
    required_parts: list,
) -> dict:
    """
    Process inventory for a repair:
    - Seed parts if needed
    - Match required parts to stock
    - Deduct quantities
    - Detect low stock
    - Return full inventory result
    """
    seed_parts(db)

    reserved_parts = []
    missing_parts = []
    low_stock_alerts = []
    total_parts_cost = 0.0

    for item in required_parts:
        part_name = item if isinstance(item, str) else item.get("part_name") or item.get("part", str(item))
        qty_needed = 1 if isinstance(item, str) else int(item.get("quantity", 1))

        part = _find_part(db, part_name)

        if part and part.quantity >= qty_needed:
            # Deduct stock
            part.quantity -= qty_needed
            db.commit()
            total_parts_cost += part.unit_price * qty_needed
            reserved_parts.append({
                "part": part.part_name,
                "quantity": qty_needed,
                "unit_price": part.unit_price,
                "remaining_stock": part.quantity,
            })
            # Check low stock after deduction
            if part.quantity <= part.low_stock_threshold:
                low_stock_alerts.append({
                    "part_name": part.part_name,
                    "remaining": part.quantity,
                    "threshold": part.low_stock_threshold,
                })
        elif part and part.quantity > 0:
            # Partial — reserve what's available
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
            low_stock_alerts.append({
                "part_name": part.part_name,
                "remaining": 0,
                "threshold": part.low_stock_threshold,
            })
        else:
            # Not found or out of stock
            missing_parts.append({"part_name": part_name, "quantity_short": qty_needed})

    # Determine overall status
    if not required_parts:
        status = "READY_FOR_REPAIR"
    elif missing_parts and not reserved_parts:
        status = "MISSING_PARTS"
    elif missing_parts:
        status = "ALTERNATIVES_USED"
    else:
        status = "PARTS_RESERVED"

    # Collect all current low-stock items (not just from this repair)
    all_low_stock = db.query(SparePart).filter(
        SparePart.quantity <= SparePart.low_stock_threshold
    ).all()
    all_low_stock_list = [
        {"part_name": p.part_name, "remaining": p.quantity, "threshold": p.low_stock_threshold}
        for p in all_low_stock
    ]

    _log(db, workflow_id,
         f"Inventory processed. Status={status}. Reserved={len(reserved_parts)}, "
         f"Missing={len(missing_parts)}, LowStock={len(all_low_stock_list)}")

    return {
        "repair_id": repair_id,
        "status": status,
        "reserved_parts": reserved_parts,
        "missing_parts": missing_parts,
        "low_stock_alerts": all_low_stock_list,
        "total_parts_cost": round(total_parts_cost, 2),
        "llm_reasoning": (
            f"Auto-processed {len(required_parts)} required parts. "
            f"Reserved {len(reserved_parts)}, missing {len(missing_parts)}. "
            f"{len(all_low_stock_list)} part(s) at low stock level."
        ),
    }


def get_all_parts(db: Session) -> list:
    seed_parts(db)
    return db.query(SparePart).order_by(SparePart.part_name).all()


def get_low_stock_parts(db: Session) -> list:
    seed_parts(db)
    return db.query(SparePart).filter(
        SparePart.quantity <= SparePart.low_stock_threshold
    ).order_by(SparePart.quantity).all()


def add_stock(db: Session, part_name: str, quantity: int, unit_price: float = None) -> SparePart:
    part = _find_part(db, part_name)
    if part:
        part.quantity += quantity
        if unit_price is not None:
            part.unit_price = unit_price
        part.updated_at = datetime.utcnow()
    else:
        part = SparePart(
            part_name=part_name,
            quantity=quantity,
            unit_price=unit_price or 50.0,
            low_stock_threshold=LOW_STOCK_THRESHOLD,
        )
        db.add(part)
    db.commit()
    db.refresh(part)
    return part


def _log(db: Session, workflow_id: int, message: str):
    db.add(WorkflowLog(
        workflow_id=workflow_id,
        agent_name="Inventory Intelligence Agent",
        agent_number=3,
        status="completed",
        message=message,
    ))
    db.commit()
