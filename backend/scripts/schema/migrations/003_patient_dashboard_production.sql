-- ============================================================
-- 003_patient_dashboard_production.sql
-- Updates for production-ready patient dashboard
-- ============================================================

-- 1. Update doctors table with requested columns
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualification TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10,2) DEFAULT 500.00;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- 2. Create medication_reminders table
CREATE TABLE IF NOT EXISTS medication_reminders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medicine     TEXT NOT NULL,
  dosage       TEXT NOT NULL,
  frequency    TEXT NOT NULL, -- e.g., 'Once daily', 'Three times a day'
  remaining    INTEGER DEFAULT 0,
  completed    INTEGER DEFAULT 0,
  scheduled_at TIME NOT NULL, -- Fixed time of day
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medication_reminders_patient ON medication_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_reminders_active ON medication_reminders(is_active);

-- 3. Update notifications table if needed (already mostly matches)
-- Ensure title and body are there (they are)

-- 4. Enable RLS
ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_medication_reminders" ON medication_reminders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_medication_reminders" ON medication_reminders FOR SELECT TO anon USING (true);
