-- Bank a claimed/traded pack unopened, and open it later.
--
-- The random draw itself is deferred until the pack is opened -- not just
-- the reveal animation -- so a banked pack never touches
-- explore_profile_cards (and doesn't spoil the surprise in the binder)
-- until the player actually opens it.

-- ---------------------------------------------------------------------------
-- explore_profile_packs: one row per banked, unopened-or-opened pack.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.explore_profile_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_id bigint NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  source text NOT NULL,
  source_claim_id uuid REFERENCES public.explore_stop_claims (id) ON DELETE SET NULL,
  source_trade_id uuid REFERENCES public.explore_card_trades (id) ON DELETE SET NULL,
  traded_card_id uuid REFERENCES public.explore_cards (id) ON DELETE SET NULL,
  environment_profile jsonb,
  status text NOT NULL DEFAULT 'unopened',
  awarded_card_id uuid REFERENCES public.explore_cards (id) ON DELETE SET NULL,
  banked_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  CONSTRAINT explore_profile_packs_source_check CHECK (source IN ('stop_claim', 'trade')),
  CONSTRAINT explore_profile_packs_status_check CHECK (status IN ('unopened', 'opened'))
);

CREATE INDEX IF NOT EXISTS explore_profile_packs_profile_status_idx
  ON public.explore_profile_packs (profile_id, status, banked_at);

COMMENT ON TABLE public.explore_profile_packs IS
  'Banked packs awaiting a deferred open. The card draw itself happens at open time, not bank time. Writes only via claim/trade/open RPCs.';

ALTER TABLE public.explore_profile_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own explore profile packs" ON public.explore_profile_packs;
CREATE POLICY "Users can view own explore profile packs"
  ON public.explore_profile_packs
  FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT p.id FROM public.profiles p WHERE p.user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT ON public.explore_profile_packs TO authenticated;
GRANT ALL ON public.explore_profile_packs TO service_role;

-- ---------------------------------------------------------------------------
-- claim_explore_stop: add p_defer_reveal. When true, the stop is still
-- marked claimed (uniqueness on profile_id/stop_id still applies) but no
-- card is drawn -- a pack row is banked instead.
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
    AND c.stop_id = p_stop_id;

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
          AND c.stop_id = p_stop_id;
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
        AND c.stop_id = p_stop_id;
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
-- claim_explore_stop_award_achievements: pass through p_defer_reveal. XP is
-- only ever granted off an awarded card, which is absent on a banked claim,
-- so no other change is needed -- banking a pack never grants XP up front.
-- ---------------------------------------------------------------------------
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
  p_idempotency_key uuid DEFAULT NULL,
  p_defer_reveal boolean DEFAULT false
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
    p_idempotency_key,
    p_defer_reveal
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
  text, jsonb, uuid, boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_explore_stop_award_achievements(
  uuid, bigint, text, integer,
  double precision, double precision, double precision, double precision,
  text, jsonb, uuid, boolean
) TO service_role;

