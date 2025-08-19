-- Fix team contributions for existing profiles
-- Calculate team contribution as 50% of individual XP for profiles that haven't been updated yet

UPDATE profiles 
SET team_contribution = FLOOR(xp * 0.5) 
WHERE team_contribution = 0;
