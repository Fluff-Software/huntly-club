-- Add categories column to activities table
ALTER TABLE "public"."activities" 
ADD COLUMN "categories" jsonb DEFAULT '[]'::jsonb;

-- Create an index on the categories column for efficient querying
CREATE INDEX activities_categories_idx ON "public"."activities" USING GIN (categories);

-- Update existing activities with appropriate categories
UPDATE "public"."activities" 
SET categories = '["nature", "wildlife", "observation"]'::jsonb
WHERE name = 'bird_spotting';

UPDATE "public"."activities" 
SET categories = '["nature", "photography", "creativity"]'::jsonb
WHERE name = 'nature_photography';

UPDATE "public"."activities" 
SET categories = '["nature", "outdoor", "exploration"]'::jsonb
WHERE name = 'outdoor_exploration';

-- Add a comment to document the categories column
COMMENT ON COLUMN "public"."activities"."categories" IS 'Array of category tags for the activity (e.g., ["nature", "photography"])';
