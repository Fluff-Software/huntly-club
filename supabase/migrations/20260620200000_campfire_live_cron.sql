-- Step 1: Scheduled campfire sessions automation (Supabase Cron / pg_cron)
--
-- Runs a small tick every minute to:
-- - Promote scheduled sessions to live when scheduled_at <= now()
-- - Move live sessions to replay when live_started_at + duration has elapsed

create extension if not exists "pg_cron" with schema "pg_catalog";

-- Tick function (idempotent)
create or replace function public.campfire_schedule_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- scheduled -> live
  update public.campfire_sessions s
    set status = 'live',
        live_started_at = coalesce(s.live_started_at, now()),
        updated_at = now()
  where s.status = 'scheduled'
    and s.scheduled_at is not null
    and s.scheduled_at <= now();

  -- live -> replay (only when we know duration and start time)
  update public.campfire_sessions s
    set status = 'replay',
        live_ended_at = coalesce(s.live_ended_at, now()),
        updated_at = now()
  where s.status = 'live'
    and s.live_started_at is not null
    and s.duration is not null
    and now() >= (s.live_started_at + (s.duration * interval '1 millisecond'));
end;
$$;

grant execute on function public.campfire_schedule_tick() to service_role;

-- Ensure a single cron job exists.
do $$
declare
  existing_job_id integer;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'campfire-schedule-tick'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'campfire-schedule-tick',
    '* * * * *',
    $cmd$ select public.campfire_schedule_tick(); $cmd$
  );
end;
$$;

