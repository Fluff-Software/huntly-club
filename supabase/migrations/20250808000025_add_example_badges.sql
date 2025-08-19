-- Example: Adding new badges to the database
-- This shows how to add new badge definitions

-- Add a new XP-based badge
INSERT INTO badges (name, description, image_url, category, requirement_value, requirement_type) 
VALUES (
  'Trail Blazer',
  'Earn 200 XP through completing activities',
  '🥾',
  'xp',
  200,
  'xp_gained'
);

-- Add a new pack-based badge
INSERT INTO badges (name, description, image_url, category, requirement_value, requirement_type) 
VALUES (
  'Pack Master',
  'Complete 3 different packs of activities',
  '📚',
  'pack',
  3,
  'packs_completed'
);

-- Add a new team-based badge
INSERT INTO badges (name, description, image_url, category, requirement_value, requirement_type) 
VALUES (
  'Team Captain',
  'Contribute 100 XP to your team',
  '👑',
  'team',
  100,
  'team_xp'
);

-- Add a new activity-based badge
INSERT INTO badges (name, description, image_url, category, requirement_value, requirement_type) 
VALUES (
  'Activity Champion',
  'Complete 25 different activities',
  '🏅',
  'special',
  25,
  'activities_completed'
);
