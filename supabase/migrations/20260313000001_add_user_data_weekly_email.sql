-- Add weekly_email preference to user_data (TRUE = receive weekly email, FALSE = opt out).
alter table "public"."user_data"
  add column "weekly_email" boolean not null default true;

-- New signups get weekly_email = true via default; update trigger for clarity.
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
