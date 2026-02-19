-- Revoke all auth sessions and refresh tokens for a user (e.g. after account removal).
-- Called by the admin app with service_role. SECURITY DEFINER allows access to auth schema.
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.refresh_tokens WHERE user_id = p_user_id;
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.revoke_user_sessions(uuid) IS 'Revokes all sessions for the given user (e.g. after account removal). Call with service_role.';
