-- Create user_data row for every new auth user (team left null).
create or replace function public.handle_new_user_user_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_data (user_id, team)
  values (new.id, null);
  return new;
end;
$$;

create trigger on_auth_user_created_user_data
  after insert on auth.users
  for each row
  execute function public.handle_new_user_user_data();
