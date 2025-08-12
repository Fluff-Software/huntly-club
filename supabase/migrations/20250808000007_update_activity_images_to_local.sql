-- Update activities to use local image assets instead of placeholder URLs
UPDATE "public"."activities" 
SET image = 'bird-spotting'
WHERE name = 'bird_spotting';

UPDATE "public"."activities" 
SET image = 'nature-photography'
WHERE name = 'nature_photography';

UPDATE "public"."activities" 
SET image = 'outdoor-exploration'
WHERE name = 'outdoor_exploration';
