-- Fix packs_completed progress calculation for current schema.
-- activities.pack_id no longer exists; use chapter_activities.chapter_id.

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
  v_trimmed_category text;
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
    SELECT COUNT(DISTINCT ca.chapter_id)::integer INTO v_value
    FROM public.user_activity_progress uap
    JOIN public.chapter_activities ca ON ca.activity_id = uap.activity_id
    WHERE uap.profile_id = p_profile_id
      AND uap.completed_at IS NOT NULL;
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
    v_trimmed_category := NULLIF(trim(COALESCE(p_requirement_category, '')), '');
    IF v_trimmed_category IS NULL THEN
      RETURN 0;
    END IF;

    IF v_trimmed_category ~ '^[0-9]+$' THEN
      v_category_id := v_trimmed_category::bigint;
    ELSE
      SELECT c.id INTO v_category_id
      FROM public.categories c
      WHERE lower(c.name) = lower(v_trimmed_category)
      LIMIT 1;
    END IF;

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

  RETURN 0;
END;
$$;
