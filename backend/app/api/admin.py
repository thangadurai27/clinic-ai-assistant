"""
Users API — profile management for receptionist and patient roles.
No admin/doctor dashboard needed.
"""
from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Header
from pydantic import BaseModel, EmailStr

from app.db.supabase_client import get_supabase
from app.auth import auth_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Users"])


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


@router.get("/users", status_code=status.HTTP_200_OK)
async def list_users(
    role: Optional[str] = None,
    limit: int = 100,
) -> list:
    """List users — used by receptionist to see patients."""
    try:
        db = get_supabase()
        query = db.table("users").select("*").limit(limit).order("created_at", desc=True)
        if role:
            query = query.eq("role", role)
        res = query.execute()
        return res.data or []
    except Exception as e:
        logger.exception(f"Error listing users: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/system-stats", status_code=status.HTTP_200_OK)
async def system_stats() -> dict:
    """Basic system stats for the dashboard."""
    try:
        db = get_supabase()
        users_res = db.table("users").select("role", count="exact").execute()
        role_counts: dict[str, int] = {}
        for row in (users_res.data or []):
            r = row.get("role", "unknown")
            role_counts[r] = role_counts.get(r, 0) + 1
        return {
            "total_users": users_res.count or 0,
            "users_by_role": role_counts,
        }
    except Exception as e:
        logger.exception(f"Error fetching system stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/profile", status_code=status.HTTP_200_OK)
async def update_profile(
    body: ProfileUpdateRequest,
    authorization: Optional[str] = Header(None),
) -> dict:
    """Update current user's profile (name, phone)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")

    token = authorization.replace("Bearer ", "")
    user = await auth_service.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        db = get_supabase()
        update_data: dict = {}
        if body.full_name:
            update_data["full_name"] = body.full_name
        if body.phone is not None:
            update_data["phone"] = body.phone

        if not update_data:
            return {"success": True, "message": "No changes", "user": user}

        user_id = user.get("id") or user.get("auth_user_id")
        res = db.table("users").update(update_data).eq("id", user_id).execute()

        # Also update the patients table if role == patient
        if user.get("role") == "patient":
            pat_update: dict = {}
            if body.full_name:
                pat_update["name"] = body.full_name
            if body.phone is not None:
                pat_update["phone"] = body.phone
            if pat_update:
                db.table("patients").update(pat_update).eq("user_id", user_id).execute()

        updated_user = res.data[0] if res.data else user
        return {"success": True, "message": "Profile updated", "user": updated_user}
    except Exception as e:
        logger.exception(f"Profile update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile", status_code=status.HTTP_200_OK)
async def get_profile(authorization: Optional[str] = Header(None)) -> dict:
    """Get current user's full profile."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")

    token = authorization.replace("Bearer ", "")
    user = await auth_service.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {"success": True, "user": user}
