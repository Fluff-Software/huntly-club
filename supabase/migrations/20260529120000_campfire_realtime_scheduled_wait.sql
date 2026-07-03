-- Allow realtime presence/broadcast (and reactions) while users wait on a scheduled session.

create or replace function public.can_access_campfire_topic(topic text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and split_part(topic, ':', 1) = 'campfire'
    and exists (
      select 1
      from public.campfire_sessions s
      where s.id = nullif(split_part(topic, ':', 2), '')::bigint
        and s.status in ('live', 'scheduled')
    );
$$;

drop policy if exists "Campfire reactions insert (live only)" on public.campfire_reactions;
create policy "Campfire reactions insert (live or scheduled wait)"
on public.campfire_reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.campfire_sessions s
    where s.id = session_id
      and s.status in ('live', 'scheduled')
  )
);
