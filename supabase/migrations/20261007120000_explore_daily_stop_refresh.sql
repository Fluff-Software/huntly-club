-- Stops refresh every day instead of staying locked forever.
--
-- A claim now locks a stop for one child until UK midnight; the next day the
-- same stop can be claimed again. The rule is "one claim per child, per stop,
-- per day" (Europe/London). Everything downstream of the claim -- the banked
-- pack, the card draw, event packs, idempotency -- is unchanged. Old claims
-- keep their history and simply stop locking the stop after their day.

-- ---------------------------------------------------------------------------
-- The UK calendar day. Defined once so the table default, the claim RPC and
-- the claimed-stops list can never disagree about what "today" is.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.explore_claim_day()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (now() AT TIME ZONE 'Europe/London')::date;
$$;

GRANT EXECUTE ON FUNCTION public.explore_claim_day() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- explore_stop_claims.claim_day. The DEFAULT stamps every new claim with
-- today, so the claim RPC's INSERTs need no change.
-- ---------------------------------------------------------------------------
ALTER TABLE public.explore_stop_claims
  ADD COLUMN IF NOT EXISTS claim_day date;

UPDATE public.explore_stop_claims
SET claim_day = (claimed_at AT TIME ZONE 'Europe/London')::date
WHERE claim_day IS NULL;

ALTER TABLE public.explore_stop_claims
  ALTER COLUMN claim_day SET DEFAULT public.explore_claim_day(),
  ALTER COLUMN claim_day SET NOT NULL;

COMMENT ON COLUMN public.explore_stop_claims.claim_day IS
  'UK calendar day of the claim. A stop is claimable once per profile per day.';

DROP INDEX IF EXISTS public.explore_stop_claims_profile_stop_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS explore_stop_claims_profile_stop_day_uidx
  ON public.explore_stop_claims (profile_id, stop_id, claim_day);

CREATE INDEX IF NOT EXISTS explore_stop_claims_profile_day_idx
  ON public.explore_stop_claims (profile_id, claim_day);

