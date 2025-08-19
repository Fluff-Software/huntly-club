-- Fix team badges to use team_contribution instead of team_xp
-- This makes the badges track individual contribution rather than team total

UPDATE badges 
SET requirement_type = 'team_contribution'
WHERE name IN ('Team Player', 'Team Captain');
