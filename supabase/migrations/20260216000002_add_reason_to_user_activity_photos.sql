-- Add reason column for denial (and optional notes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_activity_photos' AND column_name = 'reason'
  ) THEN
    ALTER TABLE "public"."user_activity_photos"
    ADD COLUMN "reason" text;
  END IF;
END $$;
