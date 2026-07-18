-- Extend the badge system so badges can key off World Exploration progress.

ALTER TABLE badges
DROP CONSTRAINT badges_requirement_type_check;

ALTER TABLE badges
ADD CONSTRAINT badges_requirement_type_check
CHECK (requirement_type = ANY (ARRAY[
  'xp_gained'::text,
  'packs_completed'::text,
  'activities_completed'::text,
  'team_xp'::text,
  'team_contribution'::text,
  'activities_by_category'::text,
  'locations_discovered'::text,
  'collectibles_discovered'::text,
  'collectibles_by_rarity'::text,
  'collectible_duplicates'::text
]));

CREATE OR REPLACE FUNCTION public.get_profile_stat_value(
  p_profile_id bigint,
  p_requirement_type text,
  p_requirement_category text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_value integer := 0;
  v_team_id bigint;
  v_category_id bigint;
BEGIN
  IF p_requirement_type = 'xp_gained' THEN
    SELECT COALESCE(p.xp, 0) INTO v_value
    FROM public.profiles p
    WHERE p.id = p_profile_id;
    RETURN COALESCE(v_value, 0);
  END IF;

  IF p_requirement_type = 'team_contribution' THEN
    SELECT COALESCE(p.team_contribution, 0) INTO v_value
    FROM public.profiles p
    WHERE p.id = p_profile_id;
    RETURN COALESCE(v_value, 0);
  END IF;

  IF p_requirement_type = 'team_xp' THEN
    SELECT ud.team INTO v_team_id
    FROM public.profiles p
    JOIN public.user_data ud ON ud.user_id = p.user_id
    WHERE p.id = p_profile_id;

    IF v_team_id IS NULL THEN
      RETURN 0;
    END IF;

    SELECT COALESCE(t.team_xp, 0) INTO v_value
    FROM public.teams t
    WHERE t.id = v_team_id;
    RETURN COALESCE(v_value, 0);
  END IF;

  IF p_requirement_type = 'packs_completed' THEN
    SELECT COUNT(DISTINCT a.pack_id)::integer INTO v_value
    FROM public.user_activity_progress uap
    JOIN public.activities a ON a.id = uap.activity_id
    WHERE uap.profile_id = p_profile_id
      AND uap.completed_at IS NOT NULL
      AND a.pack_id IS NOT NULL;
    RETURN COALESCE(v_value, 0);
  END IF;

  IF p_requirement_type = 'activities_completed' THEN
    SELECT COUNT(*)::integer INTO v_value
    FROM public.user_activity_progress uap
    WHERE uap.profile_id = p_profile_id
      AND uap.completed_at IS NOT NULL;
    RETURN COALESCE(v_value, 0);
  END IF;

  IF p_requirement_type = 'activities_by_category' THEN
    v_category_id := NULLIF(trim(p_requirement_category), '')::bigint;

    IF v_category_id IS NULL THEN
      RETURN 0;
    END IF;

    SELECT COUNT(*)::integer INTO v_value
    FROM public.user_activity_progress uap
    JOIN public.activities a ON a.id = uap.activity_id
    WHERE uap.profile_id = p_profile_id
      AND uap.completed_at IS NOT NULL
      AND COALESCE(a.categories, '[]'::jsonb) @> jsonb_build_array(v_category_id);
    RETURN COALESCE(v_value, 0);
  END IF;

  IF p_requirement_type = 'locations_discovered' THEN
    SELECT COUNT(DISTINCT location_id)::integer INTO v_value
    FROM public.explore_visits
    WHERE profile_id = p_profile_id;
    RETURN COALESCE(v_value, 0);
  END IF;

  IF p_requirement_type = 'collectibles_discovered' THEN
    SELECT COUNT(*)::integer INTO v_value
    FROM public.explore_profile_collectibles
    WHERE profile_id = p_profile_id;
    RETURN COALESCE(v_value, 0);
  END IF;

  IF p_requirement_type = 'collectibles_by_rarity' THEN
    IF p_requirement_category IS NULL OR trim(p_requirement_category) = '' THEN
      RETURN 0;
    END IF;

    SELECT COUNT(*)::integer INTO v_value
    FROM public.explore_profile_collectibles epc
    JOIN public.explore_collectibles ec ON ec.id = epc.collectible_id
    WHERE epc.profile_id = p_profile_id
      AND ec.rarity::text = trim(p_requirement_category);
    RETURN COALESCE(v_value, 0);
  END IF;

  IF p_requirement_type = 'collectible_duplicates' THEN
    SELECT COALESCE(SUM(count - 1), 0)::integer INTO v_value
    FROM public.explore_profile_collectibles
    WHERE profile_id = p_profile_id;
    RETURN COALESCE(v_value, 0);
  END IF;

  RETURN 0;
END;
$$;
