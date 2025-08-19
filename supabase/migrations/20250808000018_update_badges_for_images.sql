-- Update badges table to better support image URLs
-- This allows badges to use either emojis or custom images

-- Add a field to track if the badge uses a custom image
ALTER TABLE "public"."badges" 
ADD COLUMN "uses_custom_image" boolean NOT NULL DEFAULT false;

-- Add a field for local image path (for development/testing)
ALTER TABLE "public"."badges" 
ADD COLUMN "local_image_path" text;

-- Update existing badges to use emojis (not custom images)
UPDATE "public"."badges" 
SET uses_custom_image = false 
WHERE uses_custom_image IS NULL;

-- Add comment to clarify the image_url field usage
COMMENT ON COLUMN "public"."badges"."image_url" IS 'Either an emoji string or a storage URL for custom badge images';
COMMENT ON COLUMN "public"."badges"."uses_custom_image" IS 'True if badge uses a custom image from storage, false if using emoji';
COMMENT ON COLUMN "public"."badges"."local_image_path" IS 'Local path for development/testing badge images';
