create table if not exists public.data_rights_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.data_rights_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_type text not null check (actor_type in ('user', 'operator', 'system')),
  actor_id text,
  event_type text not null check (event_type in ('created', 'status_changed', 'cancelled', 'note_updated', 'result_linked')),
  old_status text,
  new_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_data_rights_events_request
  on public.data_rights_request_events(request_id, created_at desc);

create index if not exists idx_data_rights_events_user
  on public.data_rights_request_events(user_id, created_at desc);

alter table public.data_rights_request_events enable row level security;

drop policy if exists "data_rights_request_events: owner read" on public.data_rights_request_events;
create policy "data_rights_request_events: owner read"
  on public.data_rights_request_events
  for select
  using (auth.uid() = user_id);

revoke all on public.data_rights_request_events from anon, public;
grant select on public.data_rights_request_events to authenticated;
