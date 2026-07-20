-- World Exploration check-in: the single write path for the whole feature.
--
-- Client-submitted GPS is never trusted for the actual award -- this SECURITY DEFINER function
-- recomputes distance server-side (haversine, mirroring metersBetween() in
-- apps/mobile/services/trackingSessionService.ts) and performs the weighted-random card draw and
-- an independent shiny roll atomically, so drop odds are never observable or replayable from the
-- client. The draw is global across the whole active catalog (not scoped to the checked-in
-- location) -- any of the 100 cards can turn up anywhere.
--
-- Returns a typed row rather than raising for the common "not close enough" / "too soon" cases --
-- those are expected outcomes the client renders gracefully, not exceptions.
--
-- `#variable_conflict use_column` tells plpgsql to prefer the table column whenever an identifier
-- could be either an OUT-parameter/column name or a local variable -- needed because
-- `collectible_id`/`count` are both RETURNS TABLE columns and explore_profile_collectibles
-- columns referenced inside the ON CONFLICT DO UPDATE. Safe here since the function never reads
-- back its own OUT variables by bare name (it always assigns to explicit v_* locals).

CREATE OR REPLACE FUNCTION public.check_in_to_explore_location(
  p_profile_id bigint,
  p_location_id bigint,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision
)
RETURNS TABLE (
  success boolean,
  failure_reason text,
  distance_meters double precision,
  collectible_id bigint,
  collectible_name text,
  collectible_image_url text,
  collectible_rarity explore_collectible_rarity,
  collectible_flavor_text text,
  is_new_collectible boolean,
  new_count integer,
  xp_awarded integer,
  new_profile_xp integer,
  is_shiny boolean,
  is_first_shiny boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_profile_user_id uuid;
  v_location record;
  v_lat1 double precision;
  v_lat2 double precision;
  v_dlat double precision;
  v_dlon double precision;
  v_a double precision;
  v_distance double precision;
  v_accuracy_grace double precision;
  v_recent_visits integer;
  v_total_weight integer;
  v_roll double precision;
  v_collectible_id bigint;
  v_collectible record;
  v_is_new boolean;
  v_new_count integer;
  v_xp_awarded integer;
  v_new_profile_xp integer;
  v_is_shiny boolean;
  v_is_first_shiny boolean;
  v_had_shiny_before boolean;
BEGIN
  -- 1. Auth check
  SELECT p.user_id INTO v_profile_user_id
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  IF v_profile_user_id IS NULL OR (v_auth_user_id IS NOT NULL AND v_auth_user_id <> v_profile_user_id) THEN
    RETURN QUERY SELECT false, 'not_authorized'::text, NULL::double precision, NULL::bigint,
      NULL::text, NULL::text, NULL::explore_collectible_rarity, NULL::text,
      NULL::boolean, NULL::integer, NULL::integer, NULL::integer, NULL::boolean, NULL::boolean;
    RETURN;
  END IF;

  -- 2. Location must exist and be active
  SELECT * INTO v_location
  FROM public.explore_locations
  WHERE id = p_location_id AND is_active = true
  FOR UPDATE;

  IF v_location IS NULL THEN
    RETURN QUERY SELECT false, 'location_inactive'::text, NULL::double precision, NULL::bigint,
      NULL::text, NULL::text, NULL::explore_collectible_rarity, NULL::text,
      NULL::boolean, NULL::integer, NULL::integer, NULL::integer, NULL::boolean, NULL::boolean;
    RETURN;
  END IF;

  -- 3. Accuracy check (cheap, before the distance calc)
  IF p_accuracy_meters IS NULL OR p_accuracy_meters > 65 THEN
    RETURN QUERY SELECT false, 'accuracy_too_poor'::text, NULL::double precision, NULL::bigint,
      NULL::text, NULL::text, NULL::explore_collectible_rarity, NULL::text,
      NULL::boolean, NULL::integer, NULL::integer, NULL::integer, NULL::boolean, NULL::boolean;
    RETURN;
  END IF;

  -- 4. Server-side haversine distance -- never trust a client-submitted distance
  v_lat1 := radians(v_location.latitude);
  v_lat2 := radians(p_latitude);
  v_dlat := radians(p_latitude - v_location.latitude);
  v_dlon := radians(p_longitude - v_location.longitude);
  v_a := sin(v_dlat / 2) ^ 2 + cos(v_lat1) * cos(v_lat2) * sin(v_dlon / 2) ^ 2;
  v_distance := 2 * 6371000 * asin(least(1, sqrt(v_a)));

  v_accuracy_grace := least(20, p_accuracy_meters);
  IF v_distance > v_location.radius_meters + v_accuracy_grace THEN
    RETURN QUERY SELECT false, 'too_far'::text, v_distance, NULL::bigint,
      NULL::text, NULL::text, NULL::explore_collectible_rarity, NULL::text,
      NULL::boolean, NULL::integer, NULL::integer, NULL::integer, NULL::boolean, NULL::boolean;
    RETURN;
  END IF;

  -- 5. Rate limit: block rapid replayed calls. Revisiting the *same* location later is fine
  -- and expected (duplicates are part of the design) -- this only blocks scripted spam.
  SELECT count(*) INTO v_recent_visits
  FROM public.explore_visits
  WHERE profile_id = p_profile_id AND created_at > now() - interval '10 seconds';

  IF v_recent_visits > 0 THEN
    RETURN QUERY SELECT false, 'rate_limited'::text, v_distance, NULL::bigint,
      NULL::text, NULL::text, NULL::explore_collectible_rarity, NULL::text,
      NULL::boolean, NULL::integer, NULL::integer, NULL::integer, NULL::boolean, NULL::boolean;
    RETURN;
  END IF;

  -- 6. Weighted random draw from the whole active catalog (global, not location-scoped --
  -- any of the 100 cards can turn up at any location).
  SELECT sum(weight) INTO v_total_weight
  FROM public.explore_collectibles
  WHERE is_active = true;

  IF v_total_weight IS NULL OR v_total_weight <= 0 THEN
    RETURN QUERY SELECT false, 'no_collectibles_configured'::text, v_distance, NULL::bigint,
      NULL::text, NULL::text, NULL::explore_collectible_rarity, NULL::text,
      NULL::boolean, NULL::integer, NULL::integer, NULL::integer, NULL::boolean, NULL::boolean;
    RETURN;
  END IF;

  v_roll := random() * v_total_weight;

  SELECT t.id INTO v_collectible_id
  FROM (
    SELECT id, sum(weight) OVER (ORDER BY id) AS cum_weight
    FROM public.explore_collectibles
    WHERE is_active = true
  ) t
  WHERE t.cum_weight >= v_roll
  ORDER BY t.cum_weight
  LIMIT 1;

  SELECT * INTO v_collectible
  FROM public.explore_collectibles
  WHERE id = v_collectible_id;

  -- 6b. Independent shiny (foil) roll -- orthogonal to which card was drawn and its rarity.
  -- ~1-in-12.5; tune later once actual pull rates are observed.
  v_is_shiny := random() < 0.08;

  SELECT first_shiny_discovered_at IS NOT NULL INTO v_had_shiny_before
  FROM public.explore_profile_collectibles
  WHERE profile_id = p_profile_id AND collectible_id = v_collectible.id;

  v_is_first_shiny := v_is_shiny AND NOT COALESCE(v_had_shiny_before, false);

  -- 7. Upsert inventory. `xmax = 0` distinguishes a fresh insert from an ON CONFLICT update.
  INSERT INTO public.explore_profile_collectibles (
    profile_id, collectible_id, count, first_discovered_location_id, first_shiny_discovered_at
  )
  VALUES (
    p_profile_id, v_collectible.id, 1, p_location_id,
    CASE WHEN v_is_shiny THEN now() ELSE NULL END
  )
  ON CONFLICT (profile_id, collectible_id) DO UPDATE
  SET count = public.explore_profile_collectibles.count + 1,
    updated_at = now(),
    first_shiny_discovered_at = COALESCE(
      public.explore_profile_collectibles.first_shiny_discovered_at,
      CASE WHEN v_is_shiny THEN now() ELSE NULL END
    )
  RETURNING count, (xmax = 0) INTO v_new_count, v_is_new;

  -- 8. XP award, fixed per-rarity table for v1
  v_xp_awarded := CASE v_collectible.rarity
    WHEN 'common' THEN 5
    WHEN 'uncommon' THEN 10
    WHEN 'rare' THEN 20
    WHEN 'epic' THEN 40
    WHEN 'legendary' THEN 80
    ELSE 5
  END;

  UPDATE public.profiles
  SET xp = xp + v_xp_awarded
  WHERE id = p_profile_id
  RETURNING xp INTO v_new_profile_xp;

  -- 9. Visit log
  INSERT INTO public.explore_visits (
    profile_id, location_id, collectible_id, is_new_collectible, is_shiny,
    submitted_latitude, submitted_longitude, submitted_accuracy_meters,
    distance_meters, xp_awarded
  )
  VALUES (
    p_profile_id, p_location_id, v_collectible.id, v_is_new, v_is_shiny,
    p_latitude, p_longitude, p_accuracy_meters,
    v_distance, v_xp_awarded
  );

  -- 10. Success
  RETURN QUERY SELECT
    true, NULL::text, v_distance, v_collectible.id,
    v_collectible.name, v_collectible.image_url, v_collectible.rarity, v_collectible.flavor_text,
    v_is_new, v_new_count, v_xp_awarded, v_new_profile_xp,
    v_is_shiny, v_is_first_shiny;
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_to_explore_location(bigint, bigint, double precision, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_to_explore_location(bigint, bigint, double precision, double precision, double precision) TO authenticated;
