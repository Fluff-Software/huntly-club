-- Insert sample activities
INSERT INTO "public"."activities" (name, title, description, image, xp) VALUES
  ('button_press', 'Button Press Challenge', 'Press the button 5 times to complete this activity!', 'https://via.placeholder.com/150/4CAF50/FFFFFF?text=Button', 15),
  ('math_quiz', 'Quick Math Quiz', 'Solve this simple math problem: What is 7 + 8?', 'https://via.placeholder.com/150/2196F3/FFFFFF?text=Math', 25),
  ('color_match', 'Color Matching', 'Match the colors by tapping the correct sequence!', 'https://via.placeholder.com/150/FF9800/FFFFFF?text=Colors', 20);

-- Insert a sample pack
INSERT INTO "public"."packs" (name, colour) VALUES
  ('Beginner Adventure', '#4CAF50');

-- Link activities to the pack (get the pack_id and activity_ids)
INSERT INTO "public"."pack_activities" (pack_id, activity_id, "order")
SELECT 
  p.id as pack_id,
  a.id as activity_id,
  CASE 
    WHEN a.name = 'button_press' THEN 1
    WHEN a.name = 'math_quiz' THEN 2
    WHEN a.name = 'color_match' THEN 3
  END as "order"
FROM "public"."packs" p
CROSS JOIN "public"."activities" a
WHERE p.name = 'Beginner Adventure'
AND a.name IN ('button_press', 'math_quiz', 'color_match');
