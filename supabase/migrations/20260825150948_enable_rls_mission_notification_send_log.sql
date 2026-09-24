-- Close linter finding "RLS Disabled in Public" for mission_notification_send_log.
-- Only service_role is granted access (see 20260821120000_mission_notification_send_log.sql),
-- and service_role bypasses RLS, so this has no behavioural effect on the two
-- Edge Functions that use this table (send-weekly-chapter-preparation,
-- send-weekly-chapter-reminder). It just closes off any future accidental grant
-- to anon/authenticated from being readable/writable without an explicit policy.

alter table public.mission_notification_send_log enable row level security;
