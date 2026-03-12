-- Remove team column from profiles; team is now on user_data only.
-- 1. Update RLS policies that reference profiles.team to use user_data.team instead.
-- 2. Drop FK and column.

-- user_activity_progress: "Users can view team activity progress" — use user_data.team
DROP POLICY IF EXISTS "Users can view team activity progress" ON "public"."user_activity_progress";

CREATE POLICY "Users can view team activity progress" ON "public"."user_activity_progress"
  FOR SELECT USING (
    profile_id IN (
      SELECT p.id
      FROM profiles p
      INNER JOIN user_data ud ON ud.user_id = p.user_id
      WHERE ud.team IS NOT NULL
        AND ud.team = (
          SELECT ud2.team
          FROM user_data ud2
          WHERE ud2.user_id = auth.uid()
            AND ud2.team IS NOT NULL
        )
    )
  );

-- activity_reactions: view/add reactions for same team via user_data.team
DROP POLICY IF EXISTS "Users can view reactions for team activities" ON "public"."activity_reactions";
DROP POLICY IF EXISTS "Users can add reactions to team activities" ON "public"."activity_reactions";

CREATE POLICY "Users can view reactions for team activities" ON "public"."activity_reactions"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM user_activity_progress uap
      JOIN profiles activity_profile ON uap.profile_id = activity_profile.id
      JOIN user_data activity_ud ON activity_ud.user_id = activity_profile.user_id
      JOIN profiles current_profile ON current_profile.id = activity_reactions.profile_id
      JOIN user_data current_ud ON current_ud.user_id = current_profile.user_id
      WHERE uap.id = activity_reactions.activity_progress_id
        AND activity_ud.team IS NOT NULL
        AND current_ud.team IS NOT NULL
        AND activity_ud.team = current_ud.team
    )
  );

CREATE POLICY "Users can add reactions to team activities" ON "public"."activity_reactions"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_activity_progress uap
      JOIN profiles activity_profile ON uap.profile_id = activity_profile.id
      JOIN user_data activity_ud ON activity_ud.user_id = activity_profile.user_id
      JOIN profiles current_profile ON current_profile.id = activity_reactions.profile_id
      JOIN user_data current_ud ON current_ud.user_id = current_profile.user_id
      WHERE uap.id = activity_reactions.activity_progress_id
        AND activity_ud.team IS NOT NULL
        AND current_ud.team IS NOT NULL
        AND activity_ud.team = current_ud.team
    )
  );

-- Drop FK and column from profiles
ALTER TABLE "public"."profiles" DROP CONSTRAINT IF EXISTS "profiles_team_fkey";
ALTER TABLE "public"."profiles" DROP COLUMN IF EXISTS "team";
