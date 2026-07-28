-- Step 8: Explore card catalogue + profile ownership + atomic weighted award on claim.
-- Does NOT create a permanent generated-stop catalogue.

-- ---------------------------------------------------------------------------
-- Enums / checks
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'explore_card_rarity') THEN
    CREATE TYPE public.explore_card_rarity AS ENUM (
      'common',
      'uncommon',
      'rare',
      'very_rare'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'explore_card_category') THEN
    CREATE TYPE public.explore_card_category AS ENUM (
      'animal',
      'habitat',
      'flora_wildlife'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- explore_cards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.explore_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category public.explore_card_category NOT NULL,
  rarity public.explore_card_rarity NOT NULL,
  image_path text NOT NULL DEFAULT '',
  base_weight double precision NOT NULL,
  habitat_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT explore_cards_slug_unique UNIQUE (slug),
  CONSTRAINT explore_cards_base_weight_positive CHECK (base_weight > 0),
  CONSTRAINT explore_cards_habitat_weights_object CHECK (jsonb_typeof(habitat_weights) = 'object')
);

CREATE INDEX IF NOT EXISTS explore_cards_active_sort_idx
  ON public.explore_cards (is_active, sort_order, name);

CREATE INDEX IF NOT EXISTS explore_cards_category_idx
  ON public.explore_cards (category);

COMMENT ON TABLE public.explore_cards IS
  'Explore trading-card catalogue. base_weight encodes rarity/availability; habitat_weights encode environment affinity.';

COMMENT ON COLUMN public.explore_cards.base_weight IS
  'Rarity + general availability only. Do not also multiply by a separate rarity factor.';

ALTER TABLE public.explore_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active explore cards" ON public.explore_cards;
CREATE POLICY "Users can view active explore cards"
  ON public.explore_cards
  FOR SELECT
  TO authenticated
  USING (is_active = true);

GRANT SELECT ON public.explore_cards TO authenticated;
GRANT ALL ON public.explore_cards TO service_role;

-- ---------------------------------------------------------------------------
-- explore_profile_cards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.explore_profile_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id bigint NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.explore_cards (id) ON DELETE CASCADE,
  count integer NOT NULL DEFAULT 1,
  first_collected_at timestamptz NOT NULL DEFAULT now(),
  last_collected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT explore_profile_cards_count_positive CHECK (count > 0),
  CONSTRAINT explore_profile_cards_profile_card_uidx UNIQUE (profile_id, card_id)
);

CREATE INDEX IF NOT EXISTS explore_profile_cards_profile_idx
  ON public.explore_profile_cards (profile_id);

CREATE INDEX IF NOT EXISTS explore_profile_cards_card_idx
  ON public.explore_profile_cards (card_id);

CREATE INDEX IF NOT EXISTS explore_profile_cards_profile_last_idx
  ON public.explore_profile_cards (profile_id, last_collected_at DESC);

COMMENT ON TABLE public.explore_profile_cards IS
  'Per-player Explore card ownership. Duplicates increment count. Writes only via claim RPC.';

ALTER TABLE public.explore_profile_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own explore profile cards" ON public.explore_profile_cards;
CREATE POLICY "Users can view own explore profile cards"
  ON public.explore_profile_cards
  FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT p.id FROM public.profiles p WHERE p.user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT ON public.explore_profile_cards TO authenticated;
GRANT ALL ON public.explore_profile_cards TO service_role;

-- Link claims.awarded_card_id to catalogue (nullable until award).
ALTER TABLE public.explore_stop_claims
  DROP CONSTRAINT IF EXISTS explore_stop_claims_awarded_card_id_fkey;

