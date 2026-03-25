create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_type text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_user_created
  on public.audit_logs(user_id, created_at desc);

create index if not exists idx_audit_logs_resource_action
  on public.audit_logs(resource_type, action, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs: owner read" on public.audit_logs;
create policy "audit_logs: owner read"
  on public.audit_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "audit_logs: owner insert" on public.audit_logs;
create policy "audit_logs: owner insert"
  on public.audit_logs
  for insert
  with check (auth.uid() = user_id);

revoke all on public.audit_logs from anon, public;
grant select, insert on public.audit_logs to authenticated;
