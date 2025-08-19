-- Drop the existing table and recreate with proper policies
DROP TABLE IF EXISTS activity_reactions CASCADE;

-- Create activity reactions table
CREATE TABLE activity_reactions (
  id BIGSERIAL PRIMARY KEY,
  activity_progress_id BIGINT NOT NULL REFERENCES user_activity_progress(id) ON DELETE CASCADE,
  profile_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('high_five', 'like', 'celebrate', 'awesome', 'great_job')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(activity_progress_id, profile_id, reaction_type)
);

-- Create index for better performance
CREATE INDEX idx_activity_reactions_activity_progress_id ON activity_reactions(activity_progress_id);
CREATE INDEX idx_activity_reactions_profile_id ON activity_reactions(profile_id);

-- Add RLS policies
ALTER TABLE activity_reactions ENABLE ROW LEVEL SECURITY;

-- Allow users to view reactions for activities in their team
CREATE POLICY "Users can view reactions for team activities" ON activity_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_activity_progress uap
      JOIN profiles activity_profile ON uap.profile_id = activity_profile.id
      JOIN profiles current_profile ON current_profile.id = profile_id
      WHERE uap.id = activity_reactions.activity_progress_id
      AND activity_profile.team = current_profile.team
    )
  );

-- Allow users to add reactions to activities in their team  
CREATE POLICY "Users can add reactions to team activities" ON activity_reactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_activity_progress uap
      JOIN profiles activity_profile ON uap.profile_id = activity_profile.id
      JOIN profiles current_profile ON current_profile.id = profile_id
      WHERE uap.id = activity_progress_id
      AND activity_profile.team = current_profile.team
    )
  );

-- Allow users to remove their own reactions
CREATE POLICY "Users can remove their own reactions" ON activity_reactions
  FOR DELETE USING (true);
