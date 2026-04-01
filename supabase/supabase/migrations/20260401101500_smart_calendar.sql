-- =============================================================================
-- Smart Calendar schema migration
-- =============================================================================

create table if not exists public.smart_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  type text not null check (type in ('manual', 'ai', 'log')),
  location text,
  tags text[] not null default '{}',
  participants text[] not null default '{}',
  recurrence jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time >= start_time)
);

comment on table public.smart_events is
  'Unified events table for user-created, AI-parsed, and log-derived calendar entities.';

drop trigger if exists trg_smart_events_updated_at on public.smart_events;
create trigger trg_smart_events_updated_at
  before update on public.smart_events
  for each row execute function set_updated_at();

create index if not exists idx_smart_events_user_start
  on public.smart_events(user_id, start_time asc);

create index if not exists idx_smart_events_user_type
  on public.smart_events(user_id, type, start_time desc);

alter table public.smart_events enable row level security;

drop policy if exists smart_events_select_own on public.smart_events;
create policy smart_events_select_own
  on public.smart_events
  for select
  using (auth.uid() = user_id);

drop policy if exists smart_events_insert_own on public.smart_events;
create policy smart_events_insert_own
  on public.smart_events
  for insert
  with check (auth.uid() = user_id);

drop policy if exists smart_events_update_own on public.smart_events;
create policy smart_events_update_own
  on public.smart_events
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists smart_events_delete_own on public.smart_events;
create policy smart_events_delete_own
  on public.smart_events
  for delete
  using (auth.uid() = user_id);

create table if not exists public.smart_event_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  rationale text not null,
  suggested_start_time time not null,
  suggested_end_time time not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  source text not null check (source in ('habit', 'mood', 'sleep', 'productivity')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_smart_suggestions_user_created
  on public.smart_event_suggestions(user_id, created_at desc);

alter table public.smart_event_suggestions enable row level security;

drop policy if exists smart_event_suggestions_select_own on public.smart_event_suggestions;
create policy smart_event_suggestions_select_own
  on public.smart_event_suggestions
  for select
  using (auth.uid() = user_id);

drop policy if exists smart_event_suggestions_insert_own on public.smart_event_suggestions;
create policy smart_event_suggestions_insert_own
  on public.smart_event_suggestions
  for insert
  with check (auth.uid() = user_id);
