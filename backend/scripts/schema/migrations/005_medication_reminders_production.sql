-- ============================================================
-- 005_medication_reminders_production.sql
-- Final production schema for medication reminders
-- ============================================================

-- Drop existing if exists to ensure clean state with requested columns
DROP TABLE IF EXISTS public.medication_reminders CASCADE;

CREATE TABLE public.medication_reminders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage        TEXT NOT NULL,
  frequency     TEXT NOT NULL,
  instructions  TEXT,
  start_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date      DATE,
  reminder_time TIME NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active', -- active, completed, paused
  completed     BOOLEAN NOT NULL DEFAULT false, -- Indicates if taken today
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_medication_reminders_patient_id ON public.medication_reminders(patient_id);
CREATE INDEX idx_medication_reminders_status ON public.medication_reminders(status);
CREATE INDEX idx_medication_reminders_reminder_time ON public.medication_reminders(reminder_time);

-- Enable RLS
ALTER TABLE public.medication_reminders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Patients can view their own medications"
  ON public.medication_reminders FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.patients WHERE id = patient_id));

CREATE POLICY "Patients can insert their own medications"
  ON public.medication_reminders FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.patients WHERE id = patient_id));

CREATE POLICY "Patients can update their own medications"
  ON public.medication_reminders FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.patients WHERE id = patient_id));

CREATE POLICY "Patients can delete their own medications"
  ON public.medication_reminders FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM public.patients WHERE id = patient_id));

-- Realtime support (Enable for this table)
ALTER PUBLICATION supabase_realtime ADD TABLE public.medication_reminders;