ALTER TABLE public.explore_stop_claims
  ADD CONSTRAINT explore_stop_claims_awarded_card_id_fkey
  FOREIGN KEY (awarded_card_id) REFERENCES public.explore_cards (id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.explore_stop_claims.awarded_card_id IS
  'Card awarded atomically with this claim (Step 8+).';

-- ---------------------------------------------------------------------------
-- Weight helpers (mirror scripts/explore/card-weights.ts)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.explore_card_environment_multiplier(
  p_stop_environment jsonb,
  p_habitat_weights jsonb,
  p_min_multiplier double precision DEFAULT 0.1
)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_sum double precision := 0;
  v_key text;
  v_card_w double precision;
  v_stop_w double precision;
BEGIN
  IF p_habitat_weights IS NULL OR jsonb_typeof(p_habitat_weights) <> 'object' THEN
    RETURN greatest(p_min_multiplier, 0);
  END IF;

  FOR v_key, v_card_w IN
    SELECT key, value::text::double precision
    FROM jsonb_each_text(p_habitat_weights)
  LOOP
    IF v_card_w IS NULL OR v_card_w <= 0 THEN
      CONTINUE;
    END IF;
    IF p_stop_environment ? v_key THEN
      v_stop_w := (p_stop_environment ->> v_key)::double precision;
      IF v_stop_w IS NOT NULL AND v_stop_w > 0 THEN
        v_sum := v_sum + (v_stop_w * v_card_w);
      END IF;
    END IF;
  END LOOP;

  RETURN greatest(coalesce(p_min_multiplier, 0.1), v_sum);
END;
$$;

CREATE OR REPLACE FUNCTION public.explore_card_matched_environments(
  p_stop_environment jsonb,
  p_habitat_weights jsonb
)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_keys text[] := '{}';
  v_key text;
  v_card_w double precision;
  v_stop_w double precision;
BEGIN
  IF p_habitat_weights IS NULL OR jsonb_typeof(p_habitat_weights) <> 'object' THEN
    RETURN v_keys;
  END IF;

  FOR v_key, v_card_w IN
    SELECT key, value::text::double precision
    FROM jsonb_each_text(p_habitat_weights)
  LOOP
    IF v_card_w IS NULL OR v_card_w <= 0 THEN
      CONTINUE;
    END IF;
    IF p_stop_environment ? v_key THEN
      v_stop_w := (p_stop_environment ->> v_key)::double precision;
      IF v_stop_w IS NOT NULL AND v_stop_w > 0 THEN
        v_keys := array_append(v_keys, v_key);
      END IF;
    END IF;
  END LOOP;

  RETURN v_keys;
END;
$$;

CREATE OR REPLACE FUNCTION public.explore_card_public_json(p_card public.explore_cards)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'id', p_card.id,
    'slug', p_card.slug,
    'name', p_card.name,
    'description', p_card.description,
    'category', p_card.category,
    'rarity', p_card.rarity,
    'image_url', CASE
      WHEN p_card.image_path LIKE 'http%' THEN p_card.image_path
      WHEN p_card.image_path = '' THEN NULL
      ELSE p_card.image_path
    END
  );
$$;

-- ---------------------------------------------------------------------------
-- claim_explore_stop: atomic claim + weighted card award
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
  p_idempotency_key uuid DEFAULT NULL
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
  double precision, text, jsonb, uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_explore_stop(
  uuid, bigint, text, integer, double precision, double precision, double precision,
  double precision, text, jsonb, uuid
) TO service_role;

