-- =============================================================================
-- Women's Health Tracker – Row Level Security Policies
-- Phase 1: Secure Foundation
--
-- Philosophy:
--  • Every table has RLS enabled with DENY-ALL as the starting point.
--  • Explicit policies are granted only where required.
--  • Partner access goes through the partner_visible_logs VIEW only.
--  • The raw daily_logs table is never directly accessible to a partner user.
-- =============================================================================

-- =============================================================================
-- Enable RLS on all tables
-- (Supabase keeps RLS disabled by default – we must opt-in explicitly)
-- =============================================================================
alter table public.profiles    enable row level security;
alter table public.cycles      enable row level security;
alter table public.daily_logs  enable row level security;
alter table public.partners    enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.scheduled_notifications enable row level security;
alter table public.notification_events enable row level security;

-- =============================================================================
-- profiles
-- =============================================================================

-- A user can read their own profile row.
create policy "profiles: owner read"
  on public.profiles
  for select
  using (auth.uid() = id);

-- A user can insert their own profile row (handled by handle_new_user trigger
-- but also allowed directly for manual setups / testing).
create policy "profiles: owner insert"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- A user can update their own profile row.
create policy "profiles: owner update"
  on public.profiles
  for update
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- Deletion is cascaded from auth.users – no direct delete policy needed.
-- (We do not allow a user to delete their own profile row directly.)

-- =============================================================================
-- cycles
-- =============================================================================

create policy "cycles: owner read"
  on public.cycles
  for select
  using (auth.uid() = user_id);

create policy "cycles: owner insert"
  on public.cycles
  for insert
  with check (auth.uid() = user_id);

create policy "cycles: owner update"
  on public.cycles
  for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cycles: owner delete"
  on public.cycles
  for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- daily_logs
-- No partner can access this table directly.
-- Partners use the partner_visible_logs VIEW (defined in schema.sql).
-- =============================================================================

create policy "daily_logs: owner read"
  on public.daily_logs
  for select
  using (auth.uid() = user_id);

create policy "daily_logs: owner insert"
  on public.daily_logs
  for insert
  with check (auth.uid() = user_id);

create policy "daily_logs: owner update"
  on public.daily_logs
  for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_logs: owner delete"
  on public.daily_logs
  for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- partners
-- Both parties to a relationship need read access so they can verify the link.
-- Only the primary user (user_id) can mutate the record (revoke, update perms).
-- =============================================================================

-- Primary user reads their own partnership records.
create policy "partners: primary user read"
  on public.partners
  for select
  using (auth.uid() = user_id);

-- Partner user (the viewer) reads records where they appear as partner_user_id.
-- This lets the partner app verify an active link exists.
create policy "partners: partner user read"
  on public.partners
  for select
  using (auth.uid() = partner_user_id);

-- Insertion is done via the link_partner() SECURITY DEFINER function.
-- We still allow direct insert so the function can write on behalf of the
-- authenticated user (the SECURITY DEFINER context sets auth.uid correctly).
create policy "partners: insert via link"
  on public.partners
  for insert
  with check (auth.uid() = partner_user_id);

-- Only the primary user (the one whose data is being shared) can update
-- permissions or revoke the connection.
create policy "partners: primary user update"
  on public.partners
  for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Only the primary user can fully delete a partner record.
create policy "partners: primary user delete"
  on public.partners
  for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- push_tokens
-- =============================================================================

create policy "push_tokens: owner read"
  on public.push_tokens
  for select
  using (auth.uid() = user_id);

create policy "push_tokens: owner insert"
  on public.push_tokens
  for insert
  with check (auth.uid() = user_id);

create policy "push_tokens: owner update"
  on public.push_tokens
  for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "push_tokens: owner delete"
  on public.push_tokens
  for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- notification_preferences
-- =============================================================================

create policy "notification_preferences: owner read"
  on public.notification_preferences
  for select
  using (auth.uid() = user_id);

create policy "notification_preferences: owner insert"
  on public.notification_preferences
  for insert
  with check (auth.uid() = user_id);

create policy "notification_preferences: owner update"
  on public.notification_preferences
  for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notification_preferences: owner delete"
  on public.notification_preferences
  for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- scheduled_notifications / notification_events
-- Reads are allowed to owners, writes are service-role only.
-- =============================================================================

create policy "scheduled_notifications: owner read"
  on public.scheduled_notifications
  for select
  using (auth.uid() = user_id);

create policy "notification_events: owner read"
  on public.notification_events
  for select
  using (auth.uid() = user_id);

-- =============================================================================
-- partner_visible_logs VIEW permissions
-- The view uses security_invoker = true so RLS on daily_logs still applies
-- for the underlying table owner. Partners access the view via the join on
-- the partners table inside the view definition itself.
-- We grant SELECT on the view to authenticated role.
-- =============================================================================
grant select on public.partner_visible_logs to authenticated;

-- =============================================================================
-- Revoke all default public access on underlying tables
-- (Extra safety layer – Supabase's default grants to anon/authenticated roles
-- are on the schema level; these table-level revokes add defence-in-depth.)
-- =============================================================================
revoke all on public.profiles           from anon, public;
revoke all on public.cycles             from anon, public;
revoke all on public.daily_logs         from anon, public;
revoke all on public.partners           from anon, public;
revoke all on public.partner_visible_logs from anon, public;
revoke all on public.push_tokens        from anon, public;
revoke all on public.notification_preferences from anon, public;
revoke all on public.scheduled_notifications from anon, public;
revoke all on public.notification_events from anon, public;

-- Re-grant only to authenticated (signed-in) users
grant select, insert, update, delete on public.profiles     to authenticated;
grant select, insert, update, delete on public.cycles       to authenticated;
grant select, insert, update, delete on public.daily_logs   to authenticated;
grant select, insert, update, delete on public.partners     to authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select on public.scheduled_notifications to authenticated;
grant select on public.notification_events to authenticated;
-- partner_visible_logs already granted above (SELECT only)

-- link_partner function is callable by authenticated users
grant execute on function public.link_partner(text) to authenticated;

-- =============================================================================
-- Supabase Realtime – enable replication for the tables used in Phase 4
-- =============================================================================
-- Run these in the Supabase dashboard under Database > Replication:
--
-- alter publication supabase_realtime add table public.daily_logs;
-- alter publication supabase_realtime add table public.partners;
--
-- (Cannot be run inside a migration file directly in all Supabase versions;
--  add manually via dashboard or use the Supabase CLI approach below.)
