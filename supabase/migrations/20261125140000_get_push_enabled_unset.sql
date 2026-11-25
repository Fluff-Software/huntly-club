-- Notifications are on by default (see apps/mobile/services/pushAutoEnable.ts).
-- The app needs to tell "never set on this device" apart from "turned off by the family",
-- so get_push_enabled now returns null when the device has no row (it used to return false).
-- Older app versions treat anything other than true as off, so they behave exactly as before.
create or replace function public.get_push_enabled(p_device_id text)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select enabled from push_tokens where device_id = p_device_id limit 1;
$$;
