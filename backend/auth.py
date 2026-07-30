"""
auth.py — JWT authentication for Mechanic and Customer portals.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
from models import Mechanic, Customer

SECRET_KEY = os.getenv("JWT_SECRET", "mechmate-secret-key-change-in-production")
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12   # 12 hours

pwd_context          = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme        = OAuth2PasswordBearer(tokenUrl="/auth/mechanic/login", auto_error=False)
oauth2_customer      = OAuth2PasswordBearer(tokenUrl="/auth/customer/login",  auto_error=False)

DEFAULT_USERNAME = "mechanic"
DEFAULT_PASSWORD = "mechmate123"


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── Token helpers ─────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ── Seed default mechanic account ─────────────────────────────────────────────

def seed_mechanic(db: Session):
    """Create default mechanic account if none exists."""
    if db.query(Mechanic).count() == 0:
        db.add(Mechanic(
            username=DEFAULT_USERNAME,
            hashed_password=hash_password(DEFAULT_PASSWORD),
            full_name="Workshop Mechanic",
        ))
        db.commit()


# ── Mechanic dependency ───────────────────────────────────────────────────────

def get_current_mechanic(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Mechanic:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exc
    payload = decode_token(token)
    if not payload:
        raise credentials_exc
    username: str = payload.get("sub")
    if not username:
        raise credentials_exc
    mechanic = db.query(Mechanic).filter(Mechanic.username == username).first()
    if not mechanic or not mechanic.is_active:
        raise credentials_exc
    return mechanic


def get_current_mechanic_optional(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[Mechanic]:
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    username = payload.get("sub")
    if not username:
        return None
    return db.query(Mechanic).filter(Mechanic.username == username).first()


# ── Customer dependency ───────────────────────────────────────────────────────

def get_current_customer(
    token: str = Depends(oauth2_customer),
    db: Session = Depends(get_db),
) -> Customer:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired customer token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exc
    payload = decode_token(token)
    if not payload or payload.get("role") != "customer":
        raise credentials_exc
    customer_id = payload.get("sub")
    if not customer_id:
        raise credentials_exc
    customer = db.query(Customer).filter(Customer.id == int(customer_id)).first()
    if not customer:
        raise credentials_exc
    return customer


def get_current_customer_optional(
    token: str = Depends(oauth2_customer),
    db: Session = Depends(get_db),
) -> Optional[Customer]:
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("role") != "customer":
        return None
    customer_id = payload.get("sub")
    if not customer_id:
        return None
    return db.query(Customer).filter(Customer.id == int(customer_id)).first()
