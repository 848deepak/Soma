alter table if exists public.push_tokens enable row level security;
alter table if exists public.notification_preferences enable row level security;
alter table if exists public.scheduled_notifications enable row level security;
alter table if exists public.notification_events enable row level security;

drop policy if exists "push_tokens: owner read" on public.push_tokens;
drop policy if exists "push_tokens: owner insert" on public.push_tokens;
drop policy if exists "push_tokens: owner update" on public.push_tokens;
drop policy if exists "push_tokens: owner delete" on public.push_tokens;

create policy "push_tokens: owner read" on public.push_tokens for select using (auth.uid() = user_id);
create policy "push_tokens: owner insert" on public.push_tokens for insert with check (auth.uid() = user_id);
create policy "push_tokens: owner update" on public.push_tokens for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_tokens: owner delete" on public.push_tokens for delete using (auth.uid() = user_id);

drop policy if exists "notification_preferences: owner read" on public.notification_preferences;
drop policy if exists "notification_preferences: owner insert" on public.notification_preferences;
drop policy if exists "notification_preferences: owner update" on public.notification_preferences;
drop policy if exists "notification_preferences: owner delete" on public.notification_preferences;

create policy "notification_preferences: owner read" on public.notification_preferences for select using (auth.uid() = user_id);
create policy "notification_preferences: owner insert" on public.notification_preferences for insert with check (auth.uid() = user_id);
create policy "notification_preferences: owner update" on public.notification_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notification_preferences: owner delete" on public.notification_preferences for delete using (auth.uid() = user_id);

drop policy if exists "scheduled_notifications: owner read" on public.scheduled_notifications;
drop policy if exists "notification_events: owner read" on public.notification_events;

create policy "scheduled_notifications: owner read" on public.scheduled_notifications for select using (auth.uid() = user_id);
create policy "notification_events: owner read" on public.notification_events for select using (auth.uid() = user_id);

revoke all on public.push_tokens from anon, public;
revoke all on public.notification_preferences from anon, public;
revoke all on public.scheduled_notifications from anon, public;
revoke all on public.notification_events from anon, public;

grant select, insert, update, delete on public.push_tokens to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select on public.scheduled_notifications to authenticated;
grant select on public.notification_events to authenticated;
