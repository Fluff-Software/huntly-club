-- Update activities to use Supabase Storage URLs
UPDATE "public"."activities" 
SET image = 'http://127.0.0.1:54321/storage/v1/object/public/activity-images/bird-spotting.png'
WHERE name = 'bird_spotting';

UPDATE "public"."activities" 
SET image = 'http://127.0.0.1:54321/storage/v1/object/public/activity-images/nature-photography.png'
WHERE name = 'nature_photography';

UPDATE "public"."activities" 
SET image = 'http://127.0.0.1:54321/storage/v1/object/public/activity-images/outdoor-exploration.png'
WHERE name = 'outdoor_exploration';
