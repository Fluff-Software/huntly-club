-- Link push devices to users so admins can target a push at specific users or at
-- users who haven't been active in the app for a while.
--
-- push_tokens stays device-based (one row per device_id). user_id records which
-- account last turned push on (or refreshed its token) on that device.

alter table public.push_tokens
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

-- Backfill: the old sign-in opt-in flow saved the token and then immediately wrote
-- notification_prompt_asked for the signed-in user (about 2s apart in practice).
-- Link only rows with exactly one such match within 5 seconds.
with matches as (
  select t.id as token_id, a.user_id,
         count(*) over (partition by t.id) as candidates
  from public.push_tokens t
  join public.notification_prompt_asked a
    on abs(extract(epoch from (a.asked_at - t.created_at))) < 5
  where t.user_id is null
)
update public.push_tokens t
set user_id = m.user_id
from matches m
where m.token_id = t.id
  and m.candidates = 1;

-- Same signature and behaviour as before, plus: record the calling user.
-- Existing app versions call this unchanged, so the link fills in as devices refresh.
create or replace function public.set_push_enabled(p_device_id text, p_enabled boolean, p_expo_push_token text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_enabled then
    if p_expo_push_token is null or p_expo_push_token = '' then
      raise exception 'expo_push_token is required when enabling push';
    end if;
    insert into push_tokens (device_id, expo_push_token, enabled, updated_at, user_id)
    values (p_device_id, p_expo_push_token, true, now(), auth.uid())
    on conflict (device_id) do update set
      expo_push_token = excluded.expo_push_token,
      enabled = true,
      updated_at = excluded.updated_at,
      user_id = coalesce(excluded.user_id, push_tokens.user_id);
  else
    update push_tokens
    set enabled = false, updated_at = now()
    where device_id = p_device_id;
  end if;
end;
$$;

-- Last time a user was active in the app: latest non-browser session refresh
-- (same rule as admin_user_last_active), falling back to last sign-in, then sign-up.
create or replace function public.admin_user_last_active_at(p_user_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select max(greatest(s.refreshed_at, s.updated_at, s.created_at))
       from auth.sessions s
      where s.user_id = p_user_id
        and coalesce(s.user_agent, '') not ilike 'mozilla%'),
    (select u.last_sign_in_at from auth.users u where u.id = p_user_id),
    (select u.created_at from auth.users u where u.id = p_user_id)
  );
$$;

-- Distinct enabled push tokens for an admin broadcast audience.
--   'all'      every enabled device (including devices not yet linked to a user)
--   'users'    devices linked to p_user_ids
--   'inactive' devices whose user hasn't been active for at least p_inactive_days
create or replace function public.admin_push_audience(
  p_audience text,
  p_inactive_days integer default null,
  p_user_ids uuid[] default null
)
returns table (expo_push_token text, user_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_audience = 'all' then
    return query
      select distinct on (t.expo_push_token) t.expo_push_token, t.user_id
      from public.push_tokens t
      where t.enabled;
  elsif p_audience = 'users' then
    return query
      select distinct on (t.expo_push_token) t.expo_push_token, t.user_id
      from public.push_tokens t
      where t.enabled
        and t.user_id = any (coalesce(p_user_ids, '{}'::uuid[]));
  elsif p_audience = 'inactive' then
    if p_inactive_days is null or p_inactive_days < 1 then
      raise exception 'p_inactive_days must be at least 1';
    end if;
    return query
      select distinct on (t.expo_push_token) t.expo_push_token, t.user_id
      from public.push_tokens t
      where t.enabled
        and t.user_id is not null
        and public.admin_user_last_active_at(t.user_id) < now() - make_interval(days => p_inactive_days);
  else
    raise exception 'Unknown audience: %', p_audience;
  end if;
end;
$$;

-- Admin user picker: users matching an email search, with their push status.
create or replace function public.admin_push_user_search(p_query text)
returns table (user_id uuid, email text, push_devices integer, last_active_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id,
         u.email::text,
         (select count(distinct t.expo_push_token)::integer
            from public.push_tokens t
           where t.user_id = u.id and t.enabled),
         public.admin_user_last_active_at(u.id)
  from auth.users u
  where u.email ilike '%' || replace(replace(replace(coalesce(p_query, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  order by u.email
  limit 20;
$$;

revoke all on function public.admin_user_last_active_at(uuid) from public, anon, authenticated;
revoke all on function public.admin_push_audience(text, integer, uuid[]) from public, anon, authenticated;
revoke all on function public.admin_push_user_search(text) from public, anon, authenticated;
grant execute on function public.admin_user_last_active_at(uuid) to service_role;
grant execute on function public.admin_push_audience(text, integer, uuid[]) to service_role;
grant execute on function public.admin_push_user_search(text) to service_role;
