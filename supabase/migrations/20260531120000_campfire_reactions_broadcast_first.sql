-- Scalable campfire reactions: ephemeral broadcast for live UI, aggregated totals for analytics.
-- Hot path no longer inserts one row per tap (see 20260620240000_campfire_reactions.sql).

-- Per-user per-second rate buckets (lightweight; not a full event log).
create table if not exists public.campfire_reaction_rate_buckets (
  session_id bigint not null references public.campfire_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket_second_utc timestamp not null,
  primary key (session_id, user_id, bucket_second_utc)
);

-- Aggregated counts per session + emoji.
create table if not exists public.campfire_reaction_totals (
  session_id bigint not null references public.campfire_sessions(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  count bigint not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (session_id, emoji)
);

create index if not exists campfire_reaction_totals_session_idx
  on public.campfire_reaction_totals (session_id);

alter table public.campfire_reaction_rate_buckets enable row level security;
alter table public.campfire_reaction_totals enable row level security;

-- Clients never read/write buckets directly.
create policy "Campfire reaction buckets (none)"
on public.campfire_reaction_rate_buckets
for all
to authenticated
using (false)
with check (false);

create policy "Campfire reaction totals read (live sessions)"
on public.campfire_reaction_totals
for select
to authenticated
using (
  exists (
    select 1
    from public.campfire_sessions s
    where s.id = session_id
      and s.status in ('live', 'scheduled', 'replay')
  )
);

create policy "Campfire reaction totals write (none)"
on public.campfire_reaction_totals
for all
to authenticated
using (false)
with check (false);

-- Stop synchronous insert -> broadcast trigger (hot-path bottleneck).
drop trigger if exists campfire_reactions_broadcast on public.campfire_reactions;

revoke insert on public.campfire_reactions from authenticated;

drop policy if exists "Campfire reactions insert (live or scheduled wait)" on public.campfire_reactions;
drop policy if exists "Campfire reactions insert (live only)" on public.campfire_reactions;

create or replace function public.can_send_campfire_reaction(p_session_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.campfire_sessions s
      where s.id = p_session_id
        and s.status in ('live', 'scheduled')
    );
$$;

grant execute on function public.can_send_campfire_reaction(bigint) to authenticated, service_role;

-- Rate-limited aggregate increment (max one counted reaction per user per UTC second).
create or replace function public.record_campfire_reaction(
  p_session_id bigint,
  p_emoji text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket_ts timestamp;
  inserted boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  if p_emoji is null or char_length(p_emoji) < 1 or char_length(p_emoji) > 8 then
    return false;
  end if;

  if not public.can_send_campfire_reaction(p_session_id) then
    return false;
  end if;

  bucket_ts := date_trunc('second', now() at time zone 'UTC');

  insert into public.campfire_reaction_rate_buckets (session_id, user_id, bucket_second_utc)
  values (p_session_id, auth.uid(), bucket_ts)
  on conflict do nothing;

  inserted := found;

  if not inserted then
    return false;
  end if;

  insert into public.campfire_reaction_totals (session_id, emoji, count)
  values (p_session_id, p_emoji, 1)
  on conflict (session_id, emoji)
  do update set
    count = public.campfire_reaction_totals.count + 1,
    updated_at = now();

  return true;
end;
$$;

grant execute on function public.record_campfire_reaction(bigint, text) to authenticated, service_role;

create or replace function public.get_campfire_reaction_total(p_session_id bigint)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(t.count), 0)::bigint
  from public.campfire_reaction_totals t
  where t.session_id = p_session_id;
$$;

grant execute on function public.get_campfire_reaction_total(bigint) to authenticated, service_role;
