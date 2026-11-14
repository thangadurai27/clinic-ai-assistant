"""
Unit tests for public demo authentication and read-only enforcement.

These tests use fakes and FastAPI dependency overrides; they never contact
Supabase, Groq, or any external service.

Run:
    cd backend
    .venv/Scripts/python -m pytest tests/test_demo_auth.py -v
"""
from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.api import api_router
from app.auth.dependencies import (
    bearer_token,
    get_current_user,
    get_staff_user,
    get_staff_user_for_write,
)
from app.auth.service import auth_service
from app.demo.service import (
    demo_public_config,
    ensure_demo_user_session,
    is_demo_user,
)

DEMO_USER = {
    "id": "user-demo",
    "auth_user_id": "auth-demo",
    "email": "demo@gmail.com",
    "full_name": "Demo Receptionist",
    "role": "receptionist",
    "is_active": True,
    "is_verified": True,
    "is_demo": True,
}


def make_client() -> TestClient:
    # A minimal app avoids the production lifespan (which would try to provision
    # the demo account against a real Supabase project).
    app = FastAPI()
    app.include_router(api_router)
    return TestClient(app)


# ─── Demo account detection ──────────────────────────────────────────────────


def test_is_demo_user_by_flag_and_email() -> None:
    assert is_demo_user(DEMO_USER) is True
    assert is_demo_user({"email": "demo@gmail.com"}) is True
    assert is_demo_user({"email": "real.receptionist@clinic.com"}) is False
    assert is_demo_user(None) is False


def test_demo_public_config_exposes_credentials() -> None:
    config = demo_public_config()
    assert config["enabled"] is True
    assert config["email"] == "demo@gmail.com"
    assert config["password"] == "demo123"
    assert config["read_only"] is True
    assert config["role"] == "receptionist"


# ─── Auth dependencies ───────────────────────────────────────────────────────


def test_bearer_token_rejects_missing_and_malformed_headers() -> None:
    with pytest.raises(HTTPException) as missing:
        bearer_token(None)
    assert missing.value.status_code == 401

    with pytest.raises(HTTPException) as malformed:
        bearer_token("Token abc")
    assert malformed.value.status_code == 401

    assert bearer_token("Bearer abc123") == "abc123"


@pytest.mark.asyncio
async def test_staff_guard_rejects_patient_role() -> None:
    with pytest.raises(HTTPException) as exc:
        await get_staff_user({**DEMO_USER, "role": "patient", "is_demo": False})
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_demo_account_is_blocked_from_writes() -> None:
    with pytest.raises(HTTPException) as exc:
        await get_staff_user_for_write(DEMO_USER)
    assert exc.value.status_code == 403
    assert "read-only" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_non_demo_staff_can_write() -> None:
    staff = {**DEMO_USER, "is_demo": False, "email": "staff@clinic.com"}
    assert await get_staff_user_for_write(staff) == staff


# ─── /auth/me ────────────────────────────────────────────────────────────────


def test_me_requires_authorization_header() -> None:
    client = make_client()
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_returns_authenticated_user() -> None:
    client = make_client()
    client.app.dependency_overrides[get_current_user] = lambda: DEMO_USER
    try:
        response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer x"})
    finally:
        client.app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["user"]["email"] == "demo@gmail.com"
    assert body["user"]["is_demo"] is True


def test_me_rejects_invalid_token(monkeypatch: pytest.MonkeyPatch) -> None:
    async def invalid(_token: str):
        return None

    monkeypatch.setattr(auth_service, "get_user_by_token", invalid)
    client = make_client()
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer broken"})
    assert response.status_code == 401


# ─── Login endpoint mapping ──────────────────────────────────────────────────


def test_login_invalid_credentials_returns_401(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_login(email: str, password: str):
        return {
            "success": False,
            "message": "Invalid email or password",
            "error_code": "invalid_credentials",
        }

    monkeypatch.setattr(auth_service, "login_user", fake_login)
    client = make_client()
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@clinic.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_login_service_unavailable_returns_503(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_login(email: str, password: str):
        return {
            "success": False,
            "message": "Authentication service is temporarily unavailable.",
            "error_code": "service_unavailable",
        }

    monkeypatch.setattr(auth_service, "login_user", fake_login)
    client = make_client()
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@gmail.com", "password": "demo123"},
    )
    assert response.status_code == 503


def test_demo_login_rejects_wrong_password() -> None:
    client = make_client()
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@gmail.com", "password": "not-demo123"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_demo_config_endpoint() -> None:
    client = make_client()
    response = client.get("/api/v1/auth/demo-config")
    assert response.status_code == 200
    assert response.json()["password"] == "demo123"


# ─── Registration validation ────────────────────────────────────────────────


def test_registration_rejects_short_password() -> None:
    client = make_client()
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "new.patient@example.com",
            "password": "short",
            "full_name": "New Patient",
        },
    )
    assert response.status_code == 400
    assert "8 characters" in response.json()["detail"]


# ─── Demo data isolation ─────────────────────────────────────────────────────


def test_demo_dashboard_returns_sample_data_only() -> None:
    client = make_client()
    client.app.dependency_overrides[get_staff_user] = lambda: DEMO_USER
    try:
        stats = client.get("/api/v1/dashboard/stats")
        patients = client.get("/api/v1/dashboard/patients")
    finally:
        client.app.dependency_overrides.clear()

    assert stats.status_code == 200
    assert stats.json()["total_patients"] >= 1
    assert patients.status_code == 200
    assert patients.json()
    assert all(row["is_demo"] is True for row in patients.json())


