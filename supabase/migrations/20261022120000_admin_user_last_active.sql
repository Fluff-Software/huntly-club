-- Last time a user's app session was active, for the admin app.
-- Supabase refreshes the access token while the app is in use, which bumps
-- auth.sessions.refreshed_at; last_sign_in_at only changes on a fresh login.
-- Browser sessions (the admin app itself) are excluded so admin logins don't count.
create or replace function public.admin_user_last_active(p_user_ids uuid[])
returns table (user_id uuid, last_active_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select s.user_id,
         max(greatest(s.refreshed_at, s.updated_at, s.created_at)) as last_active_at
  from auth.sessions s
  where s.user_id = any(p_user_ids)
    and coalesce(s.user_agent, '') not ilike 'mozilla%'
  group by s.user_id;
$$;

revoke all on function public.admin_user_last_active(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_user_last_active(uuid[]) to service_role;
