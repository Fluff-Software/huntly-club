-- Clean up duplicate badges that were incorrectly awarded
-- Keep only the first badge of each type per user

DELETE FROM user_badges 
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, badge_id 
             ORDER BY earned_at ASC
           ) as rn
    FROM user_badges
  ) t
  WHERE rn > 1
);
