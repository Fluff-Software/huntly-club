-- Extend profile_public_info to expose team_name alongside id and nickname.
-- Must drop view first (it depends on the function), then drop+recreate the function.
DROP VIEW IF EXISTS "public"."profile_public";
DROP FUNCTION IF EXISTS "public"."profile_public_info"();

-- SECURITY DEFINER bypasses RLS so authenticated users can read other profiles' team.
CREATE FUNCTION "public"."profile_public_info"()
RETURNS TABLE (id bigint, nickname text, team_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.nickname, t.name AS team_name
  FROM profiles p
  LEFT JOIN user_data ud ON ud.user_id = p.user_id
  LEFT JOIN teams t ON t.id = ud.team;
$$;

-- Recreate the view to pick up the new column.
CREATE OR REPLACE VIEW "public"."profile_public" WITH (security_invoker = false) AS
  SELECT * FROM "public"."profile_public_info"();

GRANT SELECT ON "public"."profile_public" TO authenticated;
GRANT SELECT ON "public"."profile_public" TO service_role;
