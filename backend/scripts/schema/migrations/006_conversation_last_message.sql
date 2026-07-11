-- ============================================================
-- 006_conversation_last_message.sql
-- Adds last_message and last_message_at columns to conversations table
-- ============================================================

-- Add last_message and last_message_at columns
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
