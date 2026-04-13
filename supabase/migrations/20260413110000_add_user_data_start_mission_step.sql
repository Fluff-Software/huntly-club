-- Persist mission-first onboarding progress in user_data.
alter table "public"."user_data"
  add column if not exists "start_mission_step" integer not null default 0;

-- Ensure signup trigger initializes the onboarding step for every new user.
create or replace function public.handle_new_user_user_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_data (user_id, team, weekly_email, start_mission_step)
  values (new.id, null, false, 0);
  return new;
end;
$$;
