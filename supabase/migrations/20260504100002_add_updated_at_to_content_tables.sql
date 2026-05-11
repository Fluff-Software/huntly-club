ALTER TABLE seasons
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
