-- Update the requirement_type check constraint to include team_contribution

ALTER TABLE badges 
DROP CONSTRAINT badges_requirement_type_check;

ALTER TABLE badges 
ADD CONSTRAINT badges_requirement_type_check 
CHECK (requirement_type = ANY (ARRAY['xp_gained'::text, 'packs_completed'::text, 'activities_completed'::text, 'team_xp'::text, 'team_contribution'::text, 'activities_by_category'::text]));
