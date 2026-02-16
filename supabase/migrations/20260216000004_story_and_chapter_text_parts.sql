ALTER TABLE "public"."seasons"
  ADD COLUMN IF NOT EXISTS "story_parts" text[] NOT NULL DEFAULT '{}';

ALTER TABLE "public"."chapters"
  ADD COLUMN IF NOT EXISTS "body_parts" text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN "public"."seasons"."story_parts" IS 'Ordered array of text segments for the season story (one per slide).';
COMMENT ON COLUMN "public"."chapters"."body_parts" IS 'Ordered array of text segments for the chapter body (one per slide).';
