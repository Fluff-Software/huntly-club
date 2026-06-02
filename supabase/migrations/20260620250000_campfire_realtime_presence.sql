-- Step 6: Presence (viewer count) for live campfires
--
-- Adds RLS policies for realtime.messages presence extension, scoped to live campfire topics.

-- Read presence messages for authorized campfire topics.
drop policy if exists "Campfire realtime presence read" on realtime.messages;
create policy "Campfire realtime presence read"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'presence'
  and public.can_access_campfire_topic(realtime.topic())
);

-- Send/track presence for authorized campfire topics.
drop policy if exists "Campfire realtime presence write" on realtime.messages;
create policy "Campfire realtime presence write"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'presence'
  and public.can_access_campfire_topic(realtime.topic())
);

