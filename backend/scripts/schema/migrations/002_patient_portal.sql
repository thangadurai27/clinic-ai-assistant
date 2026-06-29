-- Patient portal completion migration.
-- Apply in Supabase SQL editor after the base schema. This migration is
-- additive only and does not remove existing data.

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null unique references public.patients(id) on delete cascade,
  dob date,
  gender text,
  address text,
  emergency_contact text,
  medical_history text,
  allergies text,
  profile_photo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.messages
  add column if not exists status text not null default 'sent',
  add column if not exists delivery_status text,
  add column if not exists read_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.notifications
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_status_check'
  ) then
    alter table public.messages
      add constraint messages_status_check
      check (status in ('sent', 'delivered', 'read', 'failed'));
  end if;
end $$;

create index if not exists idx_profiles_patient_id on public.profiles(patient_id);
create index if not exists idx_notifications_patient_created on public.notifications(patient_id, created_at desc);
create index if not exists idx_messages_conversation_timestamp on public.messages(conversation_id, timestamp asc);
