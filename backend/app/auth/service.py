"""
Authentication Service — Complete production-ready authentication using Supabase Auth.

Features:
- User registration with role assignment
- Login with JWT tokens
- Password reset
- Email verification
- Token refresh
- Session management
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
import jwt

from gotrue.errors import AuthApiError
from supabase import Client

from app.db.supabase_client import get_supabase
from app.config.settings import settings

logger = logging.getLogger(__name__)


class AuthService:
    """Complete authentication service using Supabase Auth."""

    def __init__(self):
        self.db: Client = get_supabase()
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 60  # 1 hour
        self.refresh_token_expire_days = 30  # 30 days

    async def register_user(
        self,
        email: str,
        password: str,
        full_name: str,
        phone: Optional[str] = None,
        role: str = "patient",
    ) -> dict:
        """
        Register a new user with Supabase Auth and create user profile.
        
        Returns: {success, user, message}
        """
        try:
            # 1. Create user in Supabase Auth (using admin to bypass confirmation if needed)
            auth_response = self.db.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": full_name,
                    "role": role,
                }
            })
            
            # Since admin.create_user doesn't return a session, 
            # we need to sign in immediately after to get tokens for the user
            if not auth_response:
                return {
                    "success": False,
                    "message": "Failed to create authentication user"
                }

            auth_user_id = getattr(auth_response, 'user', auth_response).id
            
            # 2. Create user profile in database
            user_data = {
                "auth_user_id": auth_user_id,
                "email": email,
                "full_name": full_name,
                "phone": phone,
                "role": role,
                "is_active": True,
                "is_verified": False,  # Will be true after email verification
            }
            
            user_result = self.db.table("users").insert(user_data).execute()
            
            if not user_result.data:
                # Rollback: delete auth user if profile creation fails
                self.db.auth.admin.delete_user(auth_user_id)
                return {
                    "success": False,
                    "message": "Failed to create user profile"
                }
            
            user = user_result.data[0]
            user_id = user["id"]
            
            # 3. Create role-specific profile
            if role == "patient":
                # Create patient record
                patient_data = {
                    "name": full_name,
                    "email": email,
                    "phone": phone,
                    "user_id": user_id,
                    "preferred_channel": "web",
                }
                self.db.table("patients").insert(patient_data).execute()
            
            elif role == "doctor":
                # Create doctor record (requires additional info later)
                doctor_data = {
                    "name": full_name,
                    "email": email,
                    "phone": phone,
                    "user_id": user_id,
                    "specialty": "General Practice",  # Default, can be updated
                    "is_active": True,
                }
                self.db.table("doctors").insert(doctor_data).execute()
            
            elif role in ["receptionist", "admin"]:
                # Create staff record
                staff_data = {
                    "user_id": user_id,
                    "position": role.title(),
                    "is_active": True,
                }
                self.db.table("staff").insert(staff_data).execute()
            
            # 4. Success — Now sign in to get tokens for the user
            login_res = self.db.auth.sign_in_with_password({
                "email": email,
                "password": password,
            })
            
            logger.info(f"User registered successfully: {email} ({role})")
            
            return {
                "success": True,
                "user": user,
                "access_token":  login_res.session.access_token if login_res.session else None,
                "refresh_token": login_res.session.refresh_token if login_res.session else None,
                "message": "Registration successful",
                "requires_verification": False,
            }
            
        except AuthApiError as e:
            logger.error(f"Supabase Auth error during registration: {e}")
            return {
                "success": False,
                "message": str(e),
            }
        except Exception as e:
            logger.error(f"Registration error: {e}", exc_info=True)
            return {
                "success": False,
                "message": "Registration failed. Please try again.",
            }

    async def login_user(self, email: str, password: str) -> dict:
        """
        Login user with email and password.

        Returns: {success, user, access_token, refresh_token, message}
        Falls back to Auth metadata when public.users table doesn't exist yet.
        """
        try:
            # 1. Authenticate with Supabase Auth
            auth_response = self.db.auth.sign_in_with_password({
                "email": email,
                "password": password,
            })

            if not auth_response.user or not auth_response.session:
                return {"success": False, "message": "Invalid email or password"}

            auth_user    = auth_response.user
            auth_user_id = auth_user.id
            meta         = auth_user.user_metadata or {}

            # 2. Try to get profile from public.users
            user = None
            try:
                user_result = (
                    self.db.table("users")
                    .select("*")
                    .eq("auth_user_id", auth_user_id)
                    .single()
                    .execute()
                )
                user = user_result.data
            except Exception:
                # Table doesn't exist yet — fall through to Auth-metadata fallback
                user = None

            # 3. Fallback: build user dict from Supabase Auth metadata
            if not user:
                role = meta.get("role", "patient")
                user = {
                    "id":           auth_user_id,
                    "auth_user_id": auth_user_id,
                    "email":        auth_user.email,
                    "full_name":    meta.get("full_name", auth_user.email.split("@")[0]),
                    "role":         role,
                    "is_active":    True,
                    "is_verified":  True,
                    "phone":        meta.get("phone"),
                    "last_login":   None,
                    "created_at":   auth_user.created_at,
                }
                logger.warning(
                    f"public.users table unavailable — built user profile from Auth metadata for {email}"
                )
            else:
                # 4. Check active flag
                if not user.get("is_active", True):
                    return {
                        "success": False,
                        "message": "Account deactivated. Please contact support.",
                    }

                # 5. Update last_login silently
                try:
                    self.db.table("users").update(
                        {"last_login": datetime.utcnow().isoformat()}
                    ).eq("id", user["id"]).execute()
                except Exception:
                    pass

                # 6. Log activity silently
                try:
                    self._log_activity(user["id"], "user_login", "users", user["id"], {"email": email})
                except Exception:
                    pass

            logger.info(f"User logged in: {email} ({user.get('role')})")

            return {
                "success":       True,
                "user":          user,
                "access_token":  auth_response.session.access_token,
                "refresh_token": auth_response.session.refresh_token,
                "expires_at":    auth_response.session.expires_at,
                "message":       "Login successful",
            }

        except AuthApiError as e:
            logger.error(f"Supabase Auth error during login: {e}")
            return {"success": False, "message": "Invalid email or password"}
        except Exception as e:
            logger.error(f"Login error: {e}", exc_info=True)
            return {"success": False, "message": "Login failed. Please try again."}

    async def refresh_token(self, refresh_token: str) -> dict:
        """
        Refresh access token using refresh token.
        
        Returns: {success, access_token, refresh_token, message}
        """
        try:
            auth_response = self.db.auth.refresh_session(refresh_token)
            
            if not auth_response.session:
                return {
                    "success": False,
                    "message": "Invalid or expired refresh token"
                }
            
            return {
                "success": True,
                "access_token": auth_response.session.access_token,
                "refresh_token": auth_response.session.refresh_token,
                "expires_at": auth_response.session.expires_at,
                "message": "Token refreshed successfully",
            }
            
        except AuthApiError as e:
            logger.error(f"Token refresh error: {e}")
            return {
                "success": False,
                "message": "Token refresh failed",
            }

    async def logout_user(self, access_token: str) -> dict:
        """Logout user and invalidate token."""
        try:
            # Set the token for this request
            self.db.auth.set_session(access_token, refresh_token="")
            self.db.auth.sign_out()
            
            return {
                "success": True,
                "message": "Logged out successfully",
            }
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return {
                "success": False,
                "message": "Logout failed",
            }

    async def forgot_password(self, email: str) -> dict:
        """Send password reset email."""
        try:
            self.db.auth.reset_password_email(email)
            
            return {
                "success": True,
                "message": "Password reset email sent. Please check your inbox.",
            }
        except Exception as e:
            logger.error(f"Forgot password error: {e}")
            # Don't reveal if email exists
            return {
                "success": True,
                "message": "If the email exists, a password reset link has been sent.",
            }

    async def reset_password(self, access_token: str, new_password: str) -> dict:
        """Reset password using token from email."""
        try:
            self.db.auth.set_session(access_token, refresh_token="")
            self.db.auth.update_user({
                "password": new_password
            })
            
            return {
                "success": True,
                "message": "Password reset successfully",
            }
        except Exception as e:
            logger.error(f"Reset password error: {e}")
            return {
                "success": False,
                "message": "Password reset failed",
            }

    async def change_password(self, user_id: str, old_password: str, new_password: str) -> dict:
        """Change password for authenticated user."""
        try:
            # Get user email
            user = self.db.table("users").select("email, auth_user_id").eq("id", user_id).single().execute()
            if not user.data:
                return {"success": False, "message": "User not found"}
            
            # Verify old password by attempting login
            login_result = await self.login_user(user.data["email"], old_password)
            if not login_result["success"]:
                return {"success": False, "message": "Current password is incorrect"}
            
            # Update password
            self.db.auth.admin.update_user_by_id(
                user.data["auth_user_id"],
                {"password": new_password}
            )
            
            self._log_activity(user_id, "password_changed", "users", user_id)
            
            return {
                "success": True,
                "message": "Password changed successfully",
            }
        except Exception as e:
            logger.error(f"Change password error: {e}")
            return {
                "success": False,
                "message": "Password change failed",
            }

    async def verify_email(self, token: str) -> dict:
        """Verify user email with token."""
        try:
            # Supabase handles email verification automatically
            # Update is_verified flag in our database
            auth_response = self.db.auth.verify_otp({
                "token_hash": token,
                "type": "signup",
            })
            
            if auth_response.user:
                self.db.table("users").update({
                    "is_verified": True
                }).eq("auth_user_id", auth_response.user.id).execute()
                
                return {
                    "success": True,
                    "message": "Email verified successfully",
                }
            
            return {
                "success": False,
                "message": "Invalid verification token",
            }
        except Exception as e:
            logger.error(f"Email verification error: {e}")
            return {
                "success": False,
                "message": "Email verification failed",
            }

    async def get_user_by_token(self, access_token: str) -> Optional[dict]:
        """
        Get user profile from access token.
        Falls back to Auth metadata when public.users table doesn't exist yet.
        """
        try:
            # Use the existing admin client but pass the access token to get_user
            auth_response = self.db.auth.get_user(access_token)
            
            if not auth_response or not auth_response.user:
                return None

            auth_user    = auth_response.user
            auth_user_id = auth_user.id
            meta         = auth_user.user_metadata or {}

            # Try public.users first
            try:
                user_result = (
                    self.db.table("users")
                    .select("*")
                    .eq("auth_user_id", auth_user_id)
                    .single()
                    .execute()
                )
                if user_result.data:
                    return user_result.data
            except Exception:
                pass

            # Fallback: Auth metadata
            role = meta.get("role", "patient")
            return {
                "id":           auth_user_id,
                "auth_user_id": auth_user_id,
                "email":        auth_user.email,
                "full_name":    meta.get("full_name", auth_user.email.split("@")[0]),
                "role":         role,
                "is_active":    True,
                "is_verified":  True,
                "phone":        meta.get("phone"),
                "last_login":   None,
                "created_at":   str(auth_user.created_at),
            }

        except Exception as e:
            logger.error(f"Get user by token error: {e}")
            return None

    def _log_activity(self, user_id: str, action: str, resource: str, resource_id: str, details: Optional[dict] = None):
        """Log user activity to activity_log table."""
        try:
            self.db.table("activity_log").insert({
                "user_id": user_id,
                "action": action,
                "resource": resource,
                "resource_id": resource_id,
                "details": details or {},
            }).execute()
        except Exception as e:
            logger.error(f"Activity logging error: {e}")


# Singleton instance
auth_service = AuthService()
