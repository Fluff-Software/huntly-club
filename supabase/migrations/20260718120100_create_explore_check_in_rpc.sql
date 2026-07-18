-- World Exploration check-in: the single write path for the whole feature.
--
-- Client-submitted GPS is never trusted for the actual award -- this SECURITY DEFINER function
-- recomputes distance server-side (haversine, mirroring metersBetween() in
-- apps/mobile/services/trackingSessionService.ts) and performs the weighted-random collectible
-- draw atomically, so the spawn pool/weights are never observable or replayable from the client.
--
-- Returns a typed row rather than raising for the common "not close enough" / "too soon" cases --
-- those are expected outcomes the client renders gracefully, not exceptions.

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
  new_profile_xp integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_draw record;
  v_collectible record;
  v_is_new boolean;
  v_new_count integer;
  v_xp_awarded integer;
  v_new_profile_xp integer;
BEGIN
  -- 1. Auth check
  SELECT p.user_id INTO v_profile_user_id
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  IF v_profile_user_id IS NULL OR (v_auth_user_id IS NOT NULL AND v_auth_user_id <> v_profile_user_id) THEN
    RETURN QUERY SELECT false, 'not_authorized'::text, NULL::double precision, NULL::bigint,
      NULL::text, NULL::text, NULL::explore_collectible_rarity, NULL::text,
      NULL::boolean, NULL::integer, NULL::integer, NULL::integer;
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
      NULL::boolean, NULL::integer, NULL::integer, NULL::integer;
    RETURN;
  END IF;

  -- 3. Accuracy check (cheap, before the distance calc)
  IF p_accuracy_meters IS NULL OR p_accuracy_meters > 65 THEN
    RETURN QUERY SELECT false, 'accuracy_too_poor'::text, NULL::double precision, NULL::bigint,
      NULL::text, NULL::text, NULL::explore_collectible_rarity, NULL::text,
      NULL::boolean, NULL::integer, NULL::integer, NULL::integer;
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
      NULL::boolean, NULL::integer, NULL::integer, NULL::integer;
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
      NULL::boolean, NULL::integer, NULL::integer, NULL::integer;
    RETURN;
  END IF;

  -- 6. Weighted random draw from the location's spawn pool
  SELECT sum(elc.weight) INTO v_total_weight
  FROM public.explore_location_collectibles elc
  JOIN public.explore_collectibles ec ON ec.id = elc.collectible_id AND ec.is_active = true
  WHERE elc.location_id = p_location_id;

  IF v_total_weight IS NULL OR v_total_weight <= 0 THEN
    RETURN QUERY SELECT false, 'no_collectibles_configured'::text, v_distance, NULL::bigint,
      NULL::text, NULL::text, NULL::explore_collectible_rarity, NULL::text,
      NULL::boolean, NULL::integer, NULL::integer, NULL::integer;
    RETURN;
  END IF;

  v_roll := random() * v_total_weight;

  SELECT t.collectible_id INTO v_draw
  FROM (
    SELECT
      elc.collectible_id,
      sum(elc.weight) OVER (ORDER BY elc.collectible_id) AS cum_weight
    FROM public.explore_location_collectibles elc
    JOIN public.explore_collectibles ec ON ec.id = elc.collectible_id AND ec.is_active = true
    WHERE elc.location_id = p_location_id
  ) t
  WHERE t.cum_weight >= v_roll
  ORDER BY t.cum_weight
  LIMIT 1;

  SELECT * INTO v_collectible
  FROM public.explore_collectibles
  WHERE id = v_draw.collectible_id;

  -- 7. Upsert inventory. `xmax = 0` distinguishes a fresh insert from an ON CONFLICT update.
  INSERT INTO public.explore_profile_collectibles (
    profile_id, collectible_id, count, first_discovered_location_id
  )
  VALUES (p_profile_id, v_collectible.id, 1, p_location_id)
  ON CONFLICT (profile_id, collectible_id) DO UPDATE
  SET count = public.explore_profile_collectibles.count + 1, updated_at = now()
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
    profile_id, location_id, collectible_id, is_new_collectible,
    submitted_latitude, submitted_longitude, submitted_accuracy_meters,
    distance_meters, xp_awarded
  )
  VALUES (
    p_profile_id, p_location_id, v_collectible.id, v_is_new,
    p_latitude, p_longitude, p_accuracy_meters,
    v_distance, v_xp_awarded
  );

  -- 10. Success
  RETURN QUERY SELECT
    true, NULL::text, v_distance, v_collectible.id,
    v_collectible.name, v_collectible.image_url, v_collectible.rarity, v_collectible.flavor_text,
    v_is_new, v_new_count, v_xp_awarded, v_new_profile_xp;
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_to_explore_location(bigint, bigint, double precision, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_to_explore_location(bigint, bigint, double precision, double precision, double precision) TO authenticated;
