-- Add read policy for activities table
CREATE POLICY "Enable read access for all users"
ON "public"."activities"
AS PERMISSIVE
FOR SELECT
TO public
USING (true);
