"""
Authentication API endpoints — Production-ready auth system.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, status, Depends, Header
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.auth import auth_service
from app.auth.dependencies import get_current_user
from app.demo.service import demo_public_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── Request/Response Models ─────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class AuthResponse(BaseModel):
    success: bool
    message: str
    user: Optional[dict] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[int] = None


# ─── Authentication Endpoints ────────────────────────────────────────────────


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """
    Register a new user as a patient.
    
    Roles are assigned automatically:
    - All self-registrations are 'patient'
    - Staff/Doctor accounts are created by administrators
    """
    logger.info(f"Received registration request: email={request.email}, full_name={request.full_name}, phone={request.phone}")
    
    # Password strength validation (basic)
    if len(request.password) < 8:
        logger.warning(f"Registration failed: password too short for email={request.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    logger.info(f"Calling auth_service.register_user for email={request.email}")
    result = await auth_service.register_user(
        email=request.email,
        password=request.password,
        full_name=request.full_name,
        phone=request.phone,
        role="patient",
    )
    
    logger.info(f"auth_service.register_user result: {result}")
    
    if not result["success"]:
        logger.warning(f"Registration failed: {result['message']} for email={request.email}")
        error_code = result.get("error_code")
        status_code = status.HTTP_400_BAD_REQUEST
        if error_code == "email_exists":
            status_code = status.HTTP_409_CONFLICT
        elif error_code == "service_unavailable":
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        raise HTTPException(status_code=status_code, detail=result["message"])

    return AuthResponse(**result)


@router.get("/demo-config")
async def demo_config() -> dict:
    """
    Public demo configuration.

    These credentials are intentionally public and are displayed on the login
    page. Disable demo mode with DEMO_MODE_ENABLED=false to stop advertising and
    provisioning the account.
    """
    return demo_public_config()


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login with email and password."""
    result = await auth_service.login_user(
        email=request.email,
        password=request.password,
    )
    
    if not result["success"]:
        error_code = result.get("error_code")
        if error_code == "service_unavailable":
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE
        elif error_code == "inactive":
            http_status = status.HTTP_403_FORBIDDEN
        else:
            http_status = status.HTTP_401_UNAUTHORIZED
        raise HTTPException(status_code=http_status, detail=result["message"])
    
    return AuthResponse(**result)


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token using refresh token."""
    result = await auth_service.refresh_token(request.refresh_token)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result["message"]
        )
    
    return AuthResponse(**result)


@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Logout and invalidate token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.replace("Bearer ", "")
    result = await auth_service.logout_user(token)
    
    return {"success": True, "message": "Logged out successfully"}


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email."""
    result = await auth_service.forgot_password(request.email)
    
    return {"success": True, "message": result["message"]}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token from email."""
    result = await auth_service.reset_password(
        access_token=request.token,
        new_password=request.new_password,
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return {"success": True, "message": result["message"]}


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    authorization: Optional[str] = Header(None)
):
    """Change password for authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.replace("Bearer ", "")
    user = await auth_service.get_user_by_token(token)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    result = await auth_service.change_password(
        user_id=user["id"],
        old_password=request.old_password,
        new_password=request.new_password,
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return {"success": True, "message": result["message"]}


@router.get("/me")
async def get_current_user_profile(user: dict = Depends(get_current_user)):
    """Get current authenticated user."""
    return {"success": True, "user": user}


@router.post("/verify-email")
async def verify_email(token: str):
    """Verify email with token."""
    result = await auth_service.verify_email(token)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return {"success": True, "message": result["message"]}
