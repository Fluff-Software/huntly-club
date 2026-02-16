-- Add uploaded_at to user_activity_photos (when the photo was uploaded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_activity_photos' AND column_name = 'uploaded_at'
  ) THEN
    ALTER TABLE "public"."user_activity_photos"
    ADD COLUMN "uploaded_at" timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;
