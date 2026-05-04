-- Season Builder: new supporting tables for Compass AI workflow

-- Captains: makes intro_captain first-class so AI can generate in-voice copy
CREATE TABLE captains (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  voice_guide text NOT NULL,
  avatar_url text NOT NULL,
  pose_options text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Image assets: decouples "prompt we want" from "file we have"
CREATE TABLE image_assets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('season_hero','chapter','story_slide','mission_step','badge','captain_pose')),
  entity_id bigint NOT NULL,
  slot_key text,
  prompt text,
  prompt_status text NOT NULL DEFAULT 'draft' CHECK (prompt_status IN ('draft','approved')),
  storage_path text,
  status text NOT NULL DEFAULT 'needs_prompt' CHECK (status IN ('needs_prompt','prompt_ready','awaiting_image','image_uploaded','approved')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Approvals: lightweight audit of every status transition
CREATE TABLE approvals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('season','chapter','activity','badge','image_asset')),
  entity_id bigint NOT NULL,
  from_status content_status NOT NULL,
  to_status content_status NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Compass AI generation audit: every AI call is recorded and replayable
CREATE TABLE compass_generations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action text NOT NULL,
  entity_type text,
  entity_id bigint,
  model text NOT NULL,
  input jsonb NOT NULL,
  system_prompt_version text,
  output jsonb NOT NULL,
  tokens_in int,
  tokens_out int,
  cost_usd numeric(10,6),
  accepted boolean,
  accepted_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Revisions: flat snapshots of canonical fields on every accepted change
CREATE TABLE revisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id bigint NOT NULL,
  snapshot jsonb NOT NULL,
  summary text,
  actor_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- FK back-references so we can join season/chapter/activity → last Compass output
ALTER TABLE seasons ADD CONSTRAINT seasons_last_compass_generation_id_fkey
  FOREIGN KEY (last_compass_generation_id) REFERENCES compass_generations(id);
ALTER TABLE chapters ADD CONSTRAINT chapters_last_compass_generation_id_fkey
  FOREIGN KEY (last_compass_generation_id) REFERENCES compass_generations(id);
ALTER TABLE activities ADD CONSTRAINT activities_last_compass_generation_id_fkey
  FOREIGN KEY (last_compass_generation_id) REFERENCES compass_generations(id);
