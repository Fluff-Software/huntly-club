-- Make weekly email opt-in for new users.
alter table "public"."user_data"
  alter column "weekly_email" set default false;

-- Ensure signup trigger creates user_data with weekly_email disabled.
create or replace function public.handle_new_user_user_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_data (user_id, team, weekly_email)
  values (new.id, null, false);
  return new;
end;
$$;
