-- Add category-specific badges
-- These badges are awarded for completing activities in specific categories

-- Bird watching badge
INSERT INTO badges (name, description, image_url, category, requirement_value, requirement_type, requirement_category) 
VALUES (
  'Bird Watcher',
  'Complete 5 bird spotting activities',
  '🐦',
  'special',
  5,
  'activities_by_category',
  'bird'
);

-- Photography badge
INSERT INTO badges (name, description, image_url, category, requirement_value, requirement_type, requirement_category) 
VALUES (
  'Photography Pro',
  'Complete 8 photography activities',
  '📸',
  'special',
  8,
  'activities_by_category',
  'photography'
);

-- Outdoor exploration badge
INSERT INTO badges (name, description, image_url, category, requirement_value, requirement_type, requirement_category) 
VALUES (
  'Outdoor Explorer',
  'Complete 6 outdoor exploration activities',
  '🏕️',
  'special',
  6,
  'activities_by_category',
  'outdoor'
);

-- Nature activities badge
INSERT INTO badges (name, description, image_url, category, requirement_value, requirement_type, requirement_category) 
VALUES (
  'Nature Lover',
  'Complete 7 nature-related activities',
  '🌿',
  'special',
  7,
  'activities_by_category',
  'nature'
);
