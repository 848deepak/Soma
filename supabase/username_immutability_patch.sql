-- Enforce immutable usernames after first successful set.
-- Safe to run multiple times.

create or replace function public.prevent_username_change_after_set()
returns trigger
language plpgsql
as $$
begin
  if old.username is not null
     and btrim(old.username) <> ''
     and new.username is distinct from old.username then
    raise exception using
      errcode = '23514',
      message = 'Username is immutable after initial creation.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_username_immutable on public.profiles;

create trigger trg_profiles_username_immutable
before update on public.profiles
for each row
execute function public.prevent_username_change_after_set();
