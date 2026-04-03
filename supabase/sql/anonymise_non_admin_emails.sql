BEGIN;

WITH anonymised_users AS (
  SELECT
    u.id,
    lower('user_' || replace(u.id::text, '-', '') || '@example.invalid') AS anonymised_email
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.admins a
    WHERE a.user_id = u.id
  )
)
UPDATE auth.users u
SET
  email = au.anonymised_email,
  email_change = au.anonymised_email,
  email_change_token_new = '',
  email_change_confirm_status = 0,
  raw_user_meta_data = jsonb_set(
    COALESCE(u.raw_user_meta_data, '{}'::jsonb),
    '{email}',
    to_jsonb(au.anonymised_email),
    true
  ),
  updated_at = now()
FROM anonymised_users au
WHERE u.id = au.id;

COMMIT;
