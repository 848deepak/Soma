-- =============================================================================
-- Notifications Schema (Scheduled + Behavioral)
-- =============================================================================

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  token_type text not null default 'unknown',
  device_type text not null check (device_type in ('ios', 'android', 'web')),
  timezone text not null default 'UTC',
  app_version text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_tokens_user on public.push_tokens(user_id);
create index if not exists idx_push_tokens_active on public.push_tokens(user_id, revoked_at) where revoked_at is null;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_reminders boolean not null default true,
  period_alerts boolean not null default true,
  ovulation_alerts boolean not null default true,
  behavioral_alerts boolean not null default true,
  max_per_day smallint not null default 3 check (max_per_day between 1 and 10),
  quiet_hours_start smallint not null default 22 check (quiet_hours_start between 0 and 23),
  quiet_hours_end smallint not null default 8 check (quiet_hours_end between 0 and 23),
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scheduled_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('daily_log', 'period_alert', 'ovulation_alert', 'behavioral_inactive', 'behavioral_cycle_phase')),
  title text not null,
  body text not null,
  route text,
  payload jsonb not null default '{}'::jsonb,
  timezone text not null default 'UTC',
  scheduled_for_utc timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'suppressed')),
  retry_count smallint not null default 0,
  max_retries smallint not null default 3,
  dedupe_key text,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dedupe_key)
);

create index if not exists idx_scheduled_notifications_due
  on public.scheduled_notifications(status, scheduled_for_utc)
  where status in ('pending', 'failed');

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.scheduled_notifications(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('scheduled', 'sent', 'opened', 'failed', 'suppressed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_events_user_created
  on public.notification_events(user_id, created_at desc);

alter table public.profiles
  add column if not exists notification_preferences jsonb not null default '{"daily_reminders": true, "period_alerts": true, "ovulation_alerts": true, "behavioral_alerts": true}'::jsonb;

alter table public.profiles
  add column if not exists timezone text not null default 'UTC';