-- ---------------------------------------------------------------------------
-- Collection read (authenticated, own profile only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_explore_profile_card_collection(
  p_profile_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_items jsonb;
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

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'card', public.explore_card_public_json(c),
      'count', epc.count,
      'first_collected_at', epc.first_collected_at,
      'last_collected_at', epc.last_collected_at
    )
    ORDER BY epc.last_collected_at DESC
  ), '[]'::jsonb)
  INTO v_items
  FROM public.explore_profile_cards epc
  JOIN public.explore_cards c ON c.id = epc.card_id
  WHERE epc.profile_id = p_profile_id
    AND c.is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'profile_id', p_profile_id,
    'items', v_items
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_explore_profile_card_collection(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_explore_profile_card_collection(bigint) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Seed MVP catalogue (≥18 cards)
-- ---------------------------------------------------------------------------
INSERT INTO public.explore_cards (
  slug, name, description, category, rarity, image_path, base_weight, habitat_weights, sort_order
) VALUES
  ('common-frog', 'Common Frog', 'A familiar amphibian of ponds and damp edges.', 'animal', 'uncommon', 'explore-cards/common-frog.png', 5,
    '{"freshwater":5,"wetland":4,"park_garden":2,"general":0.25}'::jsonb, 10),
  ('mallard', 'Mallard', 'A dabbling duck often seen on still water.', 'animal', 'common', 'explore-cards/mallard.png', 10,
    '{"freshwater":5,"wetland":3,"park_garden":2,"general":0.25}'::jsonb, 20),
  ('dragonfly', 'Dragonfly', 'A swift hunter of insects near water.', 'animal', 'common', 'explore-cards/dragonfly.png', 10,
    '{"freshwater":4,"wetland":4,"grassland":1,"general":0.25}'::jsonb, 30),
  ('pond-habitat', 'Pond Habitat', 'Still freshwater with fringing plants.', 'habitat', 'common', 'explore-cards/pond-habitat.png', 10,
    '{"freshwater":5,"wetland":3,"park_garden":1,"general":0.2}'::jsonb, 40),
  ('water-lily', 'Water Lily', 'Floating leaves on quiet ponds.', 'flora_wildlife', 'uncommon', 'explore-cards/water-lily.png', 5,
    '{"freshwater":5,"wetland":2,"general":0.2}'::jsonb, 50),
  ('red-fox', 'Red Fox', 'A adaptable mammal of woods and edges.', 'animal', 'uncommon', 'explore-cards/red-fox.png', 5,
    '{"woodland":5,"farmland":2,"urban":1.5,"park_garden":2,"general":0.3}'::jsonb, 60),
  ('tawny-owl', 'Tawny Owl', 'A nocturnal woodland hunter.', 'animal', 'rare', 'explore-cards/tawny-owl.png', 6,
    '{"woodland":5,"park_garden":1,"general":0.2}'::jsonb, 70),
  ('oak-tree', 'Oak Tree', 'A long-lived woodland cornerstone.', 'flora_wildlife', 'common', 'explore-cards/oak-tree.png', 10,
    '{"woodland":5,"park_garden":2,"general":0.25}'::jsonb, 80),
  ('woodland-habitat', 'Woodland Habitat', 'Trees, shade, and leaf litter.', 'habitat', 'common', 'explore-cards/woodland-habitat.png', 10,
    '{"woodland":5,"general":0.2}'::jsonb, 90),
  ('house-sparrow', 'House Sparrow', 'A sociable bird of streets and gardens.', 'animal', 'common', 'explore-cards/house-sparrow.png', 10,
    '{"urban":5,"park_garden":3,"farmland":1,"general":0.3}'::jsonb, 100),
  ('pigeon', 'Pigeon', 'A familiar bird of town centres.', 'animal', 'common', 'explore-cards/pigeon.png', 10,
    '{"urban":5,"park_garden":2,"general":0.3}'::jsonb, 110),
  ('urban-fox', 'Urban Fox', 'A fox at home among houses and alleys.', 'animal', 'uncommon', 'explore-cards/urban-fox.png', 5,
    '{"urban":5,"park_garden":2,"general":0.25}'::jsonb, 120),
  ('town-habitat', 'Town Habitat', 'Built streets, yards, and scraps of green.', 'habitat', 'common', 'explore-cards/town-habitat.png', 10,
    '{"urban":5,"general":0.25}'::jsonb, 130),
  ('rabbit', 'Rabbit', 'A grazer of short grass and edges.', 'animal', 'common', 'explore-cards/rabbit.png', 10,
    '{"grassland":5,"farmland":3,"park_garden":3,"general":0.25}'::jsonb, 140),
  ('bumblebee', 'Bumblebee', 'A buzzing pollinator of flowers.', 'animal', 'common', 'explore-cards/bumblebee.png', 10,
    '{"grassland":4,"park_garden":4,"farmland":2,"general":0.3}'::jsonb, 150),
  ('daisy', 'Daisy', 'A cheerful flower of lawns and meadows.', 'flora_wildlife', 'common', 'explore-cards/daisy.png', 10,
    '{"grassland":4,"park_garden":4,"general":0.3}'::jsonb, 160),
  ('meadow-habitat', 'Meadow Habitat', 'Open grass rich with wildflowers.', 'habitat', 'uncommon', 'explore-cards/meadow-habitat.png', 5,
    '{"grassland":5,"farmland":2,"general":0.2}'::jsonb, 170),
  ('park-habitat', 'Park Habitat', 'Managed green space for play and wildlife.', 'habitat', 'common', 'explore-cards/park-habitat.png', 10,
    '{"park_garden":5,"urban":2,"general":0.25}'::jsonb, 180),
  ('otter', 'Otter', 'A shy river hunter — hard to spot.', 'animal', 'very_rare', 'explore-cards/otter.png', 3,
    '{"freshwater":5,"wetland":3,"general":0.15}'::jsonb, 190),
  ('kingfisher', 'Kingfisher', 'A flash of blue along waterways.', 'animal', 'rare', 'explore-cards/kingfisher.png', 6,
    '{"freshwater":5,"wetland":2,"general":0.2}'::jsonb, 200)
ON CONFLICT (slug) DO NOTHING;
