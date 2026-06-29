-- Track processed inbound emails by Message-ID (deduplication)
CREATE TABLE IF NOT EXISTS public.processed_emails (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    TEXT NOT NULL UNIQUE,
  sender_email  TEXT NOT NULL,
  subject       TEXT,
  imap_uid      INTEGER,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_emails_sender
  ON public.processed_emails(sender_email);

CREATE INDEX IF NOT EXISTS idx_processed_emails_processed_at
  ON public.processed_emails(processed_at DESC);

ALTER TABLE public.processed_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_processed_emails_all" ON public.processed_emails
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
