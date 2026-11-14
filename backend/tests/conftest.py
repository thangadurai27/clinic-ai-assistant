"""Shared pytest setup.

Sets test-safe environment values *before* application modules import settings,
so unit tests never require real Supabase/Groq credentials.
"""
from __future__ import annotations

import os

os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("GROQ_MODEL", "llama-3.3-70b-versatile")
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")
os.environ.setdefault(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.test",
)
os.environ.setdefault(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.test",
)
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("DEMO_MODE_ENABLED", "true")
os.environ.setdefault("DEMO_USER_EMAIL", "demo@gmail.com")
os.environ.setdefault("DEMO_USER_PASSWORD", "demo123")
