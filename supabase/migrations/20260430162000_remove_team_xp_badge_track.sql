-- Deprecate team-wide XP badges.
-- Users should only earn team-related badges from individual contribution.

-- 1) Deactivate existing team_xp badges so they no longer appear in badge lists.
UPDATE public.badges
SET is_active = false
WHERE requirement_type = 'team_xp';

-- 2) Ensure team_xp badges are excluded from awarding logic.
CREATE OR REPLACE FUNCTION public.evaluate_and_award_badges(
  p_profile_id bigint
)
RETURNS TABLE (
  badge_id bigint,
  name text,
  description text,
  image_url text,
  category text,
  requirement_type text,
  requirement_value integer,
  requirement_category text,
  badge_type text,
  sort_group text,
  sort_order integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_profile_user_id uuid;
  v_badge record;
  v_current integer;
  v_inserted_count integer;
BEGIN
  SELECT p.user_id INTO v_profile_user_id
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  IF v_profile_user_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_auth_user_id IS NOT NULL AND v_auth_user_id <> v_profile_user_id THEN
    RAISE EXCEPTION 'Not authorized for this profile';
  END IF;

  FOR v_badge IN
    SELECT b.*
    FROM public.badges b
    WHERE b.is_active = true
      AND b.badge_type = 'milestone'
      AND b.requirement_type <> 'team_xp'
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_badges ub
        WHERE ub.profile_id = p_profile_id
          AND ub.badge_id = b.id
      )
  LOOP
    v_current := public.get_profile_stat_value(
      p_profile_id,
      v_badge.requirement_type,
      v_badge.requirement_category
    );

    IF v_current >= COALESCE(v_badge.requirement_value, 0) THEN
      INSERT INTO public.user_badges (
        user_id,
        profile_id,
        badge_id,
        earned_at,
        grant_type
      )
      SELECT
        v_profile_user_id,
        p_profile_id,
        v_badge.id,
        now(),
        'auto'
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.user_badges ub2
        WHERE ub2.user_id = v_profile_user_id
          AND ub2.profile_id = p_profile_id
          AND ub2.badge_id = v_badge.id
      );

      GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

      IF v_inserted_count > 0 THEN
        RETURN QUERY
        SELECT
          v_badge.id,
          v_badge.name,
          v_badge.description,
          v_badge.image_url,
          v_badge.category,
          v_badge.requirement_type,
          v_badge.requirement_value,
          v_badge.requirement_category,
          v_badge.badge_type,
          v_badge.sort_group,
          v_badge.sort_order;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- 3) Ensure progress RPC never returns team_xp badges.
CREATE OR REPLACE FUNCTION public.get_profile_badge_progress(
  p_profile_id bigint
)
RETURNS TABLE (
  badge_id bigint,
  name text,
  description text,
  image_url text,
  category text,
  requirement_type text,
  requirement_value integer,
  requirement_category text,
  badge_type text,
  is_active boolean,
  is_hidden_until_awarded boolean,
  sort_group text,
  sort_order integer,
  earned boolean,
  earned_at timestamptz,
  progress_value integer,
  progress_percent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_profile_user_id uuid;
BEGIN
  SELECT p.user_id INTO v_profile_user_id
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  IF v_profile_user_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_auth_user_id IS NOT NULL AND v_auth_user_id <> v_profile_user_id THEN
    RAISE EXCEPTION 'Not authorized for this profile';
  END IF;

  RETURN QUERY
  SELECT
    b.id AS badge_id,
    b.name,
    b.description,
    b.image_url,
    b.category,
    b.requirement_type,
    b.requirement_value,
    b.requirement_category,
    b.badge_type,
    b.is_active,
    b.is_hidden_until_awarded,
    b.sort_group,
    b.sort_order,
    (ub.id IS NOT NULL) AS earned,
    ub.earned_at,
    public.get_profile_stat_value(
      p_profile_id,
      b.requirement_type,
      b.requirement_category
    ) AS progress_value,
    LEAST(
      100,
      CASE
        WHEN COALESCE(b.requirement_value, 0) <= 0 THEN 0
        ELSE (
          public.get_profile_stat_value(
            p_profile_id,
            b.requirement_type,
            b.requirement_category
          )::numeric / b.requirement_value::numeric
        ) * 100
      END
    ) AS progress_percent
  FROM public.badges b
  LEFT JOIN public.user_badges ub
    ON ub.badge_id = b.id
    AND ub.profile_id = p_profile_id
  WHERE b.is_active = true
    AND b.requirement_type <> 'team_xp'
    AND (
      b.is_hidden_until_awarded = false
      OR ub.id IS NOT NULL
    )
  ORDER BY b.sort_group, b.sort_order, b.requirement_value, b.id;
END;
$$;

