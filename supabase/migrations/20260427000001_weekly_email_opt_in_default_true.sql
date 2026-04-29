-- Make weekly email opt-in for new users (default true).
alter table "public"."user_data"
  alter column "weekly_email" set default true;

-- Ensure signup trigger creates user_data with weekly_email enabled.
create or replace function public.handle_new_user_user_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_data (user_id, team, weekly_email)
  values (new.id, null, true);
  return new;
end;
$$;

