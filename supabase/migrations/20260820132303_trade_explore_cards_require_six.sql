-- Require 6 copies to trade (cost stays 5), so trading never leaves a
-- player with zero copies of a card they still had multiples of.

CREATE OR REPLACE FUNCTION public.trade_explore_cards(
  p_profile_id bigint,
  p_card_id uuid,
  p_idempotency_key uuid DEFAULT NULL
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

  -- Build weighted pool excluding the traded card (read-only; safe to bail
  -- out of before any mutation happens).
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

  -- Now mutate, still holding the row lock acquired above. count is always
  -- >= 6 here, so count - 5 is always >= 1 -- no delete-at-zero branch
  -- needed any more, but a defensive fallback costs nothing.
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

REVOKE ALL ON FUNCTION public.trade_explore_cards(bigint, uuid, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.trade_explore_cards(bigint, uuid, uuid)
  TO service_role;