-- ---------------------------------------------------------------------------
-- trade_explore_cards: add p_defer_reveal. The cost (decrement/delete of the
-- traded card) still happens immediately either way -- only the replacement
-- card's draw is deferred.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trade_explore_cards(
  p_profile_id bigint,
  p_card_id uuid,
  p_idempotency_key uuid DEFAULT NULL,
  p_defer_reveal boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner uuid;
  v_existing_trade public.explore_card_trades%ROWTYPE;
  v_traded_card public.explore_cards%ROWTYPE;
  v_card public.explore_cards%ROWTYPE;
  v_current_count integer;
  v_owned boolean;
  v_count integer;
  v_is_new boolean;
  v_total double precision := 0;
  v_pick double precision;
  v_cursor double precision := 0;
  v_final double precision;
  v_col_mult double precision;
  v_env_mult double precision;
  v_new_mult double precision := 4;
  v_owned_mult double precision := 1;
  v_min_env double precision := 0.1;
  r record;
  v_selected_id uuid;
  v_trade public.explore_card_trades%ROWTYPE;
  v_pack public.explore_profile_packs%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  IF p_card_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_card');
  END IF;

  SELECT p.user_id INTO v_owner
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  IF v_owner IS NULL OR v_owner <> v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_profile');
  END IF;

  -- Idempotent retry: same key returns original trade + award, no re-draw.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing_trade
    FROM public.explore_card_trades t
    WHERE t.idempotency_key = p_idempotency_key;

    IF FOUND THEN
      SELECT * INTO v_card FROM public.explore_cards WHERE id = v_existing_trade.awarded_card_id;
      SELECT coalesce(epc.count, 0) INTO v_count
      FROM public.explore_profile_cards epc
      WHERE epc.profile_id = v_existing_trade.profile_id
        AND epc.card_id = v_existing_trade.awarded_card_id;

      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'trade', jsonb_build_object(
          'trade_id', v_existing_trade.id,
          'profile_id', v_existing_trade.profile_id,
          'traded_card_id', v_existing_trade.traded_card_id,
          'awarded_card_id', v_existing_trade.awarded_card_id,
          'traded_count', v_existing_trade.traded_count,
          'created_at', v_existing_trade.created_at
        ),
        'award', CASE
          WHEN v_card.id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'card', public.explore_card_public_json(v_card),
            'is_new', (coalesce(v_count, 0) <= 1),
            'count', coalesce(v_count, 1),
            'matched_environments', '[]'::jsonb
          )
        END
      );
    END IF;
  END IF;

  SELECT * INTO v_traded_card FROM public.explore_cards WHERE id = p_card_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_card');
  END IF;

  -- Lock the ownership row (without mutating yet) so a concurrent trade on
  -- the same profile+card serializes behind this one. Require 6 owned so
  -- the player always keeps at least 1 after the 5-copy cost.
  SELECT count INTO v_current_count
  FROM public.explore_profile_cards
  WHERE profile_id = p_profile_id AND card_id = p_card_id
  FOR UPDATE;

  IF NOT FOUND OR v_current_count < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_copies');
  END IF;

  -- Pay the cost now either way -- only the replacement card's draw defers.
  IF v_current_count = 5 THEN
    DELETE FROM public.explore_profile_cards
    WHERE profile_id = p_profile_id AND card_id = p_card_id;
  ELSE
    UPDATE public.explore_profile_cards
    SET count = count - 5, updated_at = now()
    WHERE profile_id = p_profile_id
      AND card_id = p_card_id
      AND count >= 5;
  END IF;

  IF p_defer_reveal THEN
    INSERT INTO public.explore_card_trades (
      user_id,
      profile_id,
      traded_card_id,
      awarded_card_id,
      traded_count,
      idempotency_key
    )
    VALUES (
      v_user_id,
      p_profile_id,
      p_card_id,
      NULL,
      5,
      p_idempotency_key
    )
    RETURNING * INTO v_trade;

    INSERT INTO public.explore_profile_packs (
      user_id,
      profile_id,
      source,
      source_trade_id,
      traded_card_id,
      status
    )
    VALUES (
      v_user_id,
      p_profile_id,
      'trade',
      v_trade.id,
      p_card_id,
      'unopened'
    )
    RETURNING * INTO v_pack;

    RETURN jsonb_build_object(
      'success', true,
      'banked', true,
      'trade', jsonb_build_object(
        'trade_id', v_trade.id,
        'profile_id', v_trade.profile_id,
        'traded_card_id', v_trade.traded_card_id,
        'awarded_card_id', v_trade.awarded_card_id,
        'traded_count', v_trade.traded_count,
        'created_at', v_trade.created_at
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

  -- Build weighted pool excluding the traded card.
  CREATE TEMP TABLE IF NOT EXISTS _explore_trade_weight_pool (
    card_id uuid PRIMARY KEY,
    final_weight double precision NOT NULL
  ) ON COMMIT DROP;

  DELETE FROM _explore_trade_weight_pool WHERE true;

  FOR r IN
    SELECT c.*
    FROM public.explore_cards c
    WHERE c.is_active = true
      AND c.base_weight > 0
      AND c.id <> p_card_id
  LOOP
    v_owned := EXISTS (
      SELECT 1
      FROM public.explore_profile_cards epc
      WHERE epc.profile_id = p_profile_id
        AND epc.card_id = r.id
    );
    v_col_mult := CASE WHEN v_owned THEN v_owned_mult ELSE v_new_mult END;
    -- No environment/location context for a trade; every card gets the
    -- same floor multiplier so only the collection bias affects the draw.
    v_env_mult := v_min_env;
    v_final := r.base_weight * v_env_mult * v_col_mult;
    IF v_final > 0 AND v_final = v_final THEN
      INSERT INTO _explore_trade_weight_pool (card_id, final_weight)
      VALUES (r.id, v_final);
      v_total := v_total + v_final;
    END IF;
  END LOOP;

  IF v_total <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_eligible_cards');
  END IF;

  v_pick := random() * v_total;
  v_selected_id := NULL;
  FOR r IN
    SELECT card_id, final_weight
    FROM _explore_trade_weight_pool
    ORDER BY card_id
  LOOP
    v_cursor := v_cursor + r.final_weight;
    IF v_pick < v_cursor THEN
      v_selected_id := r.card_id;
      EXIT;
    END IF;
  END LOOP;

  IF v_selected_id IS NULL THEN
    SELECT card_id INTO v_selected_id
    FROM _explore_trade_weight_pool
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

  INSERT INTO public.explore_card_trades (
    user_id,
    profile_id,
    traded_card_id,
    awarded_card_id,
    traded_count,
    idempotency_key
  )
  VALUES (
    v_user_id,
    p_profile_id,
    p_card_id,
    v_selected_id,
    5,
    p_idempotency_key
  )
  RETURNING * INTO v_trade;

  RETURN jsonb_build_object(
    'success', true,
    'trade', jsonb_build_object(
      'trade_id', v_trade.id,
      'profile_id', v_trade.profile_id,
      'traded_card_id', v_trade.traded_card_id,
      'awarded_card_id', v_trade.awarded_card_id,
      'traded_count', v_trade.traded_count,
      'created_at', v_trade.created_at
    ),
    'award', jsonb_build_object(
      'card', public.explore_card_public_json(v_card),
      'is_new', v_is_new,
      'count', v_count,
      'matched_environments', '[]'::jsonb
    )
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'trade_failed');
END;
$$;

REVOKE ALL ON FUNCTION public.trade_explore_cards(bigint, uuid, uuid, boolean)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.trade_explore_cards(bigint, uuid, uuid, boolean)
  TO service_role;

-- ---------------------------------------------------------------------------
-- trade_explore_cards_award_achievements: pass through p_defer_reveal.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trade_explore_cards_award_achievements(
  p_profile_id bigint,
  p_card_id uuid,
  p_idempotency_key uuid DEFAULT NULL,
  p_defer_reveal boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_user_id uuid := auth.uid();
  v_team_id bigint;
  v_card jsonb;
  v_rarity text;
  v_card_name text;
  v_xp integer;
BEGIN
  v_result := public.trade_explore_cards(p_profile_id, p_card_id, p_idempotency_key, p_defer_reveal);

  IF v_result->>'success' = 'true'
     AND coalesce((v_result->>'idempotent_replay')::boolean, false) = false THEN
    v_card := v_result->'award'->'card';

    -- Best-effort: never block / roll back the trade if achievements insert fails.
    BEGIN
      IF v_card IS NOT NULL AND v_user_id IS NOT NULL THEN
        v_rarity := v_card->>'rarity';
        v_card_name := nullif(trim(v_card->>'name'), '');

        SELECT ud.team INTO v_team_id
        FROM public.user_data ud
        WHERE ud.user_id = v_user_id;

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
            format(
              'traded 5 cards for a %s card',
              lower(coalesce(v_card_name, 'mystery'))
            ),
            v_xp
          );
        END IF;
      END IF;
    EXCEPTION
      WHEN others THEN
        NULL;
    END;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.trade_explore_cards_award_achievements(bigint, uuid, uuid, boolean)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.trade_explore_cards_award_achievements(bigint, uuid, uuid, boolean)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- open_explore_pack: draw the deferred card for a banked pack. service_role-
-- only; reachable by clients only through the achievements wrapper below.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.open_explore_pack(
  p_pack_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_pack public.explore_profile_packs%ROWTYPE;
  v_card public.explore_cards%ROWTYPE;
  v_owned boolean;
  v_count integer;
  v_is_new boolean;
  v_env jsonb;
  v_total double precision := 0;
  v_pick double precision;
  v_cursor double precision := 0;
  v_final double precision;
  v_col_mult double precision;
  v_env_mult double precision;
  v_new_mult double precision := 4;
  v_owned_mult double precision := 1;
  v_min_env double precision := 0.1;
  v_matched text[];
  r record;
  v_selected_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  IF p_pack_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_pack');
  END IF;

  SELECT * INTO v_pack
  FROM public.explore_profile_packs
  WHERE id = p_pack_id
  FOR UPDATE;

  IF NOT FOUND OR v_pack.user_id <> v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'pack_not_found');
  END IF;

  IF v_pack.status = 'opened' THEN
    SELECT * INTO v_card FROM public.explore_cards WHERE id = v_pack.awarded_card_id;
    SELECT coalesce(epc.count, 0) INTO v_count
    FROM public.explore_profile_cards epc
    WHERE epc.profile_id = v_pack.profile_id
      AND epc.card_id = v_pack.awarded_card_id;

    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'pack', jsonb_build_object(
        'pack_id', v_pack.id,
        'profile_id', v_pack.profile_id,
        'source', v_pack.source,
        'status', v_pack.status,
        'opened_at', v_pack.opened_at
      ),
      'award', CASE
        WHEN v_card.id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'card', public.explore_card_public_json(v_card),
          'is_new', (coalesce(v_count, 0) <= 1),
          'count', coalesce(v_count, 1),
          'matched_environments', '[]'::jsonb
        )
      END
    );
  END IF;

  v_env := coalesce(v_pack.environment_profile, '{}'::jsonb);
  IF jsonb_typeof(v_env) <> 'object' THEN
    v_env := '{}'::jsonb;
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _explore_pack_weight_pool (
    card_id uuid PRIMARY KEY,
    final_weight double precision NOT NULL,
    matched text[] NOT NULL
  ) ON COMMIT DROP;

  DELETE FROM _explore_pack_weight_pool WHERE true;

  FOR r IN
    SELECT c.*
    FROM public.explore_cards c
    WHERE c.is_active = true
      AND c.base_weight > 0
      AND (v_pack.traded_card_id IS NULL OR c.id <> v_pack.traded_card_id)
  LOOP
    v_owned := EXISTS (
      SELECT 1
      FROM public.explore_profile_cards epc
      WHERE epc.profile_id = v_pack.profile_id
        AND epc.card_id = r.id
    );
    v_col_mult := CASE WHEN v_owned THEN v_owned_mult ELSE v_new_mult END;
    v_env_mult := CASE
      WHEN v_pack.source = 'stop_claim'
        THEN public.explore_card_environment_multiplier(v_env, r.habitat_weights, v_min_env)
      ELSE v_min_env
    END;
    v_final := r.base_weight * v_env_mult * v_col_mult;
    IF v_final > 0 AND v_final = v_final THEN
      INSERT INTO _explore_pack_weight_pool (card_id, final_weight, matched)
      VALUES (
        r.id,
        v_final,
        CASE
          WHEN v_pack.source = 'stop_claim'
            THEN public.explore_card_matched_environments(v_env, r.habitat_weights)
          ELSE '{}'::text[]
        END
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
    FROM _explore_pack_weight_pool
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
    FROM _explore_pack_weight_pool
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
    WHERE epc.profile_id = v_pack.profile_id
      AND epc.card_id = v_selected_id
  );

  INSERT INTO public.explore_profile_cards (
    profile_id,
    card_id,
    count,
    first_collected_at,
    last_collected_at
  )
  VALUES (
    v_pack.profile_id,
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

  UPDATE public.explore_profile_packs
  SET status = 'opened',
      awarded_card_id = v_selected_id,
      opened_at = now()
  WHERE id = v_pack.id
  RETURNING * INTO v_pack;

  IF v_pack.source_claim_id IS NOT NULL THEN
    UPDATE public.explore_stop_claims
    SET awarded_card_id = v_selected_id
    WHERE id = v_pack.source_claim_id;
  END IF;

  IF v_pack.source_trade_id IS NOT NULL THEN
    UPDATE public.explore_card_trades
    SET awarded_card_id = v_selected_id
    WHERE id = v_pack.source_trade_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'pack', jsonb_build_object(
      'pack_id', v_pack.id,
      'profile_id', v_pack.profile_id,
      'source', v_pack.source,
      'status', v_pack.status,
      'opened_at', v_pack.opened_at
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

REVOKE ALL ON FUNCTION public.open_explore_pack(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.open_explore_pack(uuid)
  TO service_role;

-- ---------------------------------------------------------------------------
-- open_explore_pack_award_achievements: XP wrapper, granted to authenticated
-- -- this is the one the client calls directly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.open_explore_pack_award_achievements(
  p_pack_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_user_id uuid := auth.uid();
  v_profile_id bigint;
  v_team_id bigint;
  v_card jsonb;
  v_rarity text;
  v_card_name text;
  v_xp integer;
BEGIN
  v_result := public.open_explore_pack(p_pack_id);

  IF v_result->>'success' = 'true'
     AND coalesce((v_result->>'idempotent_replay')::boolean, false) = false THEN
    v_card := v_result->'award'->'card';
    v_profile_id := (v_result->'pack'->>'profile_id')::bigint;

    -- Best-effort: never block / roll back the open if achievements insert fails.
    BEGIN
      IF v_card IS NOT NULL AND v_user_id IS NOT NULL AND v_profile_id IS NOT NULL THEN
        v_rarity := v_card->>'rarity';
        v_card_name := nullif(trim(v_card->>'name'), '');

        SELECT ud.team INTO v_team_id
        FROM public.user_data ud
        WHERE ud.user_id = v_user_id;

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
            v_profile_id,
            v_team_id,
            'explore',
            0,
            format('opened a saved pack: %s', coalesce(v_card_name, 'a card')),
            v_xp
          );
        END IF;
      END IF;
    EXCEPTION
      WHEN others THEN
        NULL;
    END;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.open_explore_pack_award_achievements(uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.open_explore_pack_award_achievements(uuid)
  TO authenticated, service_role;
