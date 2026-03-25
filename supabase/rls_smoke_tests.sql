-- RLS smoke tests for staging verification
-- Run in Supabase SQL editor using authenticated test sessions.
-- Replace UUID placeholders before running.

-- ---------------------------------------------------------------------------
-- Variables to replace:
--   :owner_id
--   :partner_id
--   :stranger_id
-- ---------------------------------------------------------------------------

-- 1) Owner can access own profile/cycle/log
select id, first_name from public.profiles where id = ':owner_id';
select id, user_id, start_date from public.cycles where user_id = ':owner_id' order by start_date desc limit 5;
select id, user_id, date from public.daily_logs where user_id = ':owner_id' order by date desc limit 5;

-- 2) Stranger cannot access owner raw data (expect 0 rows)
select id from public.cycles where user_id = ':owner_id';
select id from public.daily_logs where user_id = ':owner_id';

-- 3) Partner cannot access owner raw daily_logs directly (expect 0 rows)
select id, user_id, notes from public.daily_logs where user_id = ':owner_id' order by date desc limit 5;

-- 4) Partner can access privacy-filtered view only when relationship is active
select id, user_id, date, mood, symptoms, fertility_flow_level, partner_alert
from public.partner_visible_logs
where user_id = ':owner_id'
order by date desc
limit 10;

-- 5) Ensure sensitive fields are never exposed in partner view
-- This should fail because these columns do not exist in the view.
-- Uncomment to verify schema safety:
-- select notes, hydration_glasses, sleep_hours from public.partner_visible_logs limit 1;

-- 6) Permission-gating checks
-- After setting owner permissions to false, partner view should mask fields:
-- mood => null, symptoms => {}, fertility_flow_level => null
select date, mood, symptoms, fertility_flow_level
from public.partner_visible_logs
where user_id = ':owner_id'
order by date desc
limit 5;

-- 7) Relationship status checks
-- Set relationship to pending/revoked in staging and verify view returns 0 rows.
select count(*) as visible_rows
from public.partner_visible_logs
where user_id = ':owner_id';

-- 8) RPC safety
-- Invalid partner code should raise an exception.
-- select public.link_partner('INVALID-CODE');

-- Self-link should raise an exception when caller's own code is used.
-- select public.link_partner('<callers own code>');
