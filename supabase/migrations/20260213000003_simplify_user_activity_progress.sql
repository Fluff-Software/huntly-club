-- Remove status, started_at, created_at, photo_url from user_activity_progress; set completed_at default now()

-- Drop index on status (drops automatically with column, but drop first to be explicit if needed)
DROP INDEX IF EXISTS "public"."user_activity_progress_status_idx";

ALTER TABLE "public"."user_activity_progress"
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "started_at",
  DROP COLUMN IF EXISTS "created_at",
  DROP COLUMN IF EXISTS "photo_url";

ALTER TABLE "public"."user_activity_progress"
  ALTER COLUMN "completed_at" SET DEFAULT now();
