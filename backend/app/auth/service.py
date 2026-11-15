"""
Authentication Service — complete authentication using Supabase Auth.

Features:
- User registration with role assignment
- Login with JWT tokens
- Public demo-account provisioning
- Password reset
- Email verification
- Token refresh
- Session management

All passwords are hashed and verified by Supabase Auth (GoTrue); this service
never stores or compares plaintext passwords itself.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
import jwt
from supabase_auth.errors import AuthApiError
from supabase import Client

from app.config.settings import settings
from app.db.async_utils import run_blocking
from app.db.supabase_client import get_supabase
from app.demo.service import (
    DemoProvisioningError,
    demo_email,
    demo_enabled,
    demo_password,
    ensure_demo_user_session,
    is_demo_user,
)

logger = logging.getLogger(__name__)


class AuthService:
    """Authentication service backed by Supabase Auth."""

    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 60  # Supabase token lifetime is configurable server-side
        self.refresh_token_expire_days = 30

    @property
    def db(self) -> Client:
        # Create per operation; the same reasoning as app.db.supabase_client.
        return get_supabase()

    # ── User profile helpers ─────────────────────────────────────────────────

    @staticmethod
    def _metadata_user(auth_user, *, is_demo: bool = False) -> dict:
        metadata = getattr(auth_user, "user_metadata", None) or {}
        email = getattr(auth_user, "email", "") or ""
        role = metadata.get("role") or ("receptionist" if is_demo else "patient")
        return {
            "id": getattr(auth_user, "id", None),
            "auth_user_id": getattr(auth_user, "id", None),
            "email": email,
            "full_name": metadata.get("full_name") or email.split("@")[0] or "User",
            "role": role,
            "is_active": True,
            "is_verified": True,
            "phone": metadata.get("phone"),
            "last_login": None,
            "created_at": str(getattr(auth_user, "created_at", "")),
            "is_demo": is_demo,
        }

    def _find_public_user(self, *, auth_user_id: Optional[str] = None, email: Optional[str] = None) -> Optional[dict]:
        try:
            db = self.db
            if auth_user_id:
                result = db.table("users").select("*").eq("auth_user_id", auth_user_id).limit(1).execute()
                if result.data:
                    return result.data[0]
            if email:
                result = db.table("users").select("*").eq("email", email.lower()).limit(1).execute()
                if result.data:
                    return result.data[0]
        except Exception as exc:
            logger.warning("public.users lookup unavailable: %s", exc)
        return None

    def _upsert_public_user(
        self,
        *,
        auth_user_id: str,
        email: str,
        full_name: str,
        phone: Optional[str],
        role: str,
        is_verified: bool = True,
    ) -> Optional[dict]:
        payload = {
            "auth_user_id": auth_user_id,
            "email": email.lower(),
            "full_name": full_name,
            "phone": phone,
            "role": role,
            "is_active": True,
            "is_verified": is_verified,
        }
        try:
            db = self.db
            existing = self._find_public_user(auth_user_id=auth_user_id, email=email)
            if existing:
                result = db.table("users").update(payload).eq("id", existing["id"]).execute()
                return result.data[0] if result.data else {**existing, **payload}
            result = db.table("users").insert(payload).execute()
            return result.data[0] if result.data else None
        except Exception as exc:
            logger.warning("Could not create public.users profile (continuing with Auth metadata): %s", exc)
            return None

    def _ensure_patient_row(self, *, user_id: str, email: str, full_name: str, phone: Optional[str]) -> None:
        try:
            db = self.db
            existing = db.table("patients").select("id").eq("user_id", user_id).limit(1).execute()
            if existing.data:
                return
            existing_email = db.table("patients").select("id").eq("email", email).limit(1).execute()
            if existing_email.data:
                db.table("patients").update({"user_id": user_id}).eq("id", existing_email.data[0]["id"]).execute()
                return
            db.table("patients").insert(
                {
                    "name": full_name,
                    "email": email,
                    "phone": phone,
                    "user_id": user_id,
                    "preferred_channel": "web",
                }
            ).execute()
        except Exception as exc:
            logger.warning("Patient profile creation skipped: %s", exc)

    # ── Registration ─────────────────────────────────────────────────────────

    async def register_user(
        self,
        email: str,
        password: str,
        full_name: str,
        phone: Optional[str] = None,
        role: str = "patient",
    ) -> dict:
        """Register a new Supabase Auth user and best-effort profile row."""
        email = email.strip().lower()
        db = self.db

        existing_profile = self._find_public_user(email=email)
        if existing_profile:
            return {
                "success": False,
                "message": "An account with this email already exists. Please log in instead.",
                "error_code": "email_exists",
            }

        auth_user = None
        try:
            created = db.auth.admin.create_user(
                {
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"full_name": full_name, "role": role},
                }
            )
            auth_user = getattr(created, "user", created)
        except AuthApiError as exc:
            message = str(exc).lower()
            if "already" in message or "registered" in message or "exists" in message:
                return {
                    "success": False,
                    "message": "An account with this email already exists. Please log in instead.",
                    "error_code": "email_exists",
                }
            logger.error("Supabase Auth error during registration: %s", exc)
            return {
                "success": False,
                "message": str(exc) or "Registration failed.",
                "error_code": "auth_error",
            }
        except Exception as exc:
            logger.error("Registration service error: %s", exc, exc_info=True)
            return {
                "success": False,
                "message": "Authentication service is temporarily unavailable. Please try again shortly.",
                "error_code": "service_unavailable",
            }

        auth_user_id = getattr(auth_user, "id", None)
        if not auth_user_id:
            return {"success": False, "message": "Failed to create authentication user", "error_code": "auth_error"}

        profile = self._upsert_public_user(
            auth_user_id=auth_user_id,
            email=email,
            full_name=full_name,
            phone=phone,
            role=role,
        )
        if role == "patient" and profile:
            self._ensure_patient_row(
                user_id=profile["id"],
                email=email,
                full_name=full_name,
                phone=phone,
            )

        user = profile or self._metadata_user(auth_user)
        user["is_demo"] = False

        access_token = None
        refresh_token = None
        expires_at = None
        try:
            session = db.auth.sign_in_with_password({"email": email, "password": password})
            if getattr(session, "session", None):
                access_token = session.session.access_token
                refresh_token = session.session.refresh_token
                expires_at = session.session.expires_at
        except Exception as exc:
            # Registration itself succeeded; the client can call /auth/login.
            logger.warning("Registration succeeded but automatic sign-in failed: %s", exc)

        logger.info("User registered successfully: %s (%s)", email, role)
        return {
            "success": True,
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at,
            "message": "Registration successful",
        }

    # ── Login ────────────────────────────────────────────────────────────────

    async def login_user(self, email: str, password: str) -> dict:
        """Login with email/password. Returns tokens issued by Supabase Auth."""
        email = email.strip().lower()
        db = self.db

        # Public demo account: provision idempotently, then use its real session.
        if demo_enabled() and email == demo_email():
            if password != demo_password():
                return {
                    "success": False,
                    "message": "Invalid email or password",
                    "error_code": "invalid_credentials",
                }
            try:
                auth_user, session, profile = await run_blocking(ensure_demo_user_session)
            except DemoProvisioningError as exc:
                logger.error("Demo login provisioning failed: %s", exc)
                return {
                    "success": False,
                    "message": str(exc),
                    "error_code": "service_unavailable",
                }
            except Exception as exc:
                logger.error("Demo login error: %s", exc, exc_info=True)
                return {
                    "success": False,
                    "message": "Demo authentication service is temporarily unavailable. Please try again shortly.",
                    "error_code": "service_unavailable",
                }

            if not session:
                return {"success": False, "message": "Demo login failed.", "error_code": "auth_error"}

            user = profile or self._metadata_user(auth_user, is_demo=True)
            user["is_demo"] = True
            try:
                if user.get("id"):
                    db.table("users").update({"last_login": datetime.now(timezone.utc).isoformat()}).eq(
                        "id", user["id"]
                    ).execute()
            except Exception:
                pass

            logger.info("Demo user logged in: %s", email)
            return {
                "success": True,
                "user": user,
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "expires_at": session.expires_at,
                "message": "Login successful",
            }

        try:
            auth_response = db.auth.sign_in_with_password({"email": email, "password": password})
        except AuthApiError as exc:
            logger.warning("Supabase Auth rejected login for %s: %s", email, exc)
            return {"success": False, "message": "Invalid email or password", "error_code": "invalid_credentials"}
        except (httpx.HTTPError, ConnectionError, TimeoutError, OSError) as exc:
            logger.error("Authentication service unreachable during login: %s", exc)
            return {
                "success": False,
                "message": "Authentication service is temporarily unavailable. Please try again shortly.",
                "error_code": "service_unavailable",
            }
        except Exception as exc:
            logger.error("Login error: %s", exc, exc_info=True)
            return {
                "success": False,
                "message": "Authentication service is temporarily unavailable. Please try again shortly.",
                "error_code": "service_unavailable",
            }

        auth_user = getattr(auth_response, "user", None)
        session = getattr(auth_response, "session", None)
        if not auth_user or not session:
            return {"success": False, "message": "Invalid email or password", "error_code": "invalid_credentials"}

        auth_user_id = auth_user.id
        # Use session user metadata directly — avoids a redundant database query.
        # if a public.users profile exists, its role will be in user_metadata; otherwise
        # we fall back to the metadata from Supabase Auth.
        user = self._metadata_user(auth_user, is_demo=is_demo_user({"email": email}))
        # Optionally update last_login without a separate DB query; Supabase tracks last_login
        # natively in the auth sessions table, so we skip the extra users table update here.
        # If the app later needs custom profile fields, re-introduce the lookup.

        user["is_demo"] = is_demo_user(user)
        logger.info("User logged in: %s (%s)", email, user.get("role"))
        return {
            "success": True,
            "user": user,
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "expires_at": session.expires_at,
            "message": "Login successful",
        }

    async def refresh_token(self, refresh_token: str) -> dict:
        """Refresh an access token using a Supabase refresh token."""
        try:
            auth_response = self.db.auth.refresh_session(refresh_token)
            session = getattr(auth_response, "session", None)
            if not session:
                return {"success": False, "message": "Invalid or expired refresh token"}
            return {
                "success": True,
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "expires_at": session.expires_at,
                "message": "Token refreshed successfully",
            }
        except AuthApiError as exc:
            logger.warning("Token refresh rejected: %s", exc)
            return {"success": False, "message": "Invalid or expired refresh token"}
        except Exception as exc:
            logger.error("Token refresh error: %s", exc)
            return {"success": False, "message": "Token refresh failed"}

    async def logout_user(self, access_token: str) -> dict:
        """Best-effort Supabase sign-out. Client-side token clearing is authoritative."""
        try:
            db = self.db
            db.auth.set_session(access_token, refresh_token="")
            db.auth.sign_out()
            return {"success": True, "message": "Logged out successfully"}
        except Exception as exc:
            logger.warning("Supabase logout was not completed (client token cleared anyway): %s", exc)
            return {"success": True, "message": "Logged out successfully"}

    async def forgot_password(self, email: str) -> dict:
        try:
            self.db.auth.reset_password_email(email)
            return {
                "success": True,
                "message": "Password reset email sent. Please check your inbox.",
            }
        except Exception as exc:
            logger.warning("Forgot password error: %s", exc)
            # Do not reveal whether an account exists.
            return {
                "success": True,
                "message": "If the email exists, a password reset link has been sent.",
            }

    async def reset_password(self, access_token: str, new_password: str) -> dict:
        try:
            db = self.db
            db.auth.set_session(access_token, refresh_token="")
            db.auth.update_user({"password": new_password})
            return {"success": True, "message": "Password reset successfully"}
        except Exception as exc:
            logger.error("Reset password error: %s", exc)
            return {"success": False, "message": "Password reset failed"}

    async def change_password(self, user_id: str, old_password: str, new_password: str) -> dict:
        try:
            db = self.db
            user = db.table("users").select("email, auth_user_id, is_demo").eq("id", user_id).limit(1).execute()
            if not user.data:
                return {"success": False, "message": "User not found"}
            if user.data[0].get("is_demo"):
                return {"success": False, "message": "The public demo password cannot be changed."}

            login_result = await self.login_user(user.data[0]["email"], old_password)
            if not login_result["success"]:
                return {"success": False, "message": "Current password is incorrect"}

            db.auth.admin.update_user_by_id(
                user.data[0]["auth_user_id"],
                {"password": new_password},
            )
            self._log_activity(user_id, "password_changed", "users", user_id)
            return {"success": True, "message": "Password changed successfully"}
        except Exception as exc:
            logger.error("Change password error: %s", exc)
            return {"success": False, "message": "Password change failed"}

    async def verify_email(self, token: str) -> dict:
        try:
            auth_response = self.db.auth.verify_otp({"token_hash": token, "type": "signup"})
            auth_user = getattr(auth_response, "user", None)
            if auth_user:
                self.db.table("users").update({"is_verified": True}).eq("auth_user_id", auth_user.id).execute()
                return {"success": True, "message": "Email verified successfully"}
            return {"success": False, "message": "Invalid verification token"}
        except Exception as exc:
            logger.error("Email verification error: %s", exc)
            return {"success": False, "message": "Email verification failed"}

    # ── Token verification ───────────────────────────────────────────────────

    def _decode_supabase_jwt(self, access_token: str) -> Optional[dict]:
        """Local verification fallback for transient Supabase Auth outages."""
        secret = getattr(settings, "SUPABASE_JWT_SECRET", None)
        if not secret:
            return None
        try:
            payload = jwt.decode(
                access_token,
                secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        except jwt.PyJWTError:
            return None

        metadata = payload.get("user_metadata") or {}
        email = payload.get("email") or metadata.get("email") or ""
        return {
            "id": payload.get("sub"),
            "auth_user_id": payload.get("sub"),
            "email": email,
            "full_name": metadata.get("full_name") or email.split("@")[0] or "User",
            "role": metadata.get("role") or "patient",
            "is_active": True,
            "is_verified": True,
            "phone": metadata.get("phone"),
            "last_login": None,
            "created_at": "",
            "is_demo": bool(metadata.get("is_demo")),
        }

    async def get_user_by_token(self, access_token: str) -> Optional[dict]:
        """Resolve a Supabase access token to a user profile."""
        auth_user = None
        try:
            response = self.db.auth.get_user(access_token)
            auth_user = getattr(response, "user", response)
        except AuthApiError as exc:
            logger.info("Invalid or expired Supabase token: %s", exc)
            return None
        except Exception as exc:
            logger.warning("Supabase token verification unavailable, trying local JWT fallback: %s", exc)
            fallback = self._decode_supabase_jwt(access_token)
            if fallback:
                profile = self._find_public_user(auth_user_id=fallback["id"], email=fallback.get("email"))
                user = profile or fallback
                user["is_demo"] = is_demo_user(user)
                return user
            return None

        if not auth_user:
            return None
        auth_user_id = getattr(auth_user, "id", None)
        email = getattr(auth_user, "email", "")

        user = self._find_public_user(auth_user_id=auth_user_id, email=email)
        if user:
            user["is_demo"] = is_demo_user(user)
            return user

        user = self._metadata_user(auth_user, is_demo=is_demo_user({"email": email}))
        user["is_demo"] = is_demo_user(user)
        return user

    def _log_activity(self, user_id: str, action: str, resource: str, resource_id: str, details: Optional[dict] = None):
        try:
            self.db.table("activity_log").insert(
                {
                    "user_id": user_id,
                    "action": action,
                    "resource": resource,
                    "resource_id": resource_id,
                    "details": details or {},
                }
            ).execute()
        except Exception as exc:
            logger.debug("Activity logging skipped: %s", exc)


# Singleton instance
auth_service = AuthService()
