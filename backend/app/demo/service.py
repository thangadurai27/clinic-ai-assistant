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


def _list_auth_users(db: Any) -> list[Any]:
    """Best-effort paginated lookup across gotrue-py versions."""
    collected: list[Any] = []
    page = 1

    while page <= 50:
        try:
            result = db.auth.admin.list_users(page=page, per_page=200)
        except TypeError:
            # Older clients do not accept pagination kwargs.
            try:
                result = db.auth.admin.list_users()
            except Exception as exc:  # pragma: no cover - depends on remote service
                logger.warning("Could not list Supabase auth users: %s", exc)
                return collected
            batch = result if isinstance(result, list) else getattr(result, "users", [])
            if isinstance(batch, list):
                collected.extend(batch)
            return collected
        except Exception as exc:  # pragma: no cover - depends on remote service
            logger.warning("Could not list Supabase auth users: %s", exc)
            return collected

        batch = result if isinstance(result, list) else getattr(result, "users", [])
        if not isinstance(batch, list) or not batch:
            break
        collected.extend(batch)
        if len(batch) < 200:
            break
        page += 1

    return collected


def _find_auth_user(db: Any, email: str) -> Optional[Any]:
    target = email.strip().lower()
    for user in _list_auth_users(db):
        if (getattr(user, "email", None) or "").strip().lower() == target:
            return user
    return None


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
    """
    if not demo_enabled():
        raise DemoProvisioningError("Demo mode is disabled")

    email = demo_email()
    password = demo_password()
    db = get_supabase()

    auth_user: Any = None
    session: Any = None
    first_error: Optional[Exception] = None

    try:
        response = db.auth.sign_in_with_password({"email": email, "password": password})
        auth_user = _auth_user_from_response(response)
        session = _session_from_response(response)
        if auth_user is not None and session is not None:
            logger.info("Demo account already provisioned and password verified: %s", email)
    except Exception as exc:
        first_error = exc
        logger.info("Demo account sign-in failed; attempting idempotent provisioning: %s", exc)

    if auth_user is None or session is None:
        auth_user = _find_auth_user(db, email)
        try:
            if auth_user is not None:
                db.auth.admin.update_user_by_id(
                    getattr(auth_user, "id"),
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

            response = db.auth.sign_in_with_password({"email": email, "password": password})
            auth_user = _auth_user_from_response(response)
            session = _session_from_response(response)
        except Exception as exc:
            logger.error("Demo account provisioning failed: %s", exc, exc_info=True)
            cause = first_error or exc
            raise DemoProvisioningError(
                "Demo account could not be provisioned. Verify SUPABASE_URL, "
                "SUPABASE_SERVICE_ROLE_KEY, and that the Supabase project is active."
            ) from cause

    if auth_user is None or session is None:
        raise DemoProvisioningError("Demo authentication did not return a valid session")

    profile = _upsert_demo_profile(db, auth_user)
    return auth_user, session, profile


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
