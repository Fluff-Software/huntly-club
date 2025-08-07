-- Update activities table to include title, description, image, and xp fields
ALTER TABLE "public"."activities" 
ADD COLUMN "title" text,
ADD COLUMN "description" text,
ADD COLUMN "image" text,
ADD COLUMN "xp" integer DEFAULT 0;

-- Update existing activities to have default values
UPDATE "public"."activities" 
SET 
  title = name,
  description = 'Complete this activity to earn XP!',
  image = 'https://via.placeholder.com/150',
  xp = 10
WHERE title IS NULL;

-- Make title required
ALTER TABLE "public"."activities" ALTER COLUMN "title" SET NOT NULL;
