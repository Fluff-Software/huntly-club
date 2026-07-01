-- Tracks whether an unlock came from a code entry or location proximity.
ALTER TABLE huntly_unlock_logs
  ADD COLUMN IF NOT EXISTS unlock_source text
  CHECK (unlock_source IS NULL OR unlock_source IN ('code', 'location'));
-- Stale location unlocks on dual-lock quests do not grant play access.
UPDATE huntly_unlock_logs ul
SET unlock_source = 'location'
FROM huntly_quests q
JOIN huntly_quest_locks l ON l.id = q.lock_id
WHERE ul.type = 'quest'
  AND ul.item_id = q.id
  AND 'code' = ANY(l.types)
  AND 'location' = ANY(l.types)
  AND ul.unlock_source IS NULL;
UPDATE huntly_unlock_logs ul
SET unlock_source = 'location'
FROM huntly_quest_groups g
JOIN huntly_quest_locks l ON l.id = g.lock_id
WHERE ul.type = 'questGroup'
  AND ul.item_id = g.id
  AND 'code' = ANY(l.types)
  AND 'location' = ANY(l.types)
  AND ul.unlock_source IS NULL;
