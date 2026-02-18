-- Allow authenticated users to read all user_achievements (for team leaderboard and totals)
DROP POLICY IF EXISTS "Users can view own profile achievements" ON "public"."user_achievements";

CREATE POLICY "Authenticated can view all achievements" ON "public"."user_achievements"
    FOR SELECT
    TO authenticated
    USING (true);
