create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace existing job if present to keep this idempotent.
do $$
declare
  existing_id bigint;
begin
  select jobid into existing_id
  from cron.job
  where jobname = 'process-scheduled-notifications-every-10m'
  limit 1;

  if existing_id is not null then
    perform cron.unschedule(existing_id);
  end if;

  perform cron.schedule(
    'process-scheduled-notifications-every-10m',
    '*/10 * * * *',
    $cron$
      select net.http_post(
        url := 'https://wqgprkhkbqcbokxstxrq.supabase.co/functions/v1/process-scheduled-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
      ) as request_id;
    $cron$
  );
end
$$;