-- ---------------------------------------------------------------------------
-- claim_explore_stop: identical to the pack-bank version except that the
-- "already claimed" lookups only look at TODAY's claim for the stop.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_explore_stop(
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
  p_idempotency_key uuid DEFAULT NULL,
  p_defer_reveal boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_existing public.explore_stop_claims%ROWTYPE;
  v_claim public.explore_stop_claims%ROWTYPE;
  v_pack public.explore_profile_packs%ROWTYPE;
  v_card public.explore_cards%ROWTYPE;
  v_owned boolean;
  v_count integer;
  v_is_new boolean;
  v_env jsonb;
  v_new_mult double precision := 4;
  v_owned_mult double precision := 1;
  v_min_env double precision := 0.1;
  v_total double precision := 0;
  v_pick double precision;
  v_cursor double precision := 0;
  v_final double precision;
  v_col_mult double precision;
  v_env_mult double precision;
  v_matched text[];
  r record;
  v_selected_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  IF p_stop_id IS NULL OR btrim(p_stop_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_stop_id');
  END IF;

  IF p_generation_version IS NULL OR p_generation_version <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'unsupported_generation_version');
  END IF;

  IF p_reported_accuracy_metres IS NULL OR p_reported_accuracy_metres <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_accuracy');
  END IF;

  IF p_verified_distance_metres IS NULL OR p_verified_distance_metres < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'claim_failed');
  END IF;

  SELECT p.user_id INTO v_owner
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  IF v_owner IS NULL OR v_owner <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_profile');
  END IF;

  v_env := coalesce(p_environment_profile, '{}'::jsonb);
  IF jsonb_typeof(v_env) <> 'object' THEN
    v_env := '{}'::jsonb;
  END IF;

  -- Idempotent retry: same key returns original claim + award (no second draw).
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.explore_stop_claims c
    WHERE c.idempotency_key = p_idempotency_key;

    IF FOUND THEN
      SELECT * INTO v_card FROM public.explore_cards WHERE id = v_existing.awarded_card_id;
      SELECT coalesce(epc.count, 0) INTO v_count
      FROM public.explore_profile_cards epc
      WHERE epc.profile_id = v_existing.profile_id
        AND epc.card_id = v_existing.awarded_card_id;

      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'claim', jsonb_build_object(
          'claim_id', v_existing.id,
          'stop_id', v_existing.stop_id,
          'generation_version', v_existing.generation_version,
          'claimed_at', v_existing.claimed_at,
          'verified_distance_metres', v_existing.verified_distance_metres,
          'profile_id', v_existing.profile_id,
          'awarded_card_id', v_existing.awarded_card_id
        ),
        'award', CASE
          WHEN v_card.id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'card', public.explore_card_public_json(v_card),
            'is_new', (coalesce(v_count, 0) <= 1),
            'count', coalesce(v_count, 1),
            'matched_environments', public.explore_card_matched_environments(
              v_existing.environment_profile,
              v_card.habitat_weights
            )
          )
        END
      );
    END IF;
  END IF;

  SELECT * INTO v_existing
  FROM public.explore_stop_claims c
  WHERE c.profile_id = p_profile_id
    AND c.stop_id = p_stop_id
    AND c.claim_day = public.explore_claim_day();

  IF FOUND THEN
    SELECT * INTO v_card FROM public.explore_cards WHERE id = v_existing.awarded_card_id;
    SELECT coalesce(epc.count, 0) INTO v_count
    FROM public.explore_profile_cards epc
    WHERE epc.profile_id = v_existing.profile_id
      AND epc.card_id = v_existing.awarded_card_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_claimed',
      'claim', jsonb_build_object(
        'claim_id', v_existing.id,
        'stop_id', v_existing.stop_id,
        'generation_version', v_existing.generation_version,
        'claimed_at', v_existing.claimed_at,
        'verified_distance_metres', v_existing.verified_distance_metres,
        'profile_id', v_existing.profile_id,
        'awarded_card_id', v_existing.awarded_card_id
      ),
      'award', CASE
        WHEN v_card.id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'card', public.explore_card_public_json(v_card),
          'is_new', false,
          'count', coalesce(v_count, 1),
          'matched_environments', public.explore_card_matched_environments(
            v_existing.environment_profile,
            v_card.habitat_weights
          )
        )
      END
    );
  END IF;

  IF p_defer_reveal THEN
    BEGIN
      INSERT INTO public.explore_stop_claims (
        user_id,
        profile_id,
        stop_id,
        generation_version,
        reported_latitude,
        reported_longitude,
        reported_accuracy_metres,
        verified_distance_metres,
        source_type,
        environment_profile,
        idempotency_key,
        awarded_card_id
      )
      VALUES (
        p_user_id,
        p_profile_id,
        btrim(p_stop_id),
        p_generation_version,
        p_reported_latitude,
        p_reported_longitude,
        p_reported_accuracy_metres,
        p_verified_distance_metres,
        coalesce(nullif(btrim(p_source_type), ''), 'unknown'),
        v_env,
        p_idempotency_key,
        NULL
      )
      RETURNING * INTO v_claim;

      INSERT INTO public.explore_profile_packs (
        user_id,
        profile_id,
        source,
        source_claim_id,
        environment_profile,
        status
      )
      VALUES (
        p_user_id,
        p_profile_id,
        'stop_claim',
        v_claim.id,
        v_env,
        'unopened'
      )
      RETURNING * INTO v_pack;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT * INTO v_existing
        FROM public.explore_stop_claims c
        WHERE c.profile_id = p_profile_id
          AND c.stop_id = p_stop_id
    AND c.claim_day = public.explore_claim_day();
        IF FOUND THEN
          SELECT * INTO v_card FROM public.explore_cards WHERE id = v_existing.awarded_card_id;
          RETURN jsonb_build_object(
            'success', false,
            'error', 'already_claimed',
            'claim', jsonb_build_object(
              'claim_id', v_existing.id,
              'stop_id', v_existing.stop_id,
              'generation_version', v_existing.generation_version,
              'claimed_at', v_existing.claimed_at,
              'verified_distance_metres', v_existing.verified_distance_metres,
              'profile_id', v_existing.profile_id,
              'awarded_card_id', v_existing.awarded_card_id
            ),
            'award', CASE
              WHEN v_card.id IS NULL THEN NULL
              ELSE jsonb_build_object(
                'card', public.explore_card_public_json(v_card),
                'is_new', false,
                'count', 1,
                'matched_environments', '{}'::text[]
              )
            END
          );
        END IF;
        RETURN jsonb_build_object('success', false, 'error', 'claim_failed');
    END;

    RETURN jsonb_build_object(
      'success', true,
      'banked', true,
      'claim', jsonb_build_object(
        'claim_id', v_claim.id,
        'stop_id', v_claim.stop_id,
        'generation_version', v_claim.generation_version,
        'claimed_at', v_claim.claimed_at,
        'verified_distance_metres', v_claim.verified_distance_metres,
        'profile_id', v_claim.profile_id,
        'awarded_card_id', v_claim.awarded_card_id
      ),
      'pack', jsonb_build_object(
        'pack_id', v_pack.id,
        'profile_id', v_pack.profile_id,
        'source', v_pack.source,
        'status', v_pack.status,
        'banked_at', v_pack.banked_at
      )
    );
  END IF;

  -- Build weighted pool and pick one card (server-side random()).
  CREATE TEMP TABLE IF NOT EXISTS _explore_weight_pool (
    card_id uuid PRIMARY KEY,
    final_weight double precision NOT NULL,
    matched text[] NOT NULL
  ) ON COMMIT DROP;

  DELETE FROM _explore_weight_pool WHERE true;

  FOR r IN
    SELECT c.*
    FROM public.explore_cards c
    WHERE c.is_active = true
      AND c.base_weight > 0
  LOOP
    v_owned := EXISTS (
      SELECT 1
      FROM public.explore_profile_cards epc
      WHERE epc.profile_id = p_profile_id
        AND epc.card_id = r.id
    );
    v_col_mult := CASE WHEN v_owned THEN v_owned_mult ELSE v_new_mult END;
    v_env_mult := public.explore_card_environment_multiplier(v_env, r.habitat_weights, v_min_env);
    v_final := r.base_weight * v_env_mult * v_col_mult;
    IF v_final > 0 AND v_final = v_final THEN
      INSERT INTO _explore_weight_pool (card_id, final_weight, matched)
      VALUES (
        r.id,
        v_final,
        public.explore_card_matched_environments(v_env, r.habitat_weights)
      );
      v_total := v_total + v_final;
    END IF;
  END LOOP;

  IF v_total <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_eligible_cards');
  END IF;

  v_pick := random() * v_total;
  v_selected_id := NULL;
  FOR r IN
    SELECT card_id, final_weight, matched
    FROM _explore_weight_pool
    ORDER BY card_id
  LOOP
    v_cursor := v_cursor + r.final_weight;
    IF v_pick < v_cursor THEN
      v_selected_id := r.card_id;
      v_matched := r.matched;
      EXIT;
    END IF;
  END LOOP;

  IF v_selected_id IS NULL THEN
    SELECT card_id, matched INTO v_selected_id, v_matched
    FROM _explore_weight_pool
    ORDER BY card_id DESC
    LIMIT 1;
  END IF;

  IF v_selected_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_eligible_cards');
  END IF;

  SELECT * INTO v_card FROM public.explore_cards WHERE id = v_selected_id;

  v_owned := EXISTS (
    SELECT 1
    FROM public.explore_profile_cards epc
    WHERE epc.profile_id = p_profile_id
      AND epc.card_id = v_selected_id
  );

  BEGIN
    INSERT INTO public.explore_stop_claims (
      user_id,
      profile_id,
      stop_id,
      generation_version,
      reported_latitude,
      reported_longitude,
      reported_accuracy_metres,
      verified_distance_metres,
      source_type,
      environment_profile,
      idempotency_key,
      awarded_card_id
    )
    VALUES (
      p_user_id,
      p_profile_id,
      btrim(p_stop_id),
      p_generation_version,
      p_reported_latitude,
      p_reported_longitude,
      p_reported_accuracy_metres,
      p_verified_distance_metres,
      coalesce(nullif(btrim(p_source_type), ''), 'unknown'),
      v_env,
      p_idempotency_key,
      v_selected_id
    )
    RETURNING * INTO v_claim;

    INSERT INTO public.explore_profile_cards (
      profile_id,
      card_id,
      count,
      first_collected_at,
      last_collected_at
    )
    VALUES (
      p_profile_id,
      v_selected_id,
      1,
      now(),
      now()
    )
    ON CONFLICT (profile_id, card_id) DO UPDATE
      SET
        count = public.explore_profile_cards.count + 1,
        last_collected_at = now(),
        updated_at = now()
    RETURNING count INTO v_count;

    v_is_new := NOT v_owned;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT * INTO v_existing
      FROM public.explore_stop_claims c
      WHERE c.profile_id = p_profile_id
        AND c.stop_id = p_stop_id
    AND c.claim_day = public.explore_claim_day();
      IF FOUND THEN
        SELECT * INTO v_card FROM public.explore_cards WHERE id = v_existing.awarded_card_id;
        SELECT coalesce(epc.count, 1) INTO v_count
        FROM public.explore_profile_cards epc
        WHERE epc.profile_id = v_existing.profile_id
          AND epc.card_id = v_existing.awarded_card_id;
        RETURN jsonb_build_object(
          'success', false,
          'error', 'already_claimed',
          'claim', jsonb_build_object(
            'claim_id', v_existing.id,
            'stop_id', v_existing.stop_id,
            'generation_version', v_existing.generation_version,
            'claimed_at', v_existing.claimed_at,
            'verified_distance_metres', v_existing.verified_distance_metres,
            'profile_id', v_existing.profile_id,
            'awarded_card_id', v_existing.awarded_card_id
          ),
          'award', CASE
            WHEN v_card.id IS NULL THEN NULL
            ELSE jsonb_build_object(
              'card', public.explore_card_public_json(v_card),
              'is_new', false,
              'count', coalesce(v_count, 1),
              'matched_environments', coalesce(v_matched, '{}'::text[])
            )
          END
        );
      END IF;

      IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing
        FROM public.explore_stop_claims c
        WHERE c.idempotency_key = p_idempotency_key;
        IF FOUND THEN
          SELECT * INTO v_card FROM public.explore_cards WHERE id = v_existing.awarded_card_id;
          SELECT coalesce(epc.count, 1) INTO v_count
          FROM public.explore_profile_cards epc
          WHERE epc.profile_id = v_existing.profile_id
            AND epc.card_id = v_existing.awarded_card_id;
          RETURN jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'claim', jsonb_build_object(
              'claim_id', v_existing.id,
              'stop_id', v_existing.stop_id,
              'generation_version', v_existing.generation_version,
              'claimed_at', v_existing.claimed_at,
              'verified_distance_metres', v_existing.verified_distance_metres,
              'profile_id', v_existing.profile_id,
              'awarded_card_id', v_existing.awarded_card_id
            ),
            'award', CASE
              WHEN v_card.id IS NULL THEN NULL
              ELSE jsonb_build_object(
                'card', public.explore_card_public_json(v_card),
                'is_new', (coalesce(v_count, 0) <= 1),
                'count', coalesce(v_count, 1),
                'matched_environments', public.explore_card_matched_environments(
                  v_existing.environment_profile,
                  v_card.habitat_weights
                )
              )
            END
          );
        END IF;
      END IF;

      RETURN jsonb_build_object('success', false, 'error', 'claim_failed');
  END;

  RETURN jsonb_build_object(
    'success', true,
    'claim', jsonb_build_object(
      'claim_id', v_claim.id,
      'stop_id', v_claim.stop_id,
      'generation_version', v_claim.generation_version,
      'claimed_at', v_claim.claimed_at,
      'verified_distance_metres', v_claim.verified_distance_metres,
      'profile_id', v_claim.profile_id,
      'awarded_card_id', v_claim.awarded_card_id
    ),
    'award', jsonb_build_object(
      'card', public.explore_card_public_json(v_card),
      'is_new', v_is_new,
      'count', v_count,
      'matched_environments', coalesce(v_matched, '{}'::text[])
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_explore_stop(
  uuid, bigint, text, integer, double precision, double precision, double precision,
  double precision, text, jsonb, uuid, boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_explore_stop(
  uuid, bigint, text, integer, double precision, double precision, double precision,
  double precision, text, jsonb, uuid, boolean
) TO service_role;

-- ---------------------------------------------------------------------------
-- get_explore_claimed_stop_ids: only today's claims count as "claimed".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_explore_claimed_stop_ids(
  p_profile_id bigint
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_ids text[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.user_id INTO v_owner
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  IF v_owner IS NULL OR v_owner <> v_uid THEN
    RAISE EXCEPTION 'Not authorized for this profile';
  END IF;

  SELECT coalesce(array_agg(c.stop_id ORDER BY c.claimed_at DESC), '{}')
  INTO v_ids
  FROM public.explore_stop_claims c
  WHERE c.profile_id = p_profile_id
    AND c.claim_day = public.explore_claim_day();

  RETURN v_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.get_explore_claimed_stop_ids(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_explore_claimed_stop_ids(bigint) TO authenticated, service_role;
