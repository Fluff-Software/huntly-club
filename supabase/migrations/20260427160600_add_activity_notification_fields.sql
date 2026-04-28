-- Add notification copy fields to activities (missions).
-- Content only (no scheduling/sending logic).

ALTER TABLE "public"."activities"
  ADD COLUMN IF NOT EXISTS "prep_notif_title" text,
  ADD COLUMN IF NOT EXISTS "prep_notif_description" text,
  ADD COLUMN IF NOT EXISTS "remind_notif_title" text,
  ADD COLUMN IF NOT EXISTS "remind_notif_description" text;

