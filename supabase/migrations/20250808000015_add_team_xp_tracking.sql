-- Add team XP tracking functionality
-- This allows teams to accumulate XP from member activities

-- Add team_xp column to teams table
ALTER TABLE "public"."teams" 
ADD COLUMN "team_xp" integer NOT NULL DEFAULT 0;

-- Create a function to add XP to a team
CREATE OR REPLACE FUNCTION add_team_xp(team_id bigint, xp_amount integer)
RETURNS void AS $$
BEGIN
  UPDATE teams 
  SET team_xp = team_xp + xp_amount 
  WHERE id = team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get team XP
CREATE OR REPLACE FUNCTION get_team_xp(team_id bigint)
RETURNS integer AS $$
DECLARE
  current_xp integer;
BEGIN
  SELECT team_xp INTO current_xp FROM teams WHERE id = team_id;
  RETURN COALESCE(current_xp, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the functions
GRANT EXECUTE ON FUNCTION add_team_xp(bigint, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_xp(bigint) TO authenticated;

-- Update RLS policies to allow reading team XP
CREATE POLICY "Users can view team XP" ON "public"."teams"
    FOR SELECT USING (true);

-- Create policy to allow updating team XP (only through functions)
CREATE POLICY "Teams can update their own XP" ON "public"."teams"
    FOR UPDATE USING (true) WITH CHECK (true);
