-- Campfire "podcast" format + listen tracking.
--
-- 1. campfire_sessions gains a `format`:
--      'timeline' – the original multi-layer editor (captains, subtitles, cards…)
--      'podcast'  – a single pre-recorded audio file played on demand over the
--                   campfire background (play / pause / scrub).
--    Podcast sessions keep using status / scheduled_at / duration, so the
--    existing countdown → live → replay cron flow is unchanged. The admin
--    editor also mirrors the podcast audio onto the timeline as a single audio
--    component so older app builds still play the recording.
--
-- 2. campfire_listens records each time someone opens the campfire screen for a
--    session, whether they pressed play, how long they stayed on the screen and
--    how much audio they actually played. Clients write only through the
--    SECURITY DEFINER RPCs below; admins read via service role or the
--    campfire_listen_stats view.

-- ─── Session format ──────────────────────────────────────────────────────────

alter table public.campfire_sessions
  add column if not exists format text not null default 'timeline',
  add column if not exists podcast_audio_url text,
  add column if not exists podcast_host text;

do $$ begin
  alter table public.campfire_sessions
    add constraint campfire_sessions_format_check
    check (format in ('timeline', 'podcast'));
exception when duplicate_object then null; end $$;

comment on column public.campfire_sessions.format is
  'timeline = layered editor session; podcast = single recorded audio played on demand.';
comment on column public.campfire_sessions.podcast_audio_url is
  'Podcast format only: public URL of the recorded audio (campfire-audio bucket).';
comment on column public.campfire_sessions.podcast_host is
  'Podcast format only: host / show name shown in the player (app falls back to a default).';

-- Podcast recordings are longer than timeline clips; allow bigger files and the
-- MIME types macOS/iOS produce for .m4a. (The project-wide storage upload limit
-- still applies on top of this.)
update storage.buckets
set
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg',
    'audio/aac', 'audio/m4a', 'audio/x-m4a', 'audio/mp4'
  ]
where id = 'campfire-audio';

-- ─── Listen tracking ─────────────────────────────────────────────────────────

create table if not exists public.campfire_listens (
  id uuid primary key default gen_random_uuid(),
  session_id bigint not null references public.campfire_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Session status when the screen was opened: scheduled (countdown), live or replay.
  opened_status text,
  opened_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Wall-clock time the campfire screen was open.
  view_ms integer not null default 0,
  -- Times the listener pressed play (first press + resumes after pausing).
  play_count integer not null default 0,
  first_played_at timestamptz,
  -- Audio actually played (excludes paused time and scrubbing).
  listened_ms integer not null default 0,
  -- Furthest point reached in the recording.
  max_position_ms integer not null default 0,
  audio_duration_ms integer,
  completed boolean not null default false,
  platform text,
  app_version text
);

create index if not exists campfire_listens_session_id_idx
  on public.campfire_listens (session_id);
create index if not exists campfire_listens_user_id_idx
  on public.campfire_listens (user_id);

alter table public.campfire_listens enable row level security;

drop policy if exists "Users read own campfire_listens" on public.campfire_listens;
create policy "Users read own campfire_listens"
  on public.campfire_listens for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Service role full access to campfire_listens" on public.campfire_listens;
create policy "Service role full access to campfire_listens"
  on public.campfire_listens for all to service_role
  using (true) with check (true);

revoke all on public.campfire_listens from anon, authenticated;
grant select on public.campfire_listens to authenticated;
grant all on public.campfire_listens to service_role;

-- Opens a listen row for the signed-in user; returns its id.
create or replace function public.start_campfire_listen(
  p_session_id bigint,
  p_opened_status text default null,
  p_platform text default null,
  p_app_version text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  insert into public.campfire_listens (
    session_id, user_id, opened_status, platform, app_version
  )
  values (
    p_session_id,
    v_user,
    left(p_opened_status, 32),
    left(p_platform, 32),
    left(p_app_version, 64)
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Reports cumulative progress for a listen row. Values only ever grow, so
-- late / out-of-order flushes can't wind the numbers back.
create or replace function public.record_campfire_listen_progress(
  p_listen_id uuid,
  p_view_ms integer,
  p_play_count integer,
  p_listened_ms integer,
  p_max_position_ms integer,
  p_audio_duration_ms integer default null,
  p_completed boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.campfire_listens l
  set
    last_seen_at = now(),
    view_ms = greatest(l.view_ms, coalesce(p_view_ms, 0)),
    play_count = greatest(l.play_count, coalesce(p_play_count, 0)),
    first_played_at = case
      when l.first_played_at is null and coalesce(p_play_count, 0) > 0 then now()
      else l.first_played_at
    end,
    listened_ms = greatest(l.listened_ms, coalesce(p_listened_ms, 0)),
    max_position_ms = greatest(l.max_position_ms, coalesce(p_max_position_ms, 0)),
    audio_duration_ms = coalesce(p_audio_duration_ms, l.audio_duration_ms),
    completed = l.completed or coalesce(p_completed, false)
  where l.id = p_listen_id
    and l.user_id = auth.uid();
end;
$$;

revoke all on function public.start_campfire_listen(bigint, text, text, text) from public, anon;
revoke all on function public.record_campfire_listen_progress(uuid, integer, integer, integer, integer, integer, boolean) from public, anon;
grant execute on function public.start_campfire_listen(bigint, text, text, text) to authenticated, service_role;
grant execute on function public.record_campfire_listen_progress(uuid, integer, integer, integer, integer, integer, boolean) to authenticated, service_role;

-- Per-session rollup for the admin app / ad-hoc SQL.
create or replace view public.campfire_listen_stats with (security_invoker = on) as
select
  l.session_id,
  count(*)::integer as opens,
  count(distinct l.user_id)::integer as unique_users,
  count(*) filter (where l.play_count > 0)::integer as plays,
  count(distinct l.user_id) filter (where l.play_count > 0)::integer as unique_listeners,
  count(*) filter (where l.completed)::integer as completions,
  coalesce(sum(l.listened_ms), 0)::bigint as total_listened_ms,
  coalesce(avg(l.listened_ms) filter (where l.play_count > 0), 0)::integer as avg_listened_ms,
  coalesce(avg(l.view_ms), 0)::integer as avg_view_ms,
  max(l.opened_at) as last_opened_at
from public.campfire_listens l
group by l.session_id;

revoke all on public.campfire_listen_stats from anon, authenticated;
grant select on public.campfire_listen_stats to service_role;
