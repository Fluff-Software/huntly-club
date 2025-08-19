-- Add requirement_category column to badges table
-- This allows badges to be awarded for specific activity categories

ALTER TABLE badges 
ADD COLUMN requirement_category TEXT;
