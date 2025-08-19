-- Add team_contribution column to profiles table
-- This tracks how much XP each profile has contributed to their team

ALTER TABLE profiles 
ADD COLUMN team_contribution INTEGER DEFAULT 0;
