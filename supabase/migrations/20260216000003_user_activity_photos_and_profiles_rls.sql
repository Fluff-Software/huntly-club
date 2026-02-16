-- Allow authenticated users to see approved (status = 1) photos from anyone for club feed.
CREATE POLICY "Authenticated can view approved activity photos"
  ON "public"."user_activity_photos"
  FOR SELECT
  TO authenticated
  USING (status = 1);

-- Expose only id and nickname for display (e.g. club feed). SECURITY DEFINER bypasses
-- profiles RLS so authenticated users can read other users’ nicknames, not other columns.
CREATE OR REPLACE FUNCTION "public"."profile_public_info"()
RETURNS TABLE (id bigint, nickname text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id, nickname FROM profiles;
$$;

CREATE VIEW "public"."profile_public" WITH (security_invoker = false) AS
  SELECT * FROM "public"."profile_public_info"();

GRANT SELECT ON "public"."profile_public" TO authenticated;
GRANT SELECT ON "public"."profile_public" TO service_role;
