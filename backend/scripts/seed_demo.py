#!/usr/bin/env python
"""
Idempotently provision the public demo account.

Usage:
    cd backend
    python scripts/seed_demo.py

The script:
  * signs the demo user in first (no password change when it already works);
  * creates the Supabase Auth user once if it is missing;
  * repairs the password only if an existing account no longer matches;
  * upserts the matching public.users + staff rows.

Safe to run on every deploy. The FastAPI app also runs this logic at startup
when DEMO_MODE_ENABLED=true, so running it manually is optional.
"""
from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.config.settings import settings  # noqa: E402
from app.demo.service import (  # noqa: E402
    DemoProvisioningError,
    demo_email,
    demo_enabled,
    ensure_demo_user_sync,
)


def main() -> int:
    if not demo_enabled():
        print("Demo mode is disabled (DEMO_MODE_ENABLED=false). Nothing to do.")
        return 0

    print(f"Provisioning demo account: {demo_email()}")
    print(f"Supabase project: {settings.SUPABASE_URL}")

    try:
        profile = ensure_demo_user_sync()
    except DemoProvisioningError as exc:
        print(f"\nFAILED: {exc}", file=sys.stderr)
        print(
            "\nCheck that SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are valid and "
            "that the Supabase project is active.",
            file=sys.stderr,
        )
        return 1
    except Exception as exc:  # pragma: no cover - depends on remote service
        print(f"\nFAILED: unexpected error: {exc}", file=sys.stderr)
        return 1

    print("\nDemo account ready.")
    print(f"  email : {profile.get('email')}")
    print(f"  role  : {profile.get('role')}")
    print(f"  id    : {profile.get('id')}")
    print("  read-only: yes (enforced by the API)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
