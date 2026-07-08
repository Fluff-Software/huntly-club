-- Campfire live scheduling foundation
-- Adds server-authoritative start time and helper RPCs for clients.
-- NOTE: Must run AFTER campfire_sessions table is created.

alter table public.campfire_sessions
  add column if not exists live_started_at timestamptz,
  add column if not exists live_ended_at timestamptz;

create index if not exists campfire_sessions_scheduled_at_idx
  on public.campfire_sessions (scheduled_at);

create index if not exists campfire_sessions_live_started_at_idx
  on public.campfire_sessions (live_started_at);

-- Server time helper for client clock sync (uses DB time, not device time).
create or replace function public.get_server_now()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

grant execute on function public.get_server_now() to anon, authenticated, service_role;

-- Atomic transition from scheduled -> live (idempotent).
-- Only sets live_started_at once.
create or replace function public.start_campfire_session_live(target_session_id bigint)
returns public.campfire_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.campfire_sessions;
begin
  update public.campfire_sessions s
    set status = 'live',
        live_started_at = coalesce(s.live_started_at, now()),
        updated_at = now()
  where s.id = target_session_id
    and s.status = 'scheduled'
  returning * into updated;

  return updated;
end;
$$;

grant execute on function public.start_campfire_session_live(bigint) to service_role;

-- Atomic transition from live -> replay (idempotent-ish).
create or replace function public.end_campfire_session_live(target_session_id bigint)
returns public.campfire_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.campfire_sessions;
begin
  update public.campfire_sessions s
    set status = 'replay',
        live_ended_at = coalesce(s.live_ended_at, now()),
        updated_at = now()
  where s.id = target_session_id
    and s.status = 'live'
  returning * into updated;

  return updated;
end;
$$;

grant execute on function public.end_campfire_session_live(bigint) to service_role;

