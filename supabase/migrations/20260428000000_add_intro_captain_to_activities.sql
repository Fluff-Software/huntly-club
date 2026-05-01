-- Add captain selection fields to activities for the new human character intro screen.
ALTER TABLE "public"."activities"
  ADD COLUMN IF NOT EXISTS "intro_captain" text,
  ADD COLUMN IF NOT EXISTS "intro_captain_pose" text;
