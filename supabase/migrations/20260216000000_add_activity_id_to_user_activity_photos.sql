-- Add activity_id to user_activity_photos (activity being completed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_activity_photos' AND column_name = 'activity_id'
  ) THEN
    ALTER TABLE "public"."user_activity_photos"
    ADD COLUMN "activity_id" bigint REFERENCES "public"."activities" ("id") ON DELETE CASCADE;
    CREATE INDEX "user_activity_photos_activity_id_idx" ON "public"."user_activity_photos" ("activity_id");
  END IF;
END $$;
