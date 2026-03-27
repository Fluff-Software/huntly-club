-- Track which season announcement a user has already seen.
alter table "public"."user_data"
  add column if not exists "last_seen_season_id" bigint;

-- Optional FK to seasons; null means user has not seen any season announcement yet.
alter table "public"."user_data"
  add constraint "user_data_last_seen_season_id_fkey"
  foreign key ("last_seen_season_id")
  references "public"."seasons"("id")
  on delete set null
  not valid;

alter table "public"."user_data"
  validate constraint "user_data_last_seen_season_id_fkey";
