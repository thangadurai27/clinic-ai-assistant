-- ============================================================
-- Clinic AI Assistant v3 — PRODUCTION READY SCHEMA
-- Complete implementation for all features
-- Run in Supabase SQL Editor after schema_v2.sql
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ─────────────────────────────────────────
-- ADDITIONAL ENUMS
-- ─────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE conversation_ownership AS ENUM ('AI_ACTIVE', 'HUMAN_ACTIVE', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE day_of_week AS ENUM ('monday','tuesday','wednesday','thursday','friday','saturday','sunday');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('emergency','new_appointment','human_takeover','new_email','new_whatsapp','low_confidence','escalation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE timeline_event_type AS ENUM ('ai_reply','human_reply','takeover_started','takeover_ended','escalated','closed','created','reopened');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- DOCTORS TABLE
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS doctors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  specialty        TEXT NOT NULL DEFAULT 'General Practice',
  email            TEXT UNIQUE,
  phone            TEXT,
  avatar_color     TEXT DEFAULT '#14b8a6',
  initials         TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  emergency_only   BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(name);
CREATE INDEX IF NOT EXISTS idx_doctors_active ON doctors(is_active);
CREATE INDEX IF NOT EXISTS idx_doctors_emergency ON doctors(emergency_only);

-- ─────────────────────────────────────────
-- DOCTOR SCHEDULES (Recurring weekly)
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS doctor_schedules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id      UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week    day_of_week NOT NULL,
  start_time     TIME NOT NULL DEFAULT '08:00',
  end_time       TIME NOT NULL DEFAULT '17:00',
  lunch_start    TIME,
  lunch_end      TIME,
  slot_duration  INTEGER NOT NULL DEFAULT 30, -- minutes
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(doctor_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor ON doctor_schedules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_day ON doctor_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_active ON doctor_schedules(is_active);

-- ─────────────────────────────────────────
-- DOCTOR LEAVES
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS doctor_leaves (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_doctor_leaves_doctor ON doctor_leaves(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_leaves_dates  ON doctor_leaves(start_date, end_date);

-- ─────────────────────────────────────────
-- CLINIC HOLIDAYS
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_holidays (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  date        DATE NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_holidays_date ON clinic_holidays(date);
CREATE INDEX IF NOT EXISTS idx_clinic_holidays_active ON clinic_holidays(is_active);

-- ─────────────────────────────────────────
-- BLOCKED SLOTS (one-time blocks)
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blocked_slots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_doctor ON blocked_slots(doctor_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_time ON blocked_slots(start_time, end_time);

-- ─────────────────────────────────────────
-- UPDATE APPOINTMENTS TABLE
-- ─────────────────────────────────────────

-- Add new columns if they don't exist
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS slot_start TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS slot_end   TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Drop doctor_name column if switching to doctor_id (optional, keep for backward compatibility)
-- ALTER TABLE appointments DROP COLUMN IF EXISTS doctor_name;

CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_slot_start ON appointments(slot_start);
CREATE INDEX IF NOT EXISTS idx_appointments_conversation ON appointments(conversation_id);

-- ─────────────────────────────────────────
-- CONVERSATION OWNERSHIP (Human Takeover)
-- ─────────────────────────────────────────

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ownership conversation_ownership DEFAULT 'AI_ACTIVE';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS taken_over_by TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS taken_over_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS resumed_ai_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_confidence FLOAT DEFAULT 1.0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_conversations_ownership ON conversations(ownership);

-- ─────────────────────────────────────────
-- CONVERSATION TIMELINE (Audit Log)
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversation_timeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  event_type      timeline_event_type NOT NULL,
  actor           TEXT,  -- 'AI', 'John (Receptionist)', 'Patient: Jane Doe'
  note            TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_timeline_conv  ON conversation_timeline(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_timeline_event ON conversation_timeline(event_type);
CREATE INDEX IF NOT EXISTS idx_conv_timeline_time  ON conversation_timeline(created_at DESC);

-- ─────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            notification_type NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  patient_id      UUID REFERENCES patients(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  escalation_id   UUID REFERENCES escalations(id) ON DELETE SET NULL,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_time ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_patient ON notifications(patient_id);

-- ─────────────────────────────────────────
-- USER ROLES AND AUTHENTICATION
-- ─────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'receptionist', 'patient');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users table (links to Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    UUID UNIQUE,  -- Supabase Auth user ID
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

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Link patients to users
ALTER TABLE patients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);

-- Link doctors to users
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);

-- Staff table (for receptionists and admin)
CREATE TABLE IF NOT EXISTS staff (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  employee_id     TEXT UNIQUE,
  department      TEXT,
  position        TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON staff(employee_id);

-- ─────────────────────────────────────────
-- RLS for new tables
-- ─────────────────────────────────────────

ALTER TABLE doctors               ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_schedules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_leaves         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_holidays       ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_keywords    ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggested_replies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache       ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_role_doctors"               ON doctors               FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_doctor_schedules"      ON doctor_schedules      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_doctor_leaves"         ON doctor_leaves         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_clinic_holidays"       ON clinic_holidays       FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_blocked_slots"         ON blocked_slots         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_conversation_timeline" ON conversation_timeline FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_notifications"         ON notifications         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_users"                 ON users                 FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_staff"                 ON staff                 FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_emergency_keywords"    ON emergency_keywords    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_suggested_replies"     ON suggested_replies     FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_activity_log"          ON activity_log          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_analytics_cache"       ON analytics_cache       FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon read for realtime subscriptions (frontend)
CREATE POLICY "anon_read_notifications"         ON notifications         FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_conversation_timeline" ON conversation_timeline FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_conversations"         ON conversations         FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_messages"              ON messages              FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_escalations"           ON escalations           FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_doctors"               ON doctors               FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "anon_read_appointments"          ON appointments          FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_users"                 ON users                 FOR SELECT TO anon USING (true);

-- ─────────────────────────────────────────
-- HELPER VIEWS (optional, for analytics)
-- ─────────────────────────────────────────

CREATE OR REPLACE VIEW v_available_doctors AS
SELECT 
  d.id,
  d.name,
  d.specialty,
  d.email,
  d.phone,
  d.avatar_color,
  d.initials,
  d.emergency_only,
  u.email as user_email,
  u.role as user_role,
  COUNT(DISTINCT ds.id) as schedule_count
FROM doctors d
LEFT JOIN doctor_schedules ds ON d.id = ds.doctor_id AND ds.is_active = true
LEFT JOIN users u ON d.user_id = u.id
WHERE d.is_active = true
GROUP BY d.id, u.email, u.role;

CREATE OR REPLACE VIEW v_active_conversations AS
SELECT 
  c.id,
  c.patient_id,
  c.channel,
  c.intent,
  c.status,
  c.ownership,
  c.taken_over_by,
  c.ai_confidence,
  c.ai_summary,
  c.created_at,
  p.name as patient_name,
  p.phone as patient_phone,
  p.email as patient_email,
  u.full_name as patient_full_name,
  COUNT(m.id) as message_count
FROM conversations c
JOIN patients p ON c.patient_id = p.id
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE c.status = 'open' OR c.ownership = 'HUMAN_ACTIVE'
GROUP BY c.id, p.id, u.full_name;

-- Dashboard stats view
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM conversations WHERE status = 'open') as active_conversations,
  (SELECT COUNT(*) FROM appointments WHERE DATE(date) = CURRENT_DATE) as appointments_today,
  (SELECT COUNT(*) FROM escalations WHERE status = 'open') as open_escalations,
  (SELECT COUNT(*) FROM patients) as total_patients,
  (SELECT COUNT(*) FROM doctors WHERE is_active = true) as active_doctors,
  (SELECT AVG(ai_confidence) FROM conversations WHERE created_at > CURRENT_DATE - INTERVAL '7 days') as avg_ai_confidence_7d;

-- Emergency escalations view
CREATE OR REPLACE VIEW v_emergency_escalations AS
SELECT 
  e.*,
  p.name as patient_name,
  p.phone as patient_phone,
  p.email as patient_email,
  c.ai_summary,
  c.channel
FROM escalations e
JOIN patients p ON e.patient_id = p.id
LEFT JOIN conversations c ON e.conversation_id = c.id
WHERE e.priority = 'critical'
  AND e.status = 'open'
ORDER BY e.created_at DESC;

-- ─────────────────────────────────────────
-- REALTIME PUBLICATION
-- ─────────────────────────────────────────

-- Enable realtime for dashboard tables
-- In Supabase Dashboard → Database → Replication, add these tables:
-- conversations, messages, escalations, notifications, conversation_timeline, appointments

-- OR if CLI supports:
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE escalations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversation_timeline;
-- ALTER PUBLICATION supabase_realtime ADD TABLE appointments;

-- ─────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
DROP TRIGGER IF EXISTS update_doctors_updated_at ON doctors;
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_doctor_schedules_updated_at ON doctor_schedules;
CREATE TRIGGER update_doctor_schedules_updated_at BEFORE UPDATE ON doctor_schedules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_doctor_leaves_updated_at ON doctor_leaves;
CREATE TRIGGER update_doctor_leaves_updated_at BEFORE UPDATE ON doctor_leaves
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clinic_holidays_updated_at ON clinic_holidays;
CREATE TRIGGER update_clinic_holidays_updated_at BEFORE UPDATE ON clinic_holidays
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────
-- EMERGENCY KEYWORDS (Feature 4)
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emergency_keywords (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword     TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'critical',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_keywords_active ON emergency_keywords(is_active);

-- Insert default emergency keywords
INSERT INTO emergency_keywords (keyword, category, severity) VALUES
  ('chest pain', 'cardiac', 'critical'),
  ('heart attack', 'cardiac', 'critical'),
  ('difficulty breathing', 'respiratory', 'critical'),
  ('can''t breathe', 'respiratory', 'critical'),
  ('severe bleeding', 'trauma', 'critical'),
  ('bleeding heavily', 'trauma', 'critical'),
  ('stroke', 'neurological', 'critical'),
  ('unconscious', 'neurological', 'critical'),
  ('not responding', 'neurological', 'critical'),
  ('allergic reaction', 'allergic', 'high'),
  ('anaphylaxis', 'allergic', 'critical'),
  ('suicidal', 'mental health', 'critical'),
  ('want to die', 'mental health', 'critical'),
  ('kill myself', 'mental health', 'critical'),
  ('overdose', 'toxicology', 'critical'),
  ('poisoned', 'toxicology', 'critical')
ON CONFLICT (keyword) DO NOTHING;

-- ─────────────────────────────────────────
-- CONVERSATION SUMMARIES (Feature 6)
-- ─────────────────────────────────────────

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS summary_generated_at TIMESTAMPTZ;

-- ─────────────────────────────────────────
-- AI SUGGESTED REPLIES (Feature 12)
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS suggested_replies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  suggestions     JSONB NOT NULL,  -- Array of 3 suggested replies
  was_used        BOOLEAN DEFAULT false,
  used_reply      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggested_replies_conv ON suggested_replies(conversation_id);
CREATE INDEX IF NOT EXISTS idx_suggested_replies_created ON suggested_replies(created_at DESC);

-- ─────────────────────────────────────────
-- ACTIVITY LOG (for audit trail)
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  resource    TEXT,
  resource_id UUID,
  details     JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_resource ON activity_log(resource, resource_id);

-- ─────────────────────────────────────────
-- ANALYTICS CACHE (Feature 13)
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name   TEXT NOT NULL UNIQUE,
  metric_value  JSONB NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_metric ON analytics_cache(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);

-- ─────────────────────────────────────────
-- SAMPLE DATA INSERTION (optional, use seeder instead)
-- ─────────────────────────────────────────

-- Uncomment to insert sample holidays:
-- INSERT INTO clinic_holidays (name, date) VALUES
--   ('New Year''s Day', '2025-01-01'),
--   ('Independence Day', '2025-07-04'),
--   ('Christmas', '2025-12-25')
-- ON CONFLICT (date) DO NOTHING;

