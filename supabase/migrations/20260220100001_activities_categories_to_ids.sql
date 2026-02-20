-- Seed default categories (names only; icons can be set in admin)
INSERT INTO "public"."categories" ("name", "icon")
VALUES
  ('Nature', NULL),
  ('Photography', NULL),
  ('Outdoor', NULL),
  ('Wildlife', NULL),
  ('Exploration', NULL),
  ('Creativity', NULL),
  ('Observation', NULL);

-- Migrate activities.categories from array of names (strings) to array of category ids (integers).
-- Only touch rows that still have string elements.
UPDATE "public"."activities" a
SET categories = (
  SELECT COALESCE(
    (
      SELECT jsonb_agg(c.id ORDER BY c.id)
      FROM jsonb_array_elements_text(a.categories) AS elem(text)
      JOIN "public"."categories" c ON LOWER(TRIM(c.name)) = LOWER(TRIM(elem))
    ),
    '[]'::jsonb
  )
)
WHERE jsonb_typeof(a.categories) = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(a.categories) AS e
    WHERE jsonb_typeof(e) = 'string'
  );

COMMENT ON COLUMN "public"."activities"."categories" IS 'Array of category ids (references public.categories.id).';
