ALTER TABLE "public"."activities"
  DROP COLUMN IF EXISTS "long_description",
  DROP COLUMN IF EXISTS "hints",
  DROP COLUMN IF EXISTS "tips",
  DROP COLUMN IF EXISTS "trivia",
  DROP COLUMN IF EXISTS "instructions",
  DROP COLUMN IF EXISTS "alternative_approaches",
  DROP COLUMN IF EXISTS "images",
  DROP COLUMN IF EXISTS "photo_required";
