-- Time-limited Explore events + the Halloween pack.
--
-- Shape:
--   * explore_events: a dated window (admin-editable) with a pack_chance, i.e.
--     the probability that a stop claim banks an *event pack* instead of a
--     normal one while the window is open.
--   * explore_cards.event_id / event_weight: event cards. They are never in
--     the normal pools -- base_weight is 0, and every existing draw already
--     filters `base_weight > 0` -- so they can't drop from regular packs or
--     trade-up packs. Inside an event pack they are drawn by event_weight.
--   * explore_profile_packs.event_id: which banked packs are event packs.
--     Decided at claim time (so the client can show the right pack art) and
--     drawn at open time, like every other banked pack.
--   * Event packs never award duplicates: only cards the profile doesn't own
--     are in the pool, and a pack is only rolled while the profile still has
--     more unowned event cards than unopened event packs banked.
--
-- Event cards can never reach the 6 copies trade-ups require, so they can't
-- be traded up either.

-- ---------------------------------------------------------------------------
-- explore_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.explore_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  -- Half-open window: [starts_at, ends_at).
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  -- Chance (0-1) that a stop claim banks this event's pack while live.
  pack_chance double precision NOT NULL DEFAULT 0.35,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT explore_events_slug_unique UNIQUE (slug),
  CONSTRAINT explore_events_window_check CHECK (ends_at > starts_at),
  CONSTRAINT explore_events_pack_chance_check CHECK (pack_chance >= 0 AND pack_chance <= 1)
);

COMMENT ON TABLE public.explore_events IS
  'Time-limited Explore events (e.g. Halloween). While live, stop claims have pack_chance of banking the event pack. Managed from the admin app.';

ALTER TABLE public.explore_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view explore events" ON public.explore_events;
CREATE POLICY "Authenticated can view explore events"
  ON public.explore_events
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.explore_events TO authenticated;
GRANT ALL ON public.explore_events TO service_role;

