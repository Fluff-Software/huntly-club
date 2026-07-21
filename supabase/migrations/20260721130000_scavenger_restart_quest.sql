-- Play again: clear found items so the hunt can be replayed (items_rewarded unchanged).

CREATE OR REPLACE FUNCTION public.scavenger_restart_quest(
  p_profile_id bigint,
  p_quest_id uuid
)
RETURNS public.scavenger_quest_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state public.scavenger_quest_states;
BEGIN
  PERFORM public.scavenger_assert_profile_owner(p_profile_id);

  v_state := public.scavenger_ensure_quest_state(p_profile_id, p_quest_id);

  UPDATE public.scavenger_quest_states
  SET
    found_items = '{}',
    complete = false,
    updated_at = now()
  WHERE id = v_state.id
  RETURNING * INTO v_state;

  RETURN v_state;
END;
$$;

REVOKE ALL ON FUNCTION public.scavenger_restart_quest(bigint, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.scavenger_restart_quest(bigint, uuid) TO authenticated, service_role;
