-- Update activities to be more nature-focused and engaging
UPDATE "public"."activities" 
SET 
  name = 'bird_spotting',
  title = 'Bird Spotting Challenge',
  description = 'Spot and identify 3 different bird species in your local area. Look for common birds like sparrows, robins, or pigeons. Take photos or make notes of what you see!',
  image = 'https://via.placeholder.com/150/4CAF50/FFFFFF?text=🐦',
  xp = 30
WHERE name = 'button_press';

UPDATE "public"."activities" 
SET 
  name = 'nature_photography',
  title = 'Nature Photography',
  description = 'Take 5 photos of different natural elements: flowers, trees, clouds, water, or wildlife. Get creative and capture the beauty around you!',
  image = 'https://via.placeholder.com/150/2196F3/FFFFFF?text=📸',
  xp = 40
WHERE name = 'math_quiz';

UPDATE "public"."activities" 
SET 
  name = 'outdoor_exploration',
  title = 'Outdoor Exploration',
  description = 'Visit a local park, trail, or natural area. Spend at least 30 minutes exploring and observing your surroundings. What sounds do you hear? What do you smell?',
  image = 'https://via.placeholder.com/150/FF9800/FFFFFF?text=🌲',
  xp = 35
WHERE name = 'color_match';

-- Update the pack_activities order to match the new activity names
UPDATE "public"."pack_activities" 
SET "order" = CASE 
  WHEN activity_id = (SELECT id FROM "public"."activities" WHERE name = 'bird_spotting') THEN 1
  WHEN activity_id = (SELECT id FROM "public"."activities" WHERE name = 'nature_photography') THEN 2
  WHEN activity_id = (SELECT id FROM "public"."activities" WHERE name = 'outdoor_exploration') THEN 3
END;
