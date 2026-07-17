CREATE TABLE IF NOT EXISTS huntly_account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_user_id text NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status
  ON huntly_account_deletion_requests (status);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user
  ON huntly_account_deletion_requests (firebase_user_id);
