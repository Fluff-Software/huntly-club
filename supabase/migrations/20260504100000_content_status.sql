-- Season Builder: content workflow layer on existing content tables

CREATE TYPE content_status AS ENUM (
  'concept',
  'outline',
  'drafting',
  'in_review',
  'approved',
  'published',
  'archived'
);

-- seasons
ALTER TABLE seasons
  ADD COLUMN slug text UNIQUE,
  ADD COLUMN brief text,
  ADD COLUMN concept_summary text,
  ADD COLUMN theme_keywords text[],
  ADD COLUMN target_age_min int DEFAULT 5,
  ADD COLUMN target_age_max int DEFAULT 10,
  ADD COLUMN content_status content_status NOT NULL DEFAULT 'concept',
  ADD COLUMN publish_at timestamptz,
  ADD COLUMN draft_payload jsonb,
  ADD COLUMN last_compass_generation_id bigint,
  ADD COLUMN created_by uuid REFERENCES auth.users(id),
  ADD COLUMN updated_by uuid REFERENCES auth.users(id);

-- chapters
ALTER TABLE chapters
  ADD COLUMN summary text,
  ADD COLUMN arc_position text CHECK (arc_position IN ('setup','rising','midpoint','falling','climax','resolution')),
  ADD COLUMN content_status content_status NOT NULL DEFAULT 'concept',
  ADD COLUMN draft_payload jsonb,
  ADD COLUMN last_compass_generation_id bigint,
  ADD COLUMN created_by uuid REFERENCES auth.users(id),
  ADD COLUMN updated_by uuid REFERENCES auth.users(id);

-- activities
ALTER TABLE activities
  ADD COLUMN mission_type text CHECK (mission_type IN ('outdoor','indoor','hybrid')),
  ADD COLUMN safety_notes text,
  ADD COLUMN content_status content_status NOT NULL DEFAULT 'concept',
  ADD COLUMN draft_payload jsonb,
  ADD COLUMN last_compass_generation_id bigint,
  ADD COLUMN created_by uuid REFERENCES auth.users(id),
  ADD COLUMN updated_by uuid REFERENCES auth.users(id);

-- badges
ALTER TABLE badges
  ADD COLUMN season_id bigint REFERENCES seasons(id),
  ADD COLUMN chapter_id bigint REFERENCES chapters(id),
  ADD COLUMN content_status content_status NOT NULL DEFAULT 'concept';

-- Backfill all existing rows to 'published' so the mobile app keeps working
UPDATE seasons SET content_status = 'published', slug = 'season-' || id WHERE slug IS NULL;
UPDATE chapters SET content_status = 'published';
UPDATE activities SET content_status = 'published';
UPDATE badges SET content_status = 'published';
