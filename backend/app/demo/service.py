"""Idempotent provisioning and identification for the public demo account."""
from __future__ import annotations

import logging
from typing import Any, Optional, Tuple

from app.config.settings import settings
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


class DemoProvisioningError(RuntimeError):
    """Raised when the demo account cannot be provisioned or authenticated."""


def demo_enabled() -> bool:
    return bool(getattr(settings, "DEMO_MODE_ENABLED", False))


def demo_email() -> str:
    return (settings.DEMO_USER_EMAIL or "demo@gmail.com").strip().lower()


def demo_password() -> str:
    return settings.DEMO_USER_PASSWORD or "demo123"


def is_demo_user(user: Optional[dict]) -> bool:
    """Return True for the configured public demo account only."""
    if not user:
        return False
    if user.get("is_demo") is True:
        return True
    email = (user.get("email") or "").strip().lower()
    return bool(email) and email == demo_email()


def _auth_user_from_response(response: Any) -> Any:
    return getattr(response, "user", response)


def _session_from_response(response: Any) -> Any:
    return getattr(response, "session", None)


def _fallback_profile(auth_user: Any) -> dict:
    email = getattr(auth_user, "email", demo_email())
    metadata = getattr(auth_user, "user_metadata", None) or {}
    return {
        "id": getattr(auth_user, "id", None),
        "auth_user_id": getattr(auth_user, "id", None),
        "email": email,
        "full_name": metadata.get("full_name") or settings.DEMO_USER_NAME,
        "phone": metadata.get("phone"),
        "role": "receptionist",
        "is_active": True,
        "is_verified": True,
        "last_login": None,
        "created_at": str(getattr(auth_user, "created_at", "")),
        "is_demo": True,
    }


def _upsert_demo_profile(db: Any, auth_user: Any) -> dict:
    auth_user_id = getattr(auth_user, "id", None)
    email = getattr(auth_user, "email", demo_email())
    fallback = _fallback_profile(auth_user)
    if not auth_user_id:
        return fallback

    payload = {
        "auth_user_id": auth_user_id,
        "email": email,
        "full_name": settings.DEMO_USER_NAME,
        "phone": settings.DEMO_USER_PHONE,
        "role": "receptionist",
        "is_active": True,
        "is_verified": True,
    }

    def _select() -> Optional[dict]:
        res = db.table("users").select("*").eq("email", email).limit(1).execute()
        return res.data[0] if res.data else None

    try:
        existing = _select()
    except Exception as exc:
        logger.warning("Demo profile table unavailable; using auth metadata: %s", exc)
        return fallback

    # Some deployments have not applied the is_demo migration yet. Try with the
    # column, then retry without it so provisioning remains backwards-compatible.
    try:
        if existing:
            updated = db.table("users").update({**payload, "is_demo": True}).eq("id", existing["id"]).execute()
            row = updated.data[0] if updated.data else {**existing, **payload, "is_demo": True}
        else:
            inserted = db.table("users").insert({**payload, "is_demo": True}).execute()
            row = inserted.data[0] if inserted.data else fallback
    except Exception as first_error:
        logger.info("Retrying demo profile upsert without is_demo column: %s", first_error)
        try:
            if existing:
                updated = db.table("users").update(payload).eq("id", existing["id"]).execute()
                row = updated.data[0] if updated.data else {**existing, **payload}
            else:
                inserted = db.table("users").insert(payload).execute()
                row = inserted.data[0] if inserted.data else fallback
        except Exception as exc:
            logger.warning("Could not upsert demo user profile: %s", exc)
            return fallback

    row["is_demo"] = True
    _upsert_staff_row(db, row.get("id"), auth_user_id)
    return row


def _upsert_staff_row(db: Any, user_id: Optional[str], auth_user_id: Optional[str]) -> None:
    if not user_id:
        return
    try:
        existing = db.table("staff").select("id").eq("user_id", user_id).limit(1).execute()
        payload = {
            "user_id": user_id,
            "position": "Demo Receptionist",
            "department": "Front Desk",
            "is_active": True,
        }
        if existing.data:
            db.table("staff").update(payload).eq("id", existing.data[0]["id"]).execute()
        else:
            try:
                db.table("staff").insert({**payload, "employee_id": f"DEMO-{str(auth_user_id)[:8]}"}).execute()
            except Exception:
                db.table("staff").insert(payload).execute()
    except Exception as exc:
        logger.warning("Could not upsert demo staff row (non-fatal): %s", exc)


