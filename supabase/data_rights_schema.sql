create table if not exists public.data_rights_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('export', 'deletion')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'rejected', 'cancelled')),
  request_note text,
  result_location text,
  processor_note text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_data_rights_requests_user_requested
  on public.data_rights_requests(user_id, requested_at desc);

create trigger trg_data_rights_requests_updated_at
  before update on public.data_rights_requests
  for each row execute function set_updated_at();

alter table public.data_rights_requests enable row level security;

drop policy if exists "data_rights_requests: owner read" on public.data_rights_requests;
create policy "data_rights_requests: owner read"
  on public.data_rights_requests
  for select
  using (auth.uid() = user_id);

drop policy if exists "data_rights_requests: owner insert" on public.data_rights_requests;
create policy "data_rights_requests: owner insert"
  on public.data_rights_requests
  for insert
  with check (auth.uid() = user_id);

revoke all on public.data_rights_requests from anon, public;
grant select, insert on public.data_rights_requests to authenticated;
