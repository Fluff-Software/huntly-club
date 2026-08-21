-- Add general_email preference to user_data: separate from weekly_email
-- (weekly mission/chapter announcements). general_email gates admin
-- broadcast emails sent via send-admin-email, so users can opt out of one
-- without losing the other. TRUE = receive general emails, FALSE = opt out.
alter table "public"."user_data"
  add column "general_email" boolean not null default true;

-- New signups get general_email = true via default; update trigger for clarity.
create or replace function public.handle_new_user_user_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_data (user_id, team, weekly_email, general_email)
  values (new.id, null, true, true);
  return new;
end;
$$;

-- Column-level grants replaced the old blanket grant (see
-- 20260702210000_add_subscription_exempt_to_user_data.sql); a new column
-- needs its own explicit grant or updates silently fail with "permission
-- denied for table user_data" (see 20260713120000_grant_update_first_mission_activity_id.sql).
grant update ("general_email") on table "public"."user_data" to "authenticated";
