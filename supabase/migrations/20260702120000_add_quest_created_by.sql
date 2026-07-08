ALTER TABLE huntly_quests
  ADD COLUMN IF NOT EXISTS created_by text;
CREATE INDEX IF NOT EXISTS huntly_quests_created_by_idx ON huntly_quests (created_by);
