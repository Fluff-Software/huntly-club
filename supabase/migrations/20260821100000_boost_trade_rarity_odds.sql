-- Trading 5 duplicates for a pack should feel more worthwhile than a plain
-- stop claim: skew the draw toward rarer cards, and lean a little harder
-- toward cards the player doesn't have yet. Stop claims (and their
-- environment-weighted draw) are untouched -- this only affects the
-- 'trade' source in trade_explore_cards / open_explore_pack.

CREATE OR REPLACE FUNCTION public.explore_trade_rarity_multiplier(
  p_rarity public.explore_card_rarity
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_rarity
    WHEN 'very_rare' THEN 2.5
    WHEN 'rare' THEN 1.75
    WHEN 'uncommon' THEN 1.25
    ELSE 1.0
  END;
$$;

-- ---------------------------------------------------------------------------
-- trade_explore_cards: apply the trade rarity boost + a slightly higher
-- not-owned bias to the immediate (non-deferred) draw path.
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
  v_rarity_mult double precision;
  -- Trades lean harder toward not-yet-owned cards than a plain stop claim.
  v_new_mult double precision := 5;
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
    v_rarity_mult := public.explore_trade_rarity_multiplier(r.rarity);
    -- No environment/location context for a trade; every card gets the
    -- same floor multiplier so only the collection/rarity bias affects the draw.
    v_env_mult := v_min_env;
    v_final := r.base_weight * v_env_mult * v_col_mult * v_rarity_mult;
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
-- open_explore_pack: this is the path trades actually go through today (the
-- client always calls trade_explore_cards with p_defer_reveal := true), so
-- the boost has to live here too -- stop_claim packs are untouched.
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
  v_rarity_mult double precision;
  v_new_mult double precision := 4;
  -- Trades lean harder toward not-yet-owned cards than a plain stop claim.
  v_new_mult_trade double precision := 5;
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
    v_col_mult := CASE
      WHEN v_owned THEN v_owned_mult
      WHEN v_pack.source = 'trade' THEN v_new_mult_trade
      ELSE v_new_mult
    END;
    v_rarity_mult := CASE
      WHEN v_pack.source = 'trade' THEN public.explore_trade_rarity_multiplier(r.rarity)
      ELSE 1.0
    END;
    v_env_mult := CASE
      WHEN v_pack.source = 'stop_claim'
        THEN public.explore_card_environment_multiplier(v_env, r.habitat_weights, v_min_env)
      ELSE v_min_env
    END;
    v_final := r.base_weight * v_env_mult * v_col_mult * v_rarity_mult;
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
