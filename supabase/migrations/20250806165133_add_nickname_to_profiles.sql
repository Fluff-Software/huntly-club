-- Add nickname column to profiles table
ALTER TABLE "public"."profiles" ADD COLUMN "nickname" text;

-- Set default nicknames for existing profiles (optional)
UPDATE "public"."profiles" SET "nickname" = 'Curious Monkey' WHERE "nickname" IS NULL;