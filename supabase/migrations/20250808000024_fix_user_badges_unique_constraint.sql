-- Fix the unique constraint on user_badges to be profile-specific
-- Drop the old constraint and create a new one that includes profile_id

-- First, drop the existing unique constraint (if it exists)
ALTER TABLE "public"."user_badges" 
DROP CONSTRAINT IF EXISTS "user_badges_unique";

-- Create a new unique constraint that includes profile_id
ALTER TABLE "public"."user_badges" 
ADD CONSTRAINT "user_badges_user_profile_badge_unique" 
UNIQUE (user_id, profile_id, badge_id);
