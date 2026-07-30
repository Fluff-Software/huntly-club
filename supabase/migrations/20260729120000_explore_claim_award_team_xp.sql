-- Explore claims should contribute to team points (user_achievements feed).
-- We do this in a thin wrapper so we don't have to rewrite the whole claim_explore_stop pipeline.

CREATE OR REPLACE FUNCTION public.claim_explore_stop_award_achievements(
  p_user_id uuid,
  p_profile_id bigint,
  p_stop_id text,
  p_generation_version integer,
  p_reported_latitude double precision,
  p_reported_longitude double precision,
  p_reported_accuracy_metres double precision,
  p_verified_distance_metres double precision,
  p_source_type text,
  p_environment_profile jsonb,
  p_idempotency_key uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_team_id bigint;
  v_card jsonb;
  v_rarity text;
  v_card_name text;
  v_xp integer;
BEGIN
  v_result := public.claim_explore_stop(
    p_user_id,
    p_profile_id,
    p_stop_id,
    p_generation_version,
    p_reported_latitude,
    p_reported_longitude,
    p_reported_accuracy_metres,
    p_verified_distance_metres,
    p_source_type,
    p_environment_profile,
    p_idempotency_key
  );

  -- Only award points on fresh/successful claims (skip already_claimed and idempotent replays).
  IF v_result->>'success' = 'true' AND v_result->'idempotent_replay' IS NULL THEN
    v_card := v_result->'award'->'card';

    IF v_card IS NOT NULL THEN
      v_rarity := v_card->>'rarity';
      v_card_name := v_card->>'name';

      SELECT ud.team INTO v_team_id
      FROM public.user_data ud
      WHERE ud.user_id = p_user_id;

      -- Best-effort: never block the claim if achievements insert fails.
      BEGIN
        IF v_team_id IS NOT NULL THEN
          v_xp := CASE v_rarity
            WHEN 'very_rare' THEN 12
            WHEN 'rare' THEN 7
            WHEN 'uncommon' THEN 4
            ELSE 2
          END;

          INSERT INTO public.user_achievements (
            profile_id,
            team_id,
            source,
            source_id,
            message,
            xp
          )
          VALUES (
            p_profile_id,
            v_team_id,
            'explore',
            0,
            format('collected %s', coalesce(v_card_name, 'a card')),
            v_xp
          );
        END IF;
      EXCEPTION
        WHEN others THEN
          -- ignore
          NULL;
      END;
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_explore_stop_award_achievements(
  uuid, bigint, text, integer,
  double precision, double precision, double precision, double precision,
  text, jsonb, uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_explore_stop_award_achievements(
  uuid, bigint, text, integer,
  double precision, double precision, double precision, double precision,
  text, jsonb, uuid
) TO service_role;

