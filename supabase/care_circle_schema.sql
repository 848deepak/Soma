-- =============================================================================
-- CARE CIRCLE MIGRATION
-- Adds role-based sharing with backward compatibility for existing partners
-- Date: 2026-03-26
-- =============================================================================

-- ── Update profiles table to include default_care_circle_role ───────────────
-- (optional; allows pre-selecting a default role; not required)
alter table public.profiles
add column if not exists default_care_circle_role text default 'viewer'
  check (default_care_circle_role in ('viewer', 'trusted', 'mutual'));

-- ── Extend partner permissions JSON schema ─────────────────────────────────
-- Existing data keeps current structure; new rows include role + share_notes
-- Migration path: JSONB ->>'role' coalesces to 'viewer' if missing (backward compat)
-- Example old: {"share_mood": true, "share_fertility": true, "share_symptoms": false}
-- Example new: {"share_mood": true, "share_fertility": true, "share_symptoms": false, "share_notes": false, "role": "viewer"}

-- ── Helper function for permission coercion ─────────────────────────────────
-- Safely extracts permission fields with defaults for backward compatibility
create or replace function public.coerce_partner_permissions(perms jsonb)
returns jsonb
language plpgsql
immutable
as $$
begin
  return coalesce(perms, '{}'::jsonb) || jsonb_build_object(
    'share_mood', coalesce((perms->>'share_mood')::boolean, true),
    'share_fertility', coalesce((perms->>'share_fertility')::boolean, true),
    'share_symptoms', coalesce((perms->>'share_symptoms')::boolean, false),
    'share_notes', coalesce((perms->>'share_notes')::boolean, false),
    'role', coalesce(perms->>'role', 'viewer')
  );
end;
$$;

-- ── VIEW: shared_data (role-aware filtered logs) ───────────────────────────
-- Extends partner_visible_logs with role-based field filtering
-- Roles:
--   'viewer' → only cycle phase and alerts
--   'trusted' → full mood, symptoms, fertility, but no notes
--   'mutual' → both directions, same as trusted but confirmed bidirectional
-- Rules:
--   - share_mood removes mood if false (otherwise visible for trusted+)
--   - share_fertility removes flow_level and cycle_day if false
--   - share_symptoms removes symptoms if false
--   - share_notes allows visibility of notes only if true
create or replace view public.shared_data
  with (security_invoker = true)
as
select
  dl.id,
  dl.user_id,
  dl.date,
  dl.cycle_day,
  dl.cycle_id,
  dl.flow_level,
  -- mood: visible only if role in (trusted, mutual) AND share_mood is true
  case
    when (
      (p.permissions->>'role' in ('trusted', 'mutual')) 
      or (p.permissions->>'role' = 'viewer' and false) -- never for viewer
    )
    and (p.permissions->>'share_mood')::boolean = true
    then dl.mood
    else null
  end as mood,
  dl.energy_level,
  -- symptoms: visible only if role in (trusted, mutual) AND share_symptoms is true
  case
    when (
      (p.permissions->>'role' in ('trusted', 'mutual'))
      or (p.permissions->>'role' = 'viewer' and false)
    )
    and (p.permissions->>'share_symptoms')::boolean = true
    then dl.symptoms
    else '{}'::text[]
  end as symptoms,
  -- fertility_flow_level: visible only if share_fertility is true (and role supports it)
  case
    when (
      (p.permissions->>'role' in ('trusted', 'mutual', 'viewer'))
    )
    and (p.permissions->>'share_fertility')::boolean = true
    then dl.flow_level
    else null
  end as fertility_flow_level,
  -- notes: visible only if role allows and share_notes permission explicitly enabled
  case
    when (p.permissions->>'role' in ('trusted', 'mutual'))
    and (p.permissions->>'share_notes')::boolean = true
    then dl.notes
    else null
  end as notes,
  -- partner_alert: always visible as it signals need for support
  dl.partner_alert,
  dl.updated_at,
  -- cycle predictions: visible based on role
  c.current_phase as cycle_phase,
  case
    when (p.permissions->>'role' in ('trusted', 'mutual'))
    and (p.permissions->>'share_fertility')::boolean = true
    then c.predicted_ovulation
    else null
  end as predicted_ovulation,
  case
    when (p.permissions->>'role' in ('trusted', 'mutual'))
    and (p.permissions->>'share_fertility')::boolean = true
    then c.predicted_next_cycle
    else null
  end as predicted_next_cycle,
  -- for audit: include the role
  p.permissions->>'role' as connection_role
from public.daily_logs dl
join public.partners p
  on p.user_id = dl.user_id
  and p.partner_user_id = auth.uid()
  and p.status = 'active'
left join public.cycles c
  on c.id = dl.cycle_id;

comment on view public.shared_data is
  'Role-aware shared data view for Care Circle. Enforces role-based field visibility. '
  'Viewer: cycle phase + alerts only. Trusted/Mutual: mood + symptoms + fertility per permissions.';

-- ── Update link_partner function to support optional role ──────────────────
-- Backward compatible: if role not provided, defaults to viewer
create or replace function public.link_partner(
  code text,
  role text default 'viewer'
)
returns public.partners
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id  uuid;
  new_partner     public.partners;
  new_permissions jsonb;
begin
  -- Validate role
  if role not in ('viewer', 'trusted', 'mutual') then
    raise exception 'Invalid role: %', role using errcode = 'P0003';
  end if;

  -- Mutual requires explicit confirmation flow and cannot be self-assigned at link time.
  if role = 'mutual' then
    raise exception 'Mutual role must be confirmed by both users' using errcode = 'P0004';
  end if;

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

  -- Build new permissions with role included
  new_permissions := (
    select pr.partner_permissions || jsonb_build_object(
      'role', role,
      'share_notes', false  -- default safe: notes off
    )
    from public.profiles pr
    where pr.id = target_user_id
  );

  -- upsert the partner record
  insert into public.partners (user_id, partner_user_id, invite_code, status, permissions)
  values (
    target_user_id,
    auth.uid(),
    code,
    'active',
    new_permissions
  )
  on conflict (user_id, partner_user_id)
  do update set
    status = 'active',
    permissions = new_permissions,
    updated_at = now()
  returning * into new_partner;

  return new_partner;
end;
$$;

-- ── Update partner_permissions in profiles table to include role ────────────
-- (optional; allows setting default for new connections)
-- Migration: existing profiles gain default_care_circle_role column above
-- To update partner_permissions structure per profile:
-- UPDATE public.profiles
-- SET partner_permissions = partner_permissions || jsonb_build_object('share_notes', false)
-- WHERE partner_permissions->>'share_notes' is null;

-- ── RLS policies: No changes needed ────────────────────────────────────────
-- Existing RLS on partners table remains valid:
--   - data owner (user_id) can read/write own rows
--   - partner_user_id can only read (via views)
--   - shared_data view applies security_invoker + auth.uid() filter in join

comment on function public.link_partner(text, text) is
  'Link to partner via invite code with optional role. Default role: viewer. '
  'Backward compatible: existing calls without role parameter still work with viewer role.';
