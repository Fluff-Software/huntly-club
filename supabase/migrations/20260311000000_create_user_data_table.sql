-- Create user_data table (user_id + team; no rows seeded)
create table "public"."user_data" (
  "user_id" uuid not null,
  "team" bigint not null
);

alter table "public"."user_data" enable row level security;

alter table "public"."user_data" add constraint "user_data_pkey" primary key ("user_id");
alter table "public"."user_data" add constraint "user_data_user_id_fkey" foreign key ("user_id") references auth.users("id") on delete cascade not valid;
alter table "public"."user_data" add constraint "user_data_team_fkey" foreign key ("team") references "public"."teams"("id") on delete restrict not valid;
alter table "public"."user_data" validate constraint "user_data_user_id_fkey";
alter table "public"."user_data" validate constraint "user_data_team_fkey";

create policy "Users can read own user_data"
  on "public"."user_data"
  as permissive
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own user_data"
  on "public"."user_data"
  as permissive
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own user_data"
  on "public"."user_data"
  as permissive
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table "public"."user_data" to "authenticated";
grant all on table "public"."user_data" to "service_role";

create index "user_data_team_idx" on "public"."user_data" ("team");
