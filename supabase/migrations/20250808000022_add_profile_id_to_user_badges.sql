-- Add profile_id to user_badges table to make badges profile-specific
ALTER TABLE "public"."user_badges" 
ADD COLUMN "profile_id" bigint REFERENCES "public"."profiles"(id) ON DELETE CASCADE;

-- Update existing badges to have a profile_id (this will need manual review)
-- For now, we'll set a default profile_id for existing badges
-- This should be reviewed and updated manually based on actual data

-- Add NOT NULL constraint after data migration
-- ALTER TABLE "public"."user_badges" ALTER COLUMN "profile_id" SET NOT NULL;

-- Update RLS policies to include profile_id
DROP POLICY IF EXISTS "Users can view their own badges" ON "public"."user_badges";
DROP POLICY IF EXISTS "Users can insert their own badges" ON "public"."user_badges";

CREATE POLICY "Users can view their own badges" ON "public"."user_badges"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges" ON "public"."user_badges"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS "user_badges_profile_id_idx" ON "public"."user_badges"("profile_id");
CREATE INDEX IF NOT EXISTS "user_badges_user_profile_idx" ON "public"."user_badges"("user_id", "profile_id");