def test_demo_reminders_are_empty_and_writes_blocked() -> None:
    client = make_client()
    client.app.dependency_overrides[get_staff_user] = lambda: DEMO_USER
    try:
        pending = client.get("/api/v1/reminders/pending")
    finally:
        client.app.dependency_overrides.clear()

    assert pending.status_code == 200
    assert pending.json() == []

    def deny_write():
        raise HTTPException(status_code=403, detail="Demo is read-only")

    client.app.dependency_overrides[get_staff_user_for_write] = deny_write
    try:
        created = client.post(
            "/api/v1/reminders",
            json={
                "patient_id": "00000000-0000-0000-0000-000000000000",
                "type": "appointment",
                "message": "demo write",
                "scheduled_at": "2026-01-01T10:00:00Z",
            },
        )
    finally:
        client.app.dependency_overrides.clear()

    assert created.status_code == 403


def test_demo_receptionist_cannot_use_patient_portal(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def demo_token(_token: str):
        return DEMO_USER

    monkeypatch.setattr(auth_service, "get_user_by_token", demo_token)
    client = make_client()
    response = client.get(
        "/api/v1/patient/dashboard",
        headers={"Authorization": "Bearer demo"},
    )
    assert response.status_code == 403


# ─── Idempotent provisioning ────────────────────────────────────────────────


class FakeSession:
    access_token = "demo-access-token"
    refresh_token = "demo-refresh-token"
    expires_at = 1_900_000_000


class FakeQuery:
    def __init__(self, db: "FakeDB", table: str):
        self.db = db
        self.table = table
        self.operation = "select"
        self.payload = None

    def select(self, *_args, **_kwargs):
        self.operation = "select"
        return self

    def insert(self, payload):
        self.operation = "insert"
        self.payload = payload
        return self

    def update(self, payload):
        self.operation = "update"
        self.payload = payload
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def execute(self):
        if self.table == "users":
            if self.operation == "select":
                return SimpleNamespace(data=list(self.db.users))
            if self.operation == "insert":
                row = {**self.payload, "id": "user-demo"}
                self.db.users = [row]
                return SimpleNamespace(data=[row])
            if self.operation == "update":
                if self.db.users:
                    self.db.users[0] = {**self.db.users[0], **self.payload}
                    return SimpleNamespace(data=[self.db.users[0]])
                return SimpleNamespace(data=[])
        if self.table == "staff":
            if self.operation == "select":
                return SimpleNamespace(data=[])
            return SimpleNamespace(data=[])

        return SimpleNamespace(data=[])


class FakeAdmin:
    def __init__(self, auth: "FakeAuth"):
        self.auth = auth

    def list_users(self):
        return list(self.auth.users)

    def create_user(self, payload):
        user = SimpleNamespace(
            id="auth-demo",
            email=payload["email"],
            user_metadata=payload.get("user_metadata", {}),
            created_at="2026-01-01T00:00:00Z",
        )
        self.auth.users.append(user)
        self.auth.create_calls.append(payload)
        # After creation, the follow-up sign-in should succeed.
        self.auth.fail_signin = False
        return SimpleNamespace(user=user)

    def update_user_by_id(self, user_id, payload):
        self.auth.update_calls.append((user_id, payload))
        self.auth.fail_signin = False
        return SimpleNamespace(user=self.auth.users[0] if self.auth.users else None)


class FakeAuth:
    def __init__(self):
        self.users = []
        self.create_calls = []
        self.update_calls = []
        self.fail_signin = True
        self.admin = FakeAdmin(self)

    def sign_in_with_password(self, credentials):
        if self.fail_signin:
            raise RuntimeError("Invalid login credentials")
        user = self.users[0]
        return SimpleNamespace(user=user, session=FakeSession())


class FakeDB:
    def __init__(self):
        self.auth = FakeAuth()
        self.users: list[dict] = []

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self, name)


@pytest.mark.asyncio
async def test_demo_login_returns_real_session(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = FakeDB()
    fake_db.auth.fail_signin = False
    fake_db.auth.users = [
        SimpleNamespace(
            id="auth-demo",
            email="demo@gmail.com",
            user_metadata={"full_name": "Demo Receptionist", "role": "receptionist"},
            created_at="2026-01-01T00:00:00Z",
        )
    ]

    monkeypatch.setattr("app.demo.service.get_supabase", lambda: fake_db)
    monkeypatch.setattr("app.auth.service.get_supabase", lambda: fake_db)

    result = await auth_service.login_user("demo@gmail.com", "demo123")

    assert result["success"] is True
    assert result["access_token"] == "demo-access-token"
    assert result["refresh_token"] == "demo-refresh-token"
    assert result["user"]["is_demo"] is True
    assert result["user"]["role"] == "receptionist"


@pytest.mark.asyncio
async def test_demo_login_wrong_password_is_rejected() -> None:
    result = await auth_service.login_user("demo@gmail.com", "wrong-password")
    assert result["success"] is False
    assert result["error_code"] == "invalid_credentials"


def test_demo_provisioning_is_idempotent(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = FakeDB()
    monkeypatch.setattr("app.demo.service.get_supabase", lambda: fake_db)

    auth_user, session, profile = ensure_demo_user_session()
    assert auth_user.id == "auth-demo"
    assert session.access_token == "demo-access-token"
    assert profile["is_demo"] is True
    assert len(fake_db.auth.create_calls) == 1
    assert fake_db.auth.update_calls == []

    # Second run must sign in successfully and must not reset the password or
    # create a second Auth user.
    auth_user_2, session_2, profile_2 = ensure_demo_user_session()
    assert session_2.access_token == "demo-access-token"
    assert profile_2["is_demo"] is True
    assert len(fake_db.auth.create_calls) == 1
    assert fake_db.auth.update_calls == []
