"""
Create test user accounts for all 4 roles.
Run from the backend folder:
    python create_test_users.py

What this does:
  1. Creates Supabase Auth users (skip if already exist)
  2. Inserts profile rows into public.users (creates table if missing)
  3. Creates role-specific rows (patients / doctors / staff)
"""
import asyncio
import logging
from app.db.supabase_client import get_supabase

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

TEST_USERS = [
    {
        "email":     "admin@klmclinic.com",
        "password":  "Admin@1234",
        "full_name": "KLM Admin",
        "role":      "admin",
    },
    {
        "email":     "doctor@klmclinic.com",
        "password":  "Doctor@1234",
        "full_name": "Dr. Test Doctor",
        "role":      "doctor",
    },
    {
        "email":     "receptionist@klmclinic.com",
        "password":  "Recept@1234",
        "full_name": "Test Receptionist",
        "role":      "receptionist",
    },
    {
        "email":     "patient@klmclinic.com",
        "password":  "Patient@1234",
        "full_name": "Test Patient",
        "role":      "patient",
    },
]

# Minimal SQL to create the users table if it doesn't exist
CREATE_USERS_TABLE_SQL = """
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'receptionist', 'patient');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    UUID UNIQUE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  role            user_role NOT NULL DEFAULT 'patient',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_verified     BOOLEAN NOT NULL DEFAULT false,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email       ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_role        ON public.users(role);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_users" ON public.users FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
"""

CREATE_STAFF_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS public.staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  department  TEXT,
  position    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_staff" ON public.staff FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
"""


def ensure_tables(db):
    """Create users + staff tables if they don't exist via rpc/sql."""
    try:
        db.rpc("exec_sql", {"sql": CREATE_USERS_TABLE_SQL}).execute()
        logger.info("users table ensured via rpc")
        return True
    except Exception:
        pass

    # Try direct table check
    try:
        db.table("users").select("id").limit(1).execute()
        logger.info("users table already exists")
        return True
    except Exception:
        logger.warning("users table not found and cannot create via rpc — will try direct inserts anyway")
        return False


async def get_or_create_auth_user(db, email: str, password: str, full_name: str, role: str) -> str | None:
    """Return the Supabase Auth user_id, creating if needed."""
    try:
        resp = db.auth.admin.create_user({
            "email":         email,
            "password":      password,
            "email_confirm": True,
            "user_metadata": {"full_name": full_name, "role": role},
        })
        uid = resp.user.id
        logger.info(f"  Auth created: {uid}")
        return uid
    except Exception as e:
        msg = str(e).lower()
        if "already" in msg or "registered" in msg or "exists" in msg:
            logger.warning("  Auth user already exists")
            # Try to look up via admin list
            try:
                users_resp = db.auth.admin.list_users()
                for u in (users_resp or []):
                    if getattr(u, "email", None) == email:
                        logger.info(f"  Found existing auth user: {u.id}")
                        return u.id
            except Exception as list_err:
                logger.warning(f"  Could not list auth users: {list_err}")
            return None
        logger.error(f"  Auth error: {e}")
        return None


async def create_user(db, user: dict) -> None:
    email    = user["email"]
    password = user["password"]
    role     = user["role"]
    name     = user["full_name"]

    print(f"\n→ [{role.upper()}] {email}")

    # Step 1: Auth
    auth_uid = await get_or_create_auth_user(db, email, password, name, role)

    # Step 2: users table row
    user_id = None
    payload = {
        "email":       email,
        "full_name":   name,
        "role":        role,
        "is_active":   True,
        "is_verified": True,
    }
    if auth_uid:
        payload["auth_user_id"] = auth_uid

    try:
        res = db.table("users").insert(payload).execute()
        user_id = res.data[0]["id"] if res.data else None
        logger.info(f"  users row: {user_id}")
    except Exception as e:
        msg = str(e).lower()
        if "duplicate" in msg or "unique" in msg or "already" in msg:
            logger.warning("  users row already exists")
            res = db.table("users").select("id").eq("email", email).execute()
            user_id = res.data[0]["id"] if res.data else None
        else:
            logger.error(f"  users insert failed: {e}")
            return

    if not user_id:
        logger.error("  Could not determine user_id — skipping role profile")
        return

    # Step 3: role profile
    if role == "patient":
        try:
            db.table("patients").insert({
                "name":              name,
                "email":             email,
                "user_id":           user_id,
                "preferred_channel": "web",
            }).execute()
            logger.info("  patients row created")
        except Exception as e:
            logger.warning(f"  patients: {e}")

    elif role == "doctor":
        try:
            db.table("doctors").insert({
                "name":           name,
                "email":          email,
                "user_id":        user_id,
                "specialty":      "General Practice",
                "avatar_color":   "#2563eb",
                "initials":       "TD",
                "is_active":      True,
                "emergency_only": False,
            }).execute()
            logger.info("  doctors row created")
        except Exception as e:
            logger.warning(f"  doctors: {e}")

    elif role in ("receptionist", "admin"):
        try:
            db.table("staff").insert({
                "user_id":   user_id,
                "position":  role.title(),
                "is_active": True,
            }).execute()
            logger.info("  staff row created")
        except Exception as e:
            logger.warning(f"  staff: {e}")

    print(f"  ✅ {email}  /  {password}")


async def main():
    db = get_supabase()

    print()
    print("=" * 58)
    print("  KLM AI Clinic — Test User Setup")
    print("=" * 58)

    # Ensure tables exist
    ensure_tables(db)

    for u in TEST_USERS:
        await create_user(db, u)

    print()
    print("=" * 58)
    print("  CREDENTIALS READY FOR TESTING")
    print("=" * 58)
    print()
    rows = [
        ("ADMIN",        "admin@klmclinic.com",        "Admin@1234"),
        ("DOCTOR",       "doctor@klmclinic.com",       "Doctor@1234"),
        ("RECEPTIONIST", "receptionist@klmclinic.com", "Recept@1234"),
        ("PATIENT",      "patient@klmclinic.com",      "Patient@1234"),
    ]
    for role, email, pw in rows:
        print(f"  {role:<14}  {email:<32}  {pw}")
    print()
    print("=" * 58)
    print()


if __name__ == "__main__":
    asyncio.run(main())
