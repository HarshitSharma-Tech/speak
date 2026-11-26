import json
import re
from datetime import datetime
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.user import User, UserProgress

router = APIRouter(tags=["Auth"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_MAX_PROGRESS_BYTES = 1_000_000


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    name: str = Field(..., min_length=1, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not _EMAIL_RE.match(cleaned):
            raise ValueError("Please provide a valid email address.")
        return cleaned

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Name cannot be blank.")
        return cleaned


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProgressPayload(BaseModel):
    data: Dict[str, Any]


class ProgressOut(BaseModel):
    data: Dict[str, Any]
    updated_at: Optional[datetime] = None


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    user_id = decode_access_token(token.strip())
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user


@router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.get("/progress", response_model=ProgressOut)
def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(UserProgress).filter(UserProgress.user_id == current_user.id).first()
    if not row:
        return ProgressOut(data={}, updated_at=None)
    try:
        parsed = json.loads(row.data_json or "{}")
        if not isinstance(parsed, dict):
            parsed = {}
    except Exception:
        parsed = {}
    return ProgressOut(data=parsed, updated_at=row.updated_at)


@router.put("/progress", response_model=ProgressOut)
def put_progress(
    payload: ProgressPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    serialized = json.dumps(payload.data)
    if len(serialized) > _MAX_PROGRESS_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Progress payload exceeds maximum size.",
        )

    row = db.query(UserProgress).filter(UserProgress.user_id == current_user.id).first()
    if not row:
        row = UserProgress(user_id=current_user.id, data_json=serialized)
        db.add(row)
    else:
        row.data_json = serialized
        row.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(row)
    return ProgressOut(data=payload.data, updated_at=row.updated_at)
