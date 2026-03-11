-- Allow NULL on user_data.team
alter table "public"."user_data" alter column "team" drop not null;
