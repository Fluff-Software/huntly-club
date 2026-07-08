-- Step 5: Persisted reactions + basic rate limiting (DB -> Realtime broadcast)
--
-- Clients insert reactions into public.campfire_reactions.
-- A trigger broadcasts them to the private Realtime topic `campfire:{session_id}`.

create table if not exists public.campfire_reactions (
  id uuid primary key default gen_random_uuid(),
  session_id bigint not null references public.campfire_sessions(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  playhead_ms integer,
  created_at timestamptz not null default now(),
  -- Use a timezone-free, immutable expression for rate limiting.
  created_second_utc timestamp generated always as (date_trunc('second', created_at at time zone 'UTC')) stored
);

create index if not exists campfire_reactions_session_created_idx
  on public.campfire_reactions (session_id, created_at desc);

-- Basic anti-spam: at most 1 reaction per user per session per second.
create unique index if not exists campfire_reactions_rate_limit_idx
  on public.campfire_reactions (session_id, user_id, created_second_utc);

alter table public.campfire_reactions enable row level security;

-- Users can insert only for live sessions, as themselves.
drop policy if exists "Campfire reactions insert (live only)" on public.campfire_reactions;
create policy "Campfire reactions insert (live only)"
on public.campfire_reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.campfire_sessions s
    where s.id = session_id
      and s.status = 'live'
  )
);

-- No direct selects from clients (we render via realtime broadcasts).
drop policy if exists "Campfire reactions select (none)" on public.campfire_reactions;
create policy "Campfire reactions select (none)"
on public.campfire_reactions
for select
to authenticated
using (false);

-- Broadcast on insert.
create or replace function public.broadcast_campfire_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'emoji', new.emoji,
      'at', new.created_at,
      'playhead_ms', new.playhead_ms,
      'user_id', new.user_id
    ),
    'reaction',
    'campfire:' || new.session_id::text,
    true
  );
  return new;
end;
$$;

drop trigger if exists campfire_reactions_broadcast on public.campfire_reactions;
create trigger campfire_reactions_broadcast
after insert on public.campfire_reactions
for each row
execute function public.broadcast_campfire_reaction();

grant insert on public.campfire_reactions to authenticated;

