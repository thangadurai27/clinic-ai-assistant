"""Shared FastAPI authentication dependencies and demo-access guards."""
from __future__ import annotations

from typing import Optional

from fastapi import Depends, Header, HTTPException, status

from app.auth.service import auth_service
from app.demo.service import is_demo_user

STAFF_ROLES = {"admin", "doctor", "receptionist"}


def bearer_token(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token.strip()


async def get_current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    """Require a valid Supabase access token."""
    token = bearer_token(authorization)
    user = await auth_service.get_user_by_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")
    return user


async def get_optional_user(authorization: Optional[str] = Header(default=None)) -> Optional[dict]:
    """Resolve a user when a token is supplied; never reject anonymous callers."""
    if not authorization:
        return None
    try:
        token = bearer_token(authorization)
        return await auth_service.get_user_by_token(token)
    except HTTPException:
        return None


async def get_staff_user(user: dict = Depends(get_current_user)) -> dict:
    """Require a staff role (receptionist, doctor, or admin)."""
    if user.get("role") not in STAFF_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff access required")
    return user


async def get_staff_user_for_write(user: dict = Depends(get_staff_user)) -> dict:
    """Staff-only, and the public demo account is read-only."""
    if is_demo_user(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The public demo account is read-only. This action was blocked.",
        )
    return user


def reject_demo(user: dict, action: str = "perform this action") -> None:
    if is_demo_user(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"The public demo account cannot {action}. This action was blocked.",
        )
