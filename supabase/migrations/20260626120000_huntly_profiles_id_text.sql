-- Change huntly_profiles.id (and all referencing profile_id FK columns) from uuid
-- to text so client-generated IDs (24-char hex strings from the mobile app's
-- generateId()) can be stored directly without a separate client_id mapping column.
--
-- Existing data (UUID-format IDs from the Mongo→Supabase migration) remain valid
-- as text. The default for new rows continues to generate UUID-format strings.

BEGIN;

-- Drop FK constraints on child tables
ALTER TABLE huntly_profile_states  DROP CONSTRAINT huntly_profile_states_profile_id_fkey;
ALTER TABLE huntly_quest_states     DROP CONSTRAINT huntly_quest_states_profile_id_fkey;
ALTER TABLE huntly_badges           DROP CONSTRAINT huntly_badges_profile_id_fkey;
ALTER TABLE huntly_activities       DROP CONSTRAINT huntly_activities_profile_id_fkey;

-- Change huntly_profiles.id to text
ALTER TABLE huntly_profiles ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE huntly_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Change profile_id columns in child tables to text
ALTER TABLE huntly_profile_states  ALTER COLUMN profile_id TYPE text USING profile_id::text;
ALTER TABLE huntly_quest_states     ALTER COLUMN profile_id TYPE text USING profile_id::text;
ALTER TABLE huntly_badges           ALTER COLUMN profile_id TYPE text USING profile_id::text;
ALTER TABLE huntly_activities       ALTER COLUMN profile_id TYPE text USING profile_id::text;

-- Re-add FK constraints (now text → text)
ALTER TABLE huntly_profile_states ADD CONSTRAINT huntly_profile_states_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES huntly_profiles(id) ON DELETE CASCADE;
ALTER TABLE huntly_quest_states ADD CONSTRAINT huntly_quest_states_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES huntly_profiles(id) ON DELETE CASCADE;
ALTER TABLE huntly_badges ADD CONSTRAINT huntly_badges_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES huntly_profiles(id) ON DELETE CASCADE;
ALTER TABLE huntly_activities ADD CONSTRAINT huntly_activities_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES huntly_profiles(id) ON DELETE CASCADE;

COMMIT;
