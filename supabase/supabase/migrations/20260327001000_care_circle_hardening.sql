-- Care Circle schema migration (tracked)
-- Brings role-aware sharing objects into the managed migration timeline.

alter table public.profiles
add column if not exists default_care_circle_role text default 'viewer'
  check (default_care_circle_role in ('viewer', 'trusted', 'mutual'));

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
  case
    when (p.permissions->>'role' in ('trusted', 'mutual'))
      and (p.permissions->>'share_mood')::boolean = true
    then dl.mood
    else null
  end as mood,
  dl.energy_level,
  case
    when (p.permissions->>'role' in ('trusted', 'mutual'))
      and (p.permissions->>'share_symptoms')::boolean = true
    then dl.symptoms
    else '{}'::text[]
  end as symptoms,
  case
    when (p.permissions->>'role' in ('trusted', 'mutual', 'viewer'))
      and (p.permissions->>'share_fertility')::boolean = true
    then dl.flow_level
    else null
  end as fertility_flow_level,
  case
    when (p.permissions->>'role' in ('trusted', 'mutual'))
      and (p.permissions->>'share_notes')::boolean = true
    then dl.notes
    else null
  end as notes,
  dl.partner_alert,
  dl.updated_at,
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
  p.permissions->>'role' as connection_role
from public.daily_logs dl
join public.partners p
  on p.user_id = dl.user_id
  and p.partner_user_id = auth.uid()
  and p.status = 'active'
left join public.cycles c
  on c.id = dl.cycle_id;

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
  target_user_id uuid;
  new_partner public.partners;
  new_permissions jsonb;
begin
  if role not in ('viewer', 'trusted', 'mutual') then
    raise exception 'Invalid role: %', role using errcode = 'P0003';
  end if;
  if role = 'mutual' then
    raise exception 'Mutual role must be confirmed by both users' using errcode = 'P0004';
  end if;

  select p.id into target_user_id
  from public.profiles p
  where p.partner_link_code = upper(trim(code));

  if target_user_id is null then
    raise exception 'Invalid partner code' using errcode = 'P0001';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'You cannot link to yourself' using errcode = 'P0002';
  end if;

  new_permissions := (
    select pr.partner_permissions || jsonb_build_object('role', role, 'share_notes', false)
    from public.profiles pr
    where pr.id = target_user_id
  );

  insert into public.partners (user_id, partner_user_id, invite_code, status, permissions)
  values (target_user_id, auth.uid(), code, 'active', new_permissions)
  on conflict (user_id, partner_user_id)
  do update set status = 'active', permissions = new_permissions, updated_at = now()
  returning * into new_partner;

  return new_partner;
end;
$$;

grant select on public.shared_data to authenticated;
grant execute on function public.link_partner(text, text) to authenticated;
