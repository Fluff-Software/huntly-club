-- Clean up old badges that were awarded to user accounts instead of profiles
-- Since we can't determine which profile should have earned them, we'll remove them
-- New badges will be awarded correctly to specific profiles

DELETE FROM "public"."user_badges" 
WHERE "profile_id" IS NULL;

-- Now we can make profile_id NOT NULL
ALTER TABLE "public"."user_badges" ALTER COLUMN "profile_id" SET NOT NULL;
