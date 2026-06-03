alter table "public"."user_data"
  add column if not exists "first_mission_activity_id" bigint null;
