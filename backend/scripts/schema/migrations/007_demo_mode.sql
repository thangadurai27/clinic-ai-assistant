-- ============================================================
-- Migration 007 — Public demo mode
-- ============================================================
-- Adds an explicit flag for the public demo account and ensures the tables the
-- dashboard subscribes to are available in Supabase Realtime.
--
-- The demo account is deliberately isolated:
--   * it has no patient/staff/clinical rows beyond its own users + staff link;
--   * all demo reads are served from static sample data in the backend;
--   * all demo writes are rejected by the API (HTTP 403).
-- No production tables are seeded by this migration.
--
-- Idempotent: safe to run more than once.

-- ------------------------------------------------------------
-- 1. users.is_demo
-- ------------------------------------------------------------
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_is_demo
    ON public.users (is_demo)
    WHERE is_demo = TRUE;

COMMENT ON COLUMN public.users.is_demo IS
    'True only for the public read-only demo account. Enforced by the backend; never set on real users.';

-- ------------------------------------------------------------
-- 2. Realtime publication (dashboard live updates)
-- ------------------------------------------------------------
DO $$
DECLARE
    tbl TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH tbl IN ARRAY ARRAY[
            'conversations',
            'messages',
            'escalations',
            'notifications',
            'conversation_timeline',
            'appointments',
            'medication_reminders'
        ]
        LOOP
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = tbl
            ) AND NOT EXISTS (
                SELECT 1 FROM pg_publication_tables
                WHERE pubname = 'supabase_realtime' AND tablename = tbl
            ) THEN
                EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
            END IF;
        END LOOP;
    END IF;
END $$;

-- ------------------------------------------------------------
-- 3. Verification
-- ------------------------------------------------------------
-- SELECT email, role, is_demo FROM public.users WHERE is_demo = TRUE;
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
