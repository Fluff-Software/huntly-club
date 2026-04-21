-- Track which season announcement a user has already seen.
alter table "public"."user_data"
  add column if not exists "last_seen_season_id" bigint;

-- Optional FK to seasons; null means user has not seen any season announcement yet.
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint c
    inner join pg_catalog.pg_class rel on rel.oid = c.conrelid
    inner join pg_catalog.pg_namespace nsp on nsp.oid = rel.relnamespace
    where c.conname = 'user_data_last_seen_season_id_fkey'
      and nsp.nspname = 'public'
      and rel.relname = 'user_data'
  ) then
    alter table "public"."user_data"
      add constraint "user_data_last_seen_season_id_fkey"
      foreign key ("last_seen_season_id")
      references "public"."seasons"("id")
      on delete set null
      not valid;
  end if;
end $$;

alter table "public"."user_data"
  validate constraint "user_data_last_seen_season_id_fkey";
