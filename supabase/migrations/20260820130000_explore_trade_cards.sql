-- Trade 5 duplicate copies of one card for a freshly-drawn different card.
-- Self-contained: does not modify or refactor claim_explore_stop, some
-- duplication of the weighted-pick loop is accepted as the safer option
-- for a live, already-tuned game economy.

-- ---------------------------------------------------------------------------
-- explore_card_trades: audit / idempotency log (not a uniqueness constraint
-- surface like explore_stop_claims -- trades are repeatable indefinitely).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.explore_card_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_id bigint NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  traded_card_id uuid NOT NULL REFERENCES public.explore_cards (id),
  awarded_card_id uuid REFERENCES public.explore_cards (id) ON DELETE SET NULL,
  traded_count integer NOT NULL DEFAULT 5,
  idempotency_key uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT explore_card_trades_idempotency_key_uidx UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS explore_card_trades_profile_idx
  ON public.explore_card_trades (profile_id, created_at DESC);

COMMENT ON TABLE public.explore_card_trades IS
  'Audit + idempotency log for "trade 5 duplicates for a pack". Writes only via trade RPC.';

ALTER TABLE public.explore_card_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own explore card trades" ON public.explore_card_trades;
CREATE POLICY "Users can view own explore card trades"
  ON public.explore_card_trades
  FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT p.id FROM public.profiles p WHERE p.user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT ON public.explore_card_trades TO authenticated;
GRANT ALL ON public.explore_card_trades TO service_role;

-- ---------------------------------------------------------------------------
-- trade_explore_cards: atomic decrement + weighted draw (excluding the
-- traded card) + award upsert. service_role-only; reachable by clients only
-- through the achievements wrapper below.
-- ---------------------------------------------------------------------------
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
  v_remaining integer;
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
  -- the same profile+card serializes behind this one.
  SELECT count INTO v_current_count
  FROM public.explore_profile_cards
  WHERE profile_id = p_profile_id AND card_id = p_card_id
  FOR UPDATE;

  IF NOT FOUND OR v_current_count < 5 THEN
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

  -- Now mutate, still holding the row lock acquired above.
  UPDATE public.explore_profile_cards
  SET count = count - 5, updated_at = now()
  WHERE profile_id = p_profile_id
    AND card_id = p_card_id
    AND count >= 5
  RETURNING count INTO v_remaining;

  IF NOT FOUND THEN
    -- Lost the race between the lock read and here (shouldn't happen given
    -- the FOR UPDATE lock, but fail safe rather than proceed).
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_copies');
  END IF;

  IF v_remaining = 0 THEN
    DELETE FROM public.explore_profile_cards
    WHERE profile_id = p_profile_id AND card_id = p_card_id AND count = 0;
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
    -- Idempotency key raced with itself; replay path above will catch a
    -- genuine retry, so surface a generic failure here.
    RETURN jsonb_build_object('success', false, 'error', 'trade_failed');
END;
$$;

REVOKE ALL ON FUNCTION public.trade_explore_cards(bigint, uuid, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.trade_explore_cards(bigint, uuid, uuid)
  TO service_role;

-- ---------------------------------------------------------------------------
-- trade_explore_cards_award_achievements: XP wrapper, granted to
-- authenticated -- this is the one the client calls directly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trade_explore_cards_award_achievements(
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
  v_result jsonb;
  v_user_id uuid := auth.uid();
  v_team_id bigint;
  v_card jsonb;
  v_rarity text;
  v_card_name text;
  v_xp integer;
BEGIN
  v_result := public.trade_explore_cards(p_profile_id, p_card_id, p_idempotency_key);

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

REVOKE ALL ON FUNCTION public.trade_explore_cards_award_achievements(bigint, uuid, uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.trade_explore_cards_award_achievements(bigint, uuid, uuid)
  TO authenticated, service_role;
