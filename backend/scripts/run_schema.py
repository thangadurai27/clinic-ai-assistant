"""
Apply scripts/schema/schema.sql via Supabase SQL editor instructions.

Reads credentials from backend/.env (via pydantic settings).
For full schema application, paste scripts/schema/schema.sql into the Supabase SQL editor.
"""
from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.config.settings import settings  # noqa: E402


def main() -> None:
    schema_path = BACKEND_ROOT / "scripts" / "schema" / "schema.sql"
    if not schema_path.exists():
        print(f"Schema file not found: {schema_path}")
        sys.exit(1)

    sql = schema_path.read_text(encoding="utf-8")
    project_ref = settings.SUPABASE_URL.replace("https://", "").split(".")[0]

    print("KLM AI Clinic — Database Schema")
    print("=" * 50)
    print(f"Supabase project: {project_ref}")
    print(f"Schema file:      {schema_path.name} ({len(sql.splitlines())} lines)")
    print()
    print("Apply the schema in Supabase Dashboard:")
    print(f"  https://supabase.com/dashboard/project/{project_ref}/sql/new")
    print()
    print("Paste the contents of scripts/schema/schema.sql and run.")


if __name__ == "__main__":
    main()
