-- =============================================================================
-- Women's Health Tracker – Supabase Schema
-- Phase 1: Secure Foundation
-- =============================================================================
-- Extensions
-- =============================================================================
create extension if not exists "pgcrypto";
create extension if not exists "pg_stat_statements";

-- =============================================================================
-- Helper: updated_at auto-stamp
-- =============================================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- Helper: generate a human-readable partner link code  (e.g. A7-92-B1)
-- =============================================================================
create or replace function generate_partner_code()
returns text
language plpgsql
as $$
declare
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  seg1   text := '';
  seg2   text := '';
  seg3   text := '';
  i      int;
begin
  for i in 1..2 loop
    seg1 := seg1 || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  for i in 1..2 loop
    seg2 := seg2 || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  for i in 1..2 loop
    seg3 := seg3 || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return seg1 || '-' || seg2 || '-' || seg3;
end;
$$;

-- =============================================================================
-- TABLE: profiles
-- One row per authenticated user; linked to auth.users via id.
-- =============================================================================
create table if not exists public.profiles (
  id                     uuid        primary key references auth.users(id) on delete cascade,
  username               text,
  first_name             text        not null default '',
  date_of_birth          date,
  -- average values derived from cycle history; updated by the intelligence service
  cycle_length_average   smallint    not null default 28
                           check (cycle_length_average between 15 and 60),
  period_duration_average smallint   not null default 5
                           check (period_duration_average between 1 and 15),
  -- partner feature: unique invite code shown on PartnerSyncScreen
  partner_link_code      text        unique not null default generate_partner_code(),
  -- jsonb mirrors the toggles on PartnerSyncScreen
  partner_permissions    jsonb       not null default '{"share_mood": true, "share_fertility": true, "share_symptoms": false}'::jsonb,
  is_onboarded           boolean     not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.profiles is
  'Extended user profile and preferences. One row per auth.users entry.';

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function set_updated_at();

-- index for quick lookup by partner invite code (PartnerSyncScreen, partner linking)
create unique index if not exists idx_profiles_partner_link_code
  on public.profiles(partner_link_code);

-- =============================================================================
-- TABLE: cycles
-- Each row represents one complete or in-progress menstrual cycle.
-- Predictions are written by the CycleIntelligence service (Phase 3).
-- =============================================================================
create table if not exists public.cycles (
  id                     uuid        primary key default gen_random_uuid(),
  user_id                uuid        not null references auth.users(id) on delete cascade,
  start_date             date        not null,
  end_date               date,
  -- computed cycle length in days (end_date - start_date + 1) when cycle ends
  cycle_length           smallint
                           check (cycle_length between 15 and 90),
  -- predictions written by CycleIntelligence.ts (Phase 3)
  predicted_ovulation    date,
  predicted_next_cycle   date,
  -- phase labels: 'menstrual' | 'follicular' | 'ovulation' | 'luteal'
  current_phase          text
                           check (current_phase in ('menstrual', 'follicular', 'ovulation', 'luteal')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- a user can only have one cycle starting on any given date
  unique (user_id, start_date)
);

comment on table public.cycles is
  'Individual menstrual cycles with predicted dates. The "active" cycle is the latest with a null end_date.';

create trigger trg_cycles_updated_at
  before update on public.cycles
  for each row execute function set_updated_at();

-- fast lookup for the current active cycle (end_date IS NULL)
create index if not exists idx_cycles_user_active
  on public.cycles(user_id, start_date desc)
  where end_date is null;

-- general chronological lookups across all cycles
create index if not exists idx_cycles_user_date
  on public.cycles(user_id, start_date desc);

-- =============================================================================
-- TABLE: daily_logs
-- One row per user per calendar date. Upsert on (user_id, date).
-- This is the primary logging table used by DailyLogScreen and QuickCheckinScreen.
-- =============================================================================
create table if not exists public.daily_logs (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  -- the calendar date this log belongs to (not a timestamp – one log per day)
  date           date        not null,
  -- which day of the current cycle (1-based); computed from cycles.start_date
  cycle_day      smallint    check (cycle_day between 1 and 90),
  -- FK to the cycle this day belongs to (nullable if no cycle has been started yet)
  cycle_id       uuid        references public.cycles(id) on delete set null,
  -- flow level from DailyLogScreen: 0=None, 1=Light, 2=Medium, 3=Heavy
  -- QuickCheckinScreen uses 0-4 so we allow up to 4
  flow_level     smallint    check (flow_level between 0 and 4),
  -- mood from QuickCheckinScreen / DailyLogScreen mood pickers
  -- allowed: 'Happy' | 'Sensitive' | 'Energetic' | 'Tired' | 'Calm' | 'Focused' | 'Irritable' | 'Low'
  mood           text        check (mood in ('Happy','Sensitive','Energetic','Tired',
                                             'Calm','Focused','Irritable','Low')),
  -- energy from QuickLogCard: 'Low' | 'Medium' | 'High'
  energy_level   text        check (energy_level in ('Low','Medium','High')),
  -- symptom pills from DailyLogScreen & QuickCheckinScreen
  -- allowed values: 'Cramps','Tender','Radiant','Brain Fog','Bloating','Energized','Moody','Calm'
  symptoms       text[]      not null default '{}',
  -- free-form notes from DailyLogScreen textarea (private – never shared with partner)
  notes          text,
  -- hydration widget: glasses of water logged on the home screen
  hydration_glasses smallint check (hydration_glasses between 0 and 20),
  -- sleep widget: stored in fractional hours (e.g. 7.2 = 7h 12m)
  sleep_hours    numeric(4,2) check (sleep_hours between 0 and 24),
  -- partner-alert flag from QuickCheckinScreen "Share severe cramps" toggle
  partner_alert  boolean     not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- enforce one log per user per date; use ON CONFLICT (user_id, date) DO UPDATE
  unique (user_id, date)
);

comment on table public.daily_logs is
  'Daily wellness log. One row per user per calendar date. '
  'Notes are private and never exposed via partner views.';

create trigger trg_daily_logs_updated_at
  before update on public.daily_logs
  for each row execute function set_updated_at();

-- primary access pattern: latest N days for a user
create index if not exists idx_daily_logs_user_date
  on public.daily_logs(user_id, date desc);

-- cycle-scoped lookups (e.g. all logs for a cycle)
create index if not exists idx_daily_logs_cycle
  on public.daily_logs(cycle_id, date desc)
  where cycle_id is not null;

-- partner alert lookups (realtime subscription filter)
create index if not exists idx_daily_logs_partner_alert
  on public.daily_logs(user_id, date desc)
  where partner_alert = true;

-- =============================================================================
-- TABLE: partners
-- Bidirectional partner link. One row per accepted relationship.
-- Created when user_id's partner_link_code is entered by another user.
-- =============================================================================
create table if not exists public.partners (
  id               uuid        primary key default gen_random_uuid(),
  -- the primary user (whose data is being shared)
  user_id          uuid        not null references auth.users(id) on delete cascade,
  -- the partner who has viewing access (set after code is validated)
  partner_user_id  uuid        references auth.users(id) on delete set null,
  -- the invite code that was used to create the link
  invite_code      text        not null,
  -- 'pending' → invite sent, not yet accepted
  -- 'active'  → both users connected
  -- 'revoked' → access withdrawn by the primary user
  status           text        not null default 'pending'
                     check (status in ('pending', 'active', 'revoked')),
  -- snapshot of permissions at time of linking (mirrors profiles.partner_permissions)
  permissions      jsonb       not null default '{"share_mood": true, "share_fertility": true, "share_symptoms": false}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- a user can only have one active relationship with a given partner
  unique (user_id, partner_user_id)
);

comment on table public.partners is
  'Partner link records. Controls who can view limited cycle data and under which permissions.';

create trigger trg_partners_updated_at
  before update on public.partners
  for each row execute function set_updated_at();

create index if not exists idx_partners_user
  on public.partners(user_id, status);

create index if not exists idx_partners_partner
  on public.partners(partner_user_id, status);

create index if not exists idx_partners_invite_code
  on public.partners(invite_code);

-- =============================================================================
-- VIEW: partner_visible_logs
-- Privacy-first view used by PartnerView.tsx (Phase 4).
-- Exposes ONLY non-sensitive fields. Notes are permanently excluded.
-- Partners access this view; they NEVER touch the raw daily_logs table.
-- =============================================================================
create or replace view public.partner_visible_logs
  with (security_invoker = true)
as
select
  dl.id,
  dl.user_id,
  dl.date,
  dl.cycle_day,
  dl.cycle_id,
  dl.flow_level,
  -- mood is conditionally NULL unless share_mood permission is granted
  case
    when (p.permissions->>'share_mood')::boolean = true then dl.mood
    else null
  end as mood,
  dl.energy_level,
  -- symptoms conditionally NULL unless share_symptoms permission is granted
  case
    when (p.permissions->>'share_symptoms')::boolean = true then dl.symptoms
    else '{}'::text[]
  end as symptoms,
  -- flow_level and cycle_day are part of fertility; gated on share_fertility
  case
    when (p.permissions->>'share_fertility')::boolean = true then dl.flow_level
    else null
  end as fertility_flow_level,
  -- partner_alert always visible so the partner can offer support
  dl.partner_alert,
  dl.updated_at,
  -- never expose: notes, hydration_glasses, sleep_hours, created_at
  c.current_phase  as cycle_phase,
  c.predicted_ovulation,
  c.predicted_next_cycle
from public.daily_logs dl
join public.partners p
  on p.user_id = dl.user_id
  and p.partner_user_id = auth.uid()
  and p.status = 'active'
left join public.cycles c
  on c.id = dl.cycle_id;

comment on view public.partner_visible_logs is
  'Privacy-filtered view for partner access. Notes, hydration, and sleep are permanently excluded. '
  'Mood/symptoms/fertility fields are gated behind per-user permissions.';

-- =============================================================================
-- FUNCTION: link_partner(code text)
-- Call this when a user enters a partner's invite code.
-- Returns the new partner row or raises an exception.
-- =============================================================================
create or replace function public.link_partner(code text)
returns public.partners
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id  uuid;
  new_partner     public.partners;
begin
  -- look up the user who owns this code
  select p.id into target_user_id
  from public.profiles p
  where p.partner_link_code = upper(trim(code));

  if target_user_id is null then
    raise exception 'Invalid partner code' using errcode = 'P0001';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You cannot link to yourself' using errcode = 'P0002';
  end if;

  -- upsert the partner record
  insert into public.partners (user_id, partner_user_id, invite_code, status, permissions)
  select
    target_user_id,
    auth.uid(),
    code,
    'active',
    pr.partner_permissions
  from public.profiles pr
  where pr.id = target_user_id
  on conflict (user_id, partner_user_id)
  do update set
    status = 'active',
    updated_at = now()
  returning * into new_partner;

  return new_partner;
end;
$$;

-- =============================================================================
-- FUNCTION: auto-create profile on new user sign-up
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, is_onboarded)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- attach to auth.users
drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
