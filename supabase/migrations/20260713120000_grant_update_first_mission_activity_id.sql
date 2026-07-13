-- 20260702210000 replaced the blanket UPDATE grant on user_data with an explicit
-- column list, but omitted first_mission_activity_id (added in 20260621120000).
-- That leaves the "authenticated" role unable to write it, causing
-- "permission denied for table user_data" when the app tries to pin a new
-- player's first mission target.
grant update ("first_mission_activity_id")
  on table "public"."user_data" to "authenticated";
