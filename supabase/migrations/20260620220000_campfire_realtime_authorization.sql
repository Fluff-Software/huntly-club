-- Step 3: Realtime authorization for campfire interactions
--
-- Uses RLS policies on realtime.messages (Supabase docs: Realtime Authorization)
-- to restrict Broadcast access to live campfire topics.

-- Ensure RLS is enforced on realtime.messages.
alter table realtime.messages enable row level security;

-- Helper: authorize realtime topic access for campfire sessions.
-- Topic format: campfire:{sessionId}
create or replace function public.can_access_campfire_topic(topic text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- Must be authenticated
    auth.uid() is not null
    and split_part(topic, ':', 1) = 'campfire'
    and exists (
      select 1
      from public.campfire_sessions s
      where s.id = nullif(split_part(topic, ':', 2), '')::bigint
        and s.status = 'live'
    );
$$;

grant execute on function public.can_access_campfire_topic(text) to authenticated, service_role;

-- Read broadcast messages for authorized campfire topics.
drop policy if exists "Campfire realtime broadcast read" on realtime.messages;
create policy "Campfire realtime broadcast read"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and public.can_access_campfire_topic(realtime.topic())
);

-- Send broadcast messages for authorized campfire topics.
drop policy if exists "Campfire realtime broadcast write" on realtime.messages;
create policy "Campfire realtime broadcast write"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and public.can_access_campfire_topic(realtime.topic())
);

