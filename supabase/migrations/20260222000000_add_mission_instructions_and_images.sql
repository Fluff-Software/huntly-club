-- Add mission page content: instructions (steps), alternative approaches, extra images
ALTER TABLE "public"."activities"
  ADD COLUMN IF NOT EXISTS "instructions" text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "alternative_approaches" text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "images" text[] DEFAULT '{}';

COMMENT ON COLUMN "public"."activities"."instructions" IS 'Ordered list of instruction steps for the mission page';
COMMENT ON COLUMN "public"."activities"."alternative_approaches" IS 'Alternative ways to complete the activity';
COMMENT ON COLUMN "public"."activities"."images" IS 'Extra image URLs to display throughout the mission page';
