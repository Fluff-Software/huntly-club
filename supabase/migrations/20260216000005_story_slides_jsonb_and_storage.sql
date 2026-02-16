ALTER TABLE "public"."seasons"
  ADD COLUMN IF NOT EXISTS "story_slides" jsonb NOT NULL DEFAULT '[]';

ALTER TABLE "public"."chapters"
  ADD COLUMN IF NOT EXISTS "body_slides" jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN "public"."seasons"."story_slides" IS 'Ordered slides: array of { "type": "text"|"image", "value": string }. Image value is storage URL.';
COMMENT ON COLUMN "public"."chapters"."body_slides" IS 'Ordered slides: array of { "type": "text"|"image", "value": string }. Image value is storage URL.';

UPDATE "public"."seasons"
SET story_slides = (
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('type', 'text', 'value', elem)),
    '[]'::jsonb
  )
  FROM unnest(story_parts) AS elem
)
WHERE story_parts IS NOT NULL AND array_length(story_parts, 1) > 0;

UPDATE "public"."chapters"
SET body_slides = (
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('type', 'text', 'value', elem)),
    '[]'::jsonb
  )
  FROM unnest(body_parts) AS elem
)
WHERE body_parts IS NOT NULL AND array_length(body_parts, 1) > 0;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'story-slides',
  'story-slides',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read for story-slides"
  ON storage.objects FOR SELECT USING (bucket_id = 'story-slides');

CREATE POLICY "Service role can manage story-slides"
  ON storage.objects FOR ALL TO service_role USING (bucket_id = 'story-slides') WITH CHECK (bucket_id = 'story-slides');

CREATE POLICY "Authenticated upload for story-slides"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'story-slides' AND auth.role() = 'authenticated');
