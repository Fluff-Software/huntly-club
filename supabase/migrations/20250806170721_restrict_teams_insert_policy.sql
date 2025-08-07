-- Remove the permissive insert policy for teams and replace with a more restrictive one
-- This prevents regular users from inserting teams, only allowing service role
DROP POLICY IF EXISTS "Enable insert access for all users" ON "public"."teams";

-- Create a more restrictive policy that only allows service role to insert
-- This is better for security as teams should be managed by admins, not regular users
CREATE POLICY "Enable insert access for service role only"
ON "public"."teams"
AS PERMISSIVE
FOR INSERT
TO service_role
WITH CHECK (true);