-- ---------------------------------------------------------------------------
-- explore_cards: event cards
-- ---------------------------------------------------------------------------
ALTER TABLE public.explore_cards
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.explore_events (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_weight double precision NOT NULL DEFAULT 0;

ALTER TABLE public.explore_cards
  DROP CONSTRAINT IF EXISTS explore_cards_base_weight_positive;

-- Normal cards keep a positive base_weight; event cards must be 0 so they
-- stay out of every normal / trade-up pool.
ALTER TABLE public.explore_cards
  ADD CONSTRAINT explore_cards_base_weight_positive
  CHECK (
    (event_id IS NULL AND base_weight > 0)
    OR (event_id IS NOT NULL AND base_weight = 0)
  );

ALTER TABLE public.explore_cards
  ADD CONSTRAINT explore_cards_event_weight_nonnegative
  CHECK (event_weight >= 0);

CREATE INDEX IF NOT EXISTS explore_cards_event_idx
  ON public.explore_cards (event_id)
  WHERE event_id IS NOT NULL;

COMMENT ON COLUMN public.explore_cards.event_id IS
  'Set for time-limited event cards. These are only ever drawn from that event''s packs.';
COMMENT ON COLUMN public.explore_cards.event_weight IS
  'Relative draw weight inside the event pack (higher = more common). Ignored for non-event cards.';

-- ---------------------------------------------------------------------------
-- explore_profile_packs: which banked packs are event packs
-- ---------------------------------------------------------------------------
ALTER TABLE public.explore_profile_packs
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.explore_events (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS explore_profile_packs_event_idx
  ON public.explore_profile_packs (profile_id, event_id)
  WHERE event_id IS NOT NULL AND status = 'unopened';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.explore_active_event()
RETURNS public.explore_events
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT e.*
  FROM public.explore_events e
  WHERE e.is_active = true
    AND now() >= e.starts_at
    AND now() < e.ends_at
  ORDER BY e.starts_at DESC
  LIMIT 1;
$$;

-- Weighted pick among the event cards this profile does NOT own yet.
-- Returns NULL when nothing is left (all collected, or event has no cards).
CREATE OR REPLACE FUNCTION public.explore_pick_event_card(
  p_profile_id bigint,
  p_event_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_total double precision;
  v_pick double precision;
  v_cursor double precision := 0;
  v_last uuid;
  r record;
BEGIN
  SELECT coalesce(sum(c.event_weight), 0) INTO v_total
  FROM public.explore_cards c
  WHERE c.event_id = p_event_id
    AND c.is_active = true
    AND c.event_weight > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.explore_profile_cards epc
      WHERE epc.profile_id = p_profile_id AND epc.card_id = c.id
    );

  IF v_total <= 0 THEN
    RETURN NULL;
  END IF;

  v_pick := random() * v_total;

  FOR r IN
    SELECT c.id, c.event_weight
    FROM public.explore_cards c
    WHERE c.event_id = p_event_id
      AND c.is_active = true
      AND c.event_weight > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.explore_profile_cards epc
        WHERE epc.profile_id = p_profile_id AND epc.card_id = c.id
      )
    ORDER BY c.id
  LOOP
    v_last := r.id;
    v_cursor := v_cursor + r.event_weight;
    IF v_pick < v_cursor THEN
      RETURN r.id;
    END IF;
  END LOOP;

  RETURN v_last;
END;
$$;

-- Roll for an event pack on a stop claim. Returns the live event if this
-- claim should bank its pack, else NULL.
CREATE OR REPLACE FUNCTION public.explore_roll_event_pack(
  p_profile_id bigint
)
RETURNS public.explore_events
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_event public.explore_events%ROWTYPE;
  v_unowned integer;
  v_banked integer;
BEGIN
  SELECT * INTO v_event FROM public.explore_active_event();
  IF v_event.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_unowned
  FROM public.explore_cards c
  WHERE c.event_id = v_event.id
    AND c.is_active = true
    AND c.event_weight > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.explore_profile_cards epc
      WHERE epc.profile_id = p_profile_id AND epc.card_id = c.id
    );

  SELECT count(*) INTO v_banked
  FROM public.explore_profile_packs p
  WHERE p.profile_id = p_profile_id
    AND p.event_id = v_event.id
    AND p.status = 'unopened';

  -- Every remaining card is already spoken for by a banked pack.
  IF v_unowned <= v_banked THEN
    RETURN NULL;
  END IF;

  IF random() < v_event.pack_chance THEN
    RETURN v_event;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.explore_active_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.explore_pick_event_card(bigint, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.explore_roll_event_pack(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.explore_active_event() TO service_role;
GRANT EXECUTE ON FUNCTION public.explore_pick_event_card(bigint, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.explore_roll_event_pack(bigint) TO service_role;

-- ---------------------------------------------------------------------------
-- claim_explore_stop_award_achievements: after a fresh banked claim, roll for
-- an event pack and tag the pack row. The core claim RPC is untouched.
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
  v_pack_id uuid;
  v_event public.explore_events%ROWTYPE;
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

  -- Fresh banked claims only (not already_claimed, not idempotent replays).
  IF v_result->>'success' = 'true'
     AND v_result->'idempotent_replay' IS NULL
     AND v_result->>'banked' = 'true'
     AND v_result->'pack'->>'pack_id' IS NOT NULL THEN
    v_pack_id := (v_result->'pack'->>'pack_id')::uuid;

    SELECT * INTO v_event FROM public.explore_roll_event_pack(p_profile_id);
    IF v_event.id IS NOT NULL THEN
      UPDATE public.explore_profile_packs
      SET event_id = v_event.id
      WHERE id = v_pack_id;

      v_result := jsonb_set(
        v_result,
        '{pack,event_slug}',
        to_jsonb(v_event.slug)
      );
    END IF;
  END IF;

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
-- open_explore_event_pack: draw the deferred card for an event pack. Same
-- contract as open_explore_pack, but the pool is the event's unowned cards.
-- If nothing is left to award (a race), it falls back to a normal pack.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.open_explore_event_pack(
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
  v_event public.explore_events%ROWTYPE;
  v_card public.explore_cards%ROWTYPE;
  v_selected_id uuid;
  v_count integer;
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

  -- Already opened: the normal opener returns the idempotent replay.
  IF v_pack.status = 'opened' OR v_pack.event_id IS NULL THEN
    RETURN public.open_explore_pack(p_pack_id);
  END IF;

  SELECT * INTO v_event FROM public.explore_events WHERE id = v_pack.event_id;

  v_selected_id := public.explore_pick_event_card(v_pack.profile_id, v_pack.event_id);

  IF v_selected_id IS NULL THEN
    -- Nothing new left in the event: turn it into a normal pack.
    UPDATE public.explore_profile_packs SET event_id = NULL WHERE id = v_pack.id;
    RETURN public.open_explore_pack(p_pack_id);
  END IF;

  SELECT * INTO v_card FROM public.explore_cards WHERE id = v_selected_id;

  -- The pool only holds unowned cards, so this is always a first copy.
  INSERT INTO public.explore_profile_cards (
    profile_id, card_id, count, first_collected_at, last_collected_at
  )
  VALUES (v_pack.profile_id, v_selected_id, 1, now(), now())
  ON CONFLICT (profile_id, card_id) DO UPDATE
    SET
      count = public.explore_profile_cards.count + 1,
      last_collected_at = now(),
      updated_at = now()
  RETURNING count INTO v_count;

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

  RETURN jsonb_build_object(
    'success', true,
    'pack', jsonb_build_object(
      'pack_id', v_pack.id,
      'profile_id', v_pack.profile_id,
      'source', v_pack.source,
      'status', v_pack.status,
      'opened_at', v_pack.opened_at,
      'event_slug', v_event.slug
    ),
    'award', jsonb_build_object(
      'card', public.explore_card_public_json(v_card),
      'is_new', (v_count <= 1),
      'count', v_count,
      'matched_environments', '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.open_explore_event_pack(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_explore_event_pack(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- open_explore_pack_award_achievements: route event packs to the event
-- opener, everything else to the normal one.
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
  -- open_explore_event_pack hands non-event / already-opened packs straight
  -- to open_explore_pack, so it's safe to route everything through it.
  v_result := public.open_explore_event_pack(p_pack_id);

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
            WHEN 'halloween' THEN 5
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

-- ---------------------------------------------------------------------------
-- Binder catalogue: event cards only show while their event is live, or once
-- the profile owns them (so they never become permanent locked placeholders).
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
      'card', jsonb_build_object(
        'id', c.id,
        'slug', c.slug,
        'name', c.name,
        'description', c.description,
        'category', c.category,
        'rarity', c.rarity,
        'image_url', CASE
          WHEN c.image_path LIKE 'http%' THEN c.image_path
          WHEN c.image_path = '' THEN NULL
          ELSE c.image_path
        END,
        'sort_order', c.sort_order,
        'habitat_weights', c.habitat_weights
      ),
      'count', coalesce(epc.count, 0),
      'collected', (epc.card_id IS NOT NULL),
      'first_collected_at', epc.first_collected_at,
      'last_collected_at', epc.last_collected_at
    )
    ORDER BY c.sort_order ASC, c.name ASC
  ), '[]'::jsonb)
  INTO v_items
  FROM public.explore_cards c
  LEFT JOIN public.explore_profile_cards epc
    ON epc.card_id = c.id
   AND epc.profile_id = p_profile_id
  WHERE c.is_active = true
    AND (
      c.event_id IS NULL
      OR epc.card_id IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM public.explore_events e
        WHERE e.id = c.event_id
          AND e.is_active = true
          AND now() >= e.starts_at
          AND now() < e.ends_at
      )
    );

  RETURN jsonb_build_object(
    'success', true,
    'profile_id', p_profile_id,
    'items', v_items
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Seed: Halloween 2026 (7 Oct -> end of 5 Nov, UK time) and its 10 cards.
-- pack_chance 0.35: far more event packs than the normal drop rate, but never
-- guaranteed. Tune it (and the dates) in the admin app.
-- ---------------------------------------------------------------------------
INSERT INTO public.explore_events (slug, name, starts_at, ends_at, pack_chance, is_active)
VALUES (
  'halloween',
  'Halloween Pack',
  '2026-10-07 00:00:00+01',
  '2026-11-06 00:00:00+00',
  0.35,
  true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.explore_cards (
  slug, name, description, category, rarity, image_path,
  base_weight, event_id, event_weight, habitat_weights, is_active, sort_order
)
SELECT
  v.slug, v.name, v.description,
  'halloween'::public.explore_card_category,
  'halloween'::public.explore_card_rarity,
  'https://mkdrlicbqusfuldtpmtr.supabase.co/storage/v1/object/public/explore-card-images/' || v.slug || '.webp',
  0, e.id, v.event_weight, '{}'::jsonb, true, v.sort_order
FROM public.explore_events e
CROSS JOIN (VALUES
  ('halloween-jack-o-lantern', 'Jack-o''-Lantern',
   'A carved pumpkin with a glowing grin. The candle inside keeps the autumn dusk company.',
   10, 1001),
  ('halloween-black-cat', 'Black Cat',
   'A sleek black cat with golden eyes, sitting very still among the pumpkins as if it knows a secret.',
   10, 1002),
  ('halloween-bat', 'Fruit Bat',
   'A cheerful little bat swooping across the harvest moon. It only comes out when the lanterns are lit.',
   10, 1003),
  ('halloween-cauldron', 'Bubbling Cauldron',
   'A cauldron full of green, glowing potion. Nobody knows the recipe, and nobody is brave enough to taste it.',
   10, 1004),
  ('halloween-graveyard', 'Moonlit Graveyard',
   'Mossy old stones and flickering lanterns on a hill above the village. Spooky, but peaceful.',
   10, 1005),
  ('halloween-spider', 'Orb Weaver',
   'A garden spider at the centre of a web sparkling with dew. Its stripy legs are perfect for Halloween.',
   10, 1006),
  ('halloween-haunted-house', 'Haunted House',
   'A crooked old house on the hill with every window glowing. Is someone home? Best not to knock.',
   10, 1007),
  ('halloween-skeleton', 'Friendly Skeleton',
   'A bony fellow who waves at everyone who walks up the path. He is much friendlier than he looks.',
   3, 1008),
  ('halloween-ghost', 'Lantern Ghost',
   'A glowing little ghost who floats along the path carrying a lantern, lighting the way for trick-or-treaters.',
   3, 1009),
  ('halloween-witch', 'Moonlight Witch',
   'A young witch zooming across the full moon on her broomstick, with her black cat along for the ride.',
   2, 1010)
) AS v(slug, name, description, event_weight, sort_order)
WHERE e.slug = 'halloween'
ON CONFLICT (slug) DO NOTHING;
