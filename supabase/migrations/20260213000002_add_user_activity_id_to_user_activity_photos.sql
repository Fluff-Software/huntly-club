-- Add user_activity_id to user_activity_photos (for DBs that ran create table before this column existed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_activity_photos' AND column_name = 'user_activity_id'
  ) THEN
    ALTER TABLE "public"."user_activity_photos"
    ADD COLUMN "user_activity_id" bigint REFERENCES "public"."user_activity_progress" ("id") ON DELETE CASCADE;
    CREATE INDEX "user_activity_photos_user_activity_id_idx" ON "public"."user_activity_photos" ("user_activity_id");
    -- Optional: set NOT NULL after backfilling existing rows:
    -- UPDATE user_activity_photos SET user_activity_id = ... WHERE user_activity_id IS NULL;
    -- ALTER TABLE "public"."user_activity_photos" ALTER COLUMN "user_activity_id" SET NOT NULL;
  END IF;
END $$;
