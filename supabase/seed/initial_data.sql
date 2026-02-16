-- Seed dummy data for packs, activities, pack_activities, seasons, chapters, chapter_activities.
-- Does not touch: teams (3 already from migrations), profiles, badges, admins, user_activity_progress, activity_reactions, user_badges.

-- Truncate in dependency order (do not truncate teams)
TRUNCATE chapter_activities, chapters, pack_activities, seasons, activities, packs RESTART IDENTITY;

-- 1. Packs
INSERT INTO public.packs (name, colour) VALUES
  ('Beginner Adventure', '#4CAF50'),
  ('Nature Explorer', '#2196F3'),
  ('Creative Outdoors', '#FF9800');

-- 2. Activities
INSERT INTO public.activities (name, title, description, image, xp, long_description, hints, tips, trivia, photo_required, categories) VALUES
  ('bird_spotting', 'Bird Spotting', 'Find and identify birds in your local area.', 'https://via.placeholder.com/150/4CAF50/FFFFFF?text=Birds', 15, 'Spend time outdoors watching for birds. Note their colours, size and behaviour.', 'Look for movement in trees. Listen for songs.', 'Stay quiet and move slowly.', 'There are over 10,000 bird species worldwide.', true, '["nature", "wildlife", "observation"]'::jsonb),
  ('nature_photography', 'Nature Photography', 'Capture the beauty of nature through your lens.', 'https://via.placeholder.com/150/2196F3/FFFFFF?text=Photo', 25, 'Take photos of plants, landscapes or wildlife. Focus on light and composition.', 'Early morning and late afternoon light work best.', 'Try different angles and get close to small subjects.', 'The first photograph took 8 hours to expose in 1826.', true, '["nature", "photography", "creativity"]'::jsonb),
  ('outdoor_exploration', 'Outdoor Exploration', 'Explore a local park or trail and notice what you find.', 'https://via.placeholder.com/150/FF9800/FFFFFF?text=Explore', 20, 'Walk slowly and use your senses. What do you see, hear and smell?', 'Find a comfortable spot to sit or walk slowly.', 'Leave your phone in your pocket for the first 10 minutes.', 'Time in nature can reduce stress and boost creativity.', false, '["nature", "outdoor", "exploration"]'::jsonb),
  ('leaf_collecting', 'Leaf Collecting', 'Collect and identify different leaves.', 'https://via.placeholder.com/150/8BC34A/FFFFFF?text=Leaves', 10, 'Gather leaves from different trees and compare their shapes and colours.', 'Look for variety in shape, size and colour.', 'Press leaves in a book to preserve them.', 'Leaves change colour when chlorophyll breaks down in autumn.', false, '["nature", "observation"]'::jsonb),
  ('cloud_watching', 'Cloud Watching', 'Spend time watching clouds and naming their shapes.', 'https://via.placeholder.com/150/03A9F4/FFFFFF?text=Clouds', 10, 'Lie back and watch the sky. What shapes or animals do you see?', 'Pick a clear or partly cloudy day.', 'Try to spot cumulus, stratus or cirrus clouds.', 'Clouds are made of tiny water droplets or ice crystals.', false, '["nature", "observation", "outdoor"]'::jsonb);

-- 3. Pack–activity links (pack_id and activity_id from identities 1..3 and 1..5)
INSERT INTO public.pack_activities (pack_id, activity_id, "order") VALUES
  (1, 1, 1),
  (1, 2, 2),
  (1, 3, 3),
  (2, 1, 1),
  (2, 3, 2),
  (2, 4, 3),
  (3, 2, 1),
  (3, 4, 2),
  (3, 5, 3);

-- 4. One season
INSERT INTO public.seasons (name, hero_image, story, story_parts, story_slides) VALUES
  (
    'Spring 2025',
    'https://via.placeholder.com/800x400/4CAF50/FFFFFF?text=Spring+2025',
    'A season of growth and discovery. Get outside and explore your local nature.',
    ARRAY[
      'With the wind came a strong sense of urgency.',
      'The explorers went forth to explore.',
      'Through the whispering trees they found a hidden path.',
      'Something magical was waiting just ahead.',
      'And so the adventure began.'
    ],
    '[
      {"type":"text","value":"With the wind came a strong sense of urgency."},
      {"type":"text","value":"The explorers went forth to explore."},
      {"type":"text","value":"Through the whispering trees they found a hidden path."},
      {"type":"text","value":"Something magical was waiting just ahead."},
      {"type":"text","value":"And so the adventure began."}
    ]'::jsonb
  );

-- 5. Chapters for that season (unlock_date in the past so they appear unlocked)
INSERT INTO public.chapters (season_id, week_number, title, image, body, body_parts, body_slides, unlock_date) VALUES
  (1, 1, 'Welcome to the season', NULL, 'Start your journey with a few simple activities.', ARRAY['Start your journey with a few simple activities.'], '[{"type":"text","value":"Start your journey with a few simple activities."}]'::jsonb, '2025-01-01'),
  (1, 2, 'Getting outdoors', NULL, 'Try bird spotting or a short exploration walk.', ARRAY['Try bird spotting or a short exploration walk.'], '[{"type":"text","value":"Try bird spotting or a short exploration walk."}]'::jsonb, '2025-01-08'),
  (1, 3, 'Capture and collect', NULL, 'Use your camera or collect leaves and notice details.', ARRAY['Use your camera or collect leaves and notice details.'], '[{"type":"text","value":"Use your camera or collect leaves and notice details."}]'::jsonb, '2025-01-15'),
  (1, 4, 'Sky and clouds', NULL, 'Spend some time cloud watching and relaxing outside.', ARRAY['Spend some time cloud watching and relaxing outside.'], '[{"type":"text","value":"Spend some time cloud watching and relaxing outside."}]'::jsonb, '2025-01-22');

-- 6. Chapter–activity links
INSERT INTO public.chapter_activities (chapter_id, activity_id, "order") VALUES
  (1, 1, 1),
  (1, 3, 2),
  (2, 1, 1),
  (2, 3, 2),
  (3, 2, 1),
  (3, 4, 2),
  (4, 5, 1),
  (4, 3, 2);
