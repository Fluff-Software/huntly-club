-- Add status column to user_activity_photos if it doesn't exist
-- (for DBs that ran the create table migration before status was added)
-- status: 0 = for review, 1 = approved, 2 = rejected
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_activity_photos' AND column_name = 'status'
  ) THEN
    ALTER TABLE "public"."user_activity_photos"
    ADD COLUMN "status" integer NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2));
  END IF;
END $$;
