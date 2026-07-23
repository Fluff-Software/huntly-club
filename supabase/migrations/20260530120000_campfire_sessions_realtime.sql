-- Postgres Changes: notify wait-screen clients when a scheduled session goes live.
-- @see https://supabase.com/docs/guides/realtime/postgres-changes

alter table public.campfire_sessions replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'campfire_sessions'
  ) then
    alter publication supabase_realtime add table public.campfire_sessions;
  end if;
end $$;