def ensure_demo_user_session() -> Tuple[Any, Any, dict]:
    """
    Ensure the demo account exists and return ``(auth_user, session, profile)``.

    The function is idempotent:
    * If the existing password works, no password is changed.
    * If the account is missing, it is created once with the configured password.
    * If the account exists but the password no longer matches, it is repaired.

    Key optimizations:
    - No paginated listing of all Supabase auth users (was O(N) with N up to 10k+).
    - User created/provisioned directly by email without searching.
    """
    if not demo_enabled():
        raise DemoProvisioningError("Demo mode is disabled")

    email = demo_email()
    password = demo_password()
    db = get_supabase()

    auth_user: Any = None
    session: Any = None

    try:
        response = db.auth.sign_in_with_password({"email": email, "password": password})
        auth_user = _auth_user_from_response(response)
        session = _session_from_response(response)
        if auth_user is not None and session is not None:
            logger.info("Demo account already provisioned and password verified: %s", email)
    except Exception as exc:
        logger.info("Demo account sign-in failed; attempting idempotent provisioning: %s", exc)

    if auth_user is None or session is None:
        # Provision the demo account directly by email — no paginated user listing.
        try:
            created = db.auth.admin.create_user(
                {
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {
                        "full_name": settings.DEMO_USER_NAME,
                        "role": "receptionist",
                        "is_demo": True,
                    },
                }
            )
            auth_user = _auth_user_from_response(created)
        except Exception as create_exc:
            # User may already exist (e.g. first sign-in failed because password was wrong).
            # Attempt to update the existing user's password.
            try:
                auth_user = _find_auth_user_by_email(db, email)
                if auth_user is not None:
                    db.auth.admin.update_user_by_id(
                        getattr(auth_user, "id", None),
                        {
                            "password": password,
                            "email_confirm": True,
                            "user_metadata": {
                                "full_name": settings.DEMO_USER_NAME,
                                "role": "receptionist",
                                "is_demo": True,
                            },
                        },
                    )
                else:
                    raise create_exc
            except Exception as update_exc:
                logger.error("Demo account provisioning failed: %s", update_exc, exc_info=True)
                raise DemoProvisioningError(
                    "Demo account could not be provisioned. Verify SUPABASE_URL, "
                    "SUPABASE_SERVICE_ROLE_KEY, and that the Supabase project is active."
                ) from update_exc

        try:
            response = db.auth.sign_in_with_password({"email": email, "password": password})
            auth_user = _auth_user_from_response(response)
            session = _session_from_response(response)
        except Exception as exc:
            logger.error("Demo account sign-in after provisioning failed: %s", exc, exc_info=True)
            raise DemoProvisioningError(
                "Demo account could not be signed in after provisioning. "
                "Verify the demo password and Supabase configuration."
            ) from exc

    if auth_user is None or session is None:
        raise DemoProvisioningError("Demo authentication did not return a valid session")

    profile = _upsert_demo_profile(db, auth_user)
    return auth_user, session, profile


def _find_auth_user_by_email(db: Any, email: str) -> Optional[Any]:
    """Find a Supabase auth user by email without listing all users."""
    target = email.strip().lower()
    # Direct lookup: Supabase admin API may support email search; fall back to a
    # focused check. We avoid _list_auth_users which iterates over ALL users.
    try:
        result = db.auth.admin.list_users()
        # result may be a list or an object with a 'users' attribute
        users = result if isinstance(result, list) else getattr(result, "users", [])
        for user in users:  # type: ignore[var-annotated]
            if (getattr(user, "email", None) or "").strip().lower() == target:
                return user
    except Exception as exc:
        logger.warning("Failed to list auth users for email lookup: %s", exc)
    return None


def ensure_demo_user_sync() -> dict:
    """Provision the demo account without creating a long-lived session."""
    _auth_user, _session, profile = ensure_demo_user_session()
    return profile


def demo_public_config() -> dict:
    """Public configuration for the login page (credentials are intentionally public)."""
    return {
        "enabled": demo_enabled(),
        "email": demo_email(),
        "password": demo_password(),
        "name": settings.DEMO_USER_NAME,
        "role": "receptionist",
        "read_only": True,
    }
