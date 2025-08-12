-- Allow users to view activity progress from other team members
-- This enables the team activity log feature

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own activity progress" ON "public"."user_activity_progress";

-- Create a new policy that allows viewing activity progress from the same team
CREATE POLICY "Users can view team activity progress" ON "public"."user_activity_progress"
    FOR SELECT USING (
        profile_id IN (
            SELECT p.id 
            FROM profiles p 
            WHERE p.team IN (
                SELECT p2.team 
                FROM profiles p2 
                WHERE p2.user_id = auth.uid()
            )
        )
    );
