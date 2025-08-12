-- Add optional fields to activities table
ALTER TABLE "public"."activities" 
ADD COLUMN "long_description" text,
ADD COLUMN "hints" text,
ADD COLUMN "tips" text,
ADD COLUMN "trivia" text,
ADD COLUMN "photo_required" boolean DEFAULT false;

-- Update existing activities with enhanced content
UPDATE "public"."activities" 
SET 
  long_description = 'Embark on a bird watching adventure! Find a quiet spot in your local park, garden, or even your backyard. Look for birds in trees, on the ground, or flying overhead. Common birds you might spot include sparrows, robins, pigeons, crows, and starlings. Take photos or write down what you observe - their colors, size, behavior, and any distinctive features. This activity helps you develop observation skills and learn about local wildlife.',
  hints = '• Look for movement in trees and bushes\n• Listen for bird songs and calls\n• Birds are most active in the morning and evening\n• Use binoculars if you have them\n• Check different habitats: trees, ground, water',
  tips = '• Stay quiet and move slowly to avoid scaring birds\n• Wear neutral colors to blend in\n• Bring a notebook to record your observations\n• Use a bird identification app or guide\n• Don''t get too close - respect their space',
  trivia = 'Did you know? There are over 10,000 bird species worldwide, and they are found on every continent except Antarctica. Birds are the only living descendants of dinosaurs!',
  photo_required = true
WHERE name = 'bird_spotting';

UPDATE "public"."activities" 
SET 
  long_description = 'Capture the beauty of nature through your lens! This activity encourages you to explore your surroundings and find interesting natural subjects to photograph. Look for patterns in nature, interesting textures, beautiful colors, and unique perspectives. You can photograph anything from a single flower petal to a vast landscape. Focus on composition, lighting, and capturing the essence of what makes each subject special.',
  hints = '• Look for interesting patterns and textures\n• Pay attention to lighting - early morning and late afternoon are best\n• Get close to small subjects for detail shots\n• Try different angles and perspectives\n• Include elements like water, clouds, or shadows',
  tips = '• Clean your camera lens before starting\n• Use natural light when possible\n• Don''t be afraid to get down low or climb up high\n• Take multiple shots of the same subject\n• Focus on what interests you most',
  trivia = 'Did you know? The first photograph was taken in 1826 by Joseph Nicéphore Niépce. It took 8 hours to expose! Today, we can take thousands of photos in seconds.',
  photo_required = true
WHERE name = 'nature_photography';

UPDATE "public"."activities" 
SET 
  long_description = 'Immerse yourself in the natural world around you! This activity is about slowing down and truly experiencing your outdoor environment. Find a local park, nature trail, beach, or even a quiet corner of your neighborhood. Take time to observe not just what you see, but what you hear, smell, and feel. This mindful approach to nature can be incredibly relaxing and helps you notice things you might normally miss.',
  hints = '• Find a comfortable spot to sit or walk slowly\n• Close your eyes and listen to natural sounds\n• Notice the temperature and breeze on your skin\n• Look for small details you might normally miss\n• Try to identify different types of plants and trees',
  tips = '• Leave your phone in your pocket for the first 10 minutes\n• Bring a journal to record your observations\n• Visit the same place at different times of day\n• Pay attention to seasonal changes\n• Respect wildlife and don''t disturb their habitat',
  trivia = 'Did you know? Spending time in nature has been scientifically proven to reduce stress, improve mood, and boost creativity. The Japanese practice of "forest bathing" (shinrin-yoku) is based on this concept.',
  photo_required = false
WHERE name = 'outdoor_exploration';
