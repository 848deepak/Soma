create table if not exists public.parental_consents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references auth.users(id) on delete cascade,
  parent_email text not null,
  verification_token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'verified', 'expired', 'revoked')),
  child_date_of_birth date,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_parental_consents_child_requested
  on public.parental_consents(child_id, requested_at desc);

create index if not exists idx_parental_consents_status_expires
  on public.parental_consents(status, expires_at);

create trigger trg_parental_consents_updated_at
  before update on public.parental_consents
  for each row execute function set_updated_at();

alter table public.parental_consents enable row level security;

drop policy if exists "parental_consents: child read" on public.parental_consents;
create policy "parental_consents: child read"
  on public.parental_consents
  for select
  using (auth.uid() = child_id);

drop policy if exists "parental_consents: child insert" on public.parental_consents;
create policy "parental_consents: child insert"
  on public.parental_consents
  for insert
  with check (auth.uid() = child_id);

revoke all on public.parental_consents from anon, public;
grant select, insert on public.parental_consents to authenticated;
