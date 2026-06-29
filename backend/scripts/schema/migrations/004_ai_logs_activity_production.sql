-- ============================================================
-- 004_ai_logs_activity_production.sql
-- Senior Engineer Fixed & Robust Migration
-- ============================================================

BEGIN;

-- Set search path to ensure we are in the right schema
SET search_path TO public, extensions;

-- ============================================================
-- 1. Ensure Activity Log Table Exists
-- ============================================================

-- Check if any variation of the activity log table exists.
-- If not, create the standard 'activity_log' table.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('activity_log', 'activity_logs', 'activities', 'audit_logs')
    ) THEN
        CREATE TABLE public.activity_log (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
            patient_id  UUID REFERENCES public.patients(id) ON DELETE SET NULL,
            action      TEXT NOT NULL,
            resource    TEXT,
            resource_id UUID,
            details     JSONB DEFAULT '{}'::jsonb,
            ip_address  TEXT,
            user_agent  TEXT,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.activity_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_activity_log_patient ON public.activity_log(patient_id);
        CREATE INDEX IF NOT EXISTS idx_activity_log_created ON public.activity_log(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_activity_log_resource ON public.activity_log(resource, resource_id);

        ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_activity_log_all') THEN
            CREATE POLICY "service_role_activity_log_all" ON public.activity_log
                FOR ALL TO service_role USING (true) WITH CHECK (true);
        END IF;
    ELSE
        -- If it exists under a different name, standardizing is requested, 
        -- but safety first: just ensure the column patient_id exists in whatever we found.
        -- Given requirements, we use 'activity_log' as the target name.
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_logs') THEN
            ALTER TABLE public.activity_logs RENAME TO activity_log;
        ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activities') THEN
            ALTER TABLE public.activities RENAME TO activity_log;
        ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
            ALTER TABLE public.audit_logs RENAME TO activity_log;
        END IF;

        -- Ensure patient_id exists on the (now renamed) activity_log table
        ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- 2. AI Logs Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt          TEXT NOT NULL,
    intent          TEXT,
    confidence      DOUBLE PRECISION DEFAULT 0.0,
    response        TEXT NOT NULL,
    response_time   DOUBLE PRECISION NOT NULL,
    token_usage     INTEGER,
    escalated       BOOLEAN DEFAULT FALSE,
    ai_model        TEXT NOT NULL,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    patient_id      UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    metadata        JSONB DEFAULT '{}'::jsonb,
    timestamp       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_timestamp ON public.ai_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_conversation ON public.ai_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_patient ON public.ai_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_escalated ON public.ai_logs(escalated);

ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_ai_logs_all') THEN
        CREATE POLICY "service_role_ai_logs_all" ON public.ai_logs
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ============================================================
-- 3. Conversation Enhancements
-- ============================================================

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS gmail_thread_id TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_gmail_thread ON public.conversations(gmail_thread_id);

-- ============================================================
-- 4. Notification Enum & Columns
-- ============================================================

DO $$
BEGIN
    -- Add new notification types to existing enum safely
    BEGIN
        ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'new_email';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'new_whatsapp';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'low_confidence';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'escalation';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- Ensure notification metadata exists
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================================
-- 5. Realtime Subscriptions
-- ============================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Add tables to realtime publication if not already present
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ai_logs') THEN
            ALTER TABLE public.ai_logs REPLICA IDENTITY FULL;
            ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_logs;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'activity_log') THEN
            ALTER TABLE public.activity_log REPLICA IDENTITY FULL;
            ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
        END IF;
    END IF;
END $$;

-- ============================================================
-- 6. Default Doctors Seeding
-- ============================================================

-- Ensure columns exist from migration 003 if they are missing
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS qualification TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10,2) DEFAULT 0.00;

-- Upsert medical staff (idempotent)
INSERT INTO public.doctors (name, specialty, qualification, experience_years, consultation_fee, avatar_color, initials, is_active)
SELECT * FROM (VALUES
    ('Dr. Sarah Mitchell',  'General Medicine',    'MBBS, MD',             12, 500.00, '#14b8a6', 'SM', true),
    ('Dr. James Patel',    'Cardiologist',         'MBBS, DM Cardiology',  18, 800.00, '#6366f1', 'JP', true),
    ('Dr. Priya Sharma',   'Pediatrics',           'MBBS, DCH',             8, 450.00, '#22c55e', 'PS', true),
    ('Dr. Michael Chen',   'Orthopedics',          'MBBS, MS Orthopedics', 15, 700.00, '#f59e0b', 'MC', true),
    ('Dr. Kavitha Reddy',  'Gynecology',           'MBBS, MS OBG',         14, 650.00, '#ef4444', 'KR', true),
    ('Dr. Arjun Kumar',    'Neurology',            'MBBS, DM Neurology',   11, 900.00, '#8b5cf6', 'AK', true),
    ('Dr. Sneha Iyer',     'Dermatology',          'MBBS, MD Dermatology', 10, 550.00, '#06b6d4', 'SI', true),
    ('Dr. Rahul Menon',    'ENT',                  'MBBS, MS ENT',         13, 600.00, '#84cc16', 'RM', true)
) AS v(name, specialty, qualification, experience_years, consultation_fee, avatar_color, initials, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.doctors LIMIT 1);

COMMIT;
