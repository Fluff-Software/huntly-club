-- Badge v1: admin-managed badges, manual grants, and progress RPCs

ALTER TABLE public.badges
ADD COLUMN IF NOT EXISTS badge_type text NOT NULL DEFAULT 'milestone'
  CHECK (badge_type IN ('milestone', 'manual')),
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS is_hidden_until_awarded boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sort_group text NOT NULL DEFAULT 'General',
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.user_badges
ADD COLUMN IF NOT EXISTS grant_type text NOT NULL DEFAULT 'auto'
  CHECK (grant_type IN ('auto', 'manual')),
ADD COLUMN IF NOT EXISTS granted_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS grant_reason text;

CREATE INDEX IF NOT EXISTS badges_active_sort_idx
  ON public.badges (is_active, sort_group, sort_order, requirement_value);

CREATE INDEX IF NOT EXISTS user_badges_profile_badge_idx
  ON public.user_badges (profile_id, badge_id);

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

  RETURN 0;
END;
$$;

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
      VALUES (
        v_profile_user_id,
        p_profile_id,
        v_badge.id,
        now(),
        'auto'
      )
      ON CONFLICT (user_id, profile_id, badge_id) DO NOTHING;

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
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_badge_to_profile(
  p_profile_id bigint,
  p_badge_id bigint,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (
  user_badge_id bigint,
  badge_id bigint,
  profile_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_target_user_id uuid;
  v_user_badge_id bigint;
BEGIN
  SELECT p.user_id INTO v_target_user_id
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  INSERT INTO public.user_badges (
    user_id,
    profile_id,
    badge_id,
    grant_type,
    granted_by,
    grant_reason,
    earned_at
  )
  VALUES (
    v_target_user_id,
    p_profile_id,
    p_badge_id,
    'manual',
    v_auth_user_id,
    NULLIF(trim(COALESCE(p_reason, '')), ''),
    now()
  )
  ON CONFLICT (user_id, profile_id, badge_id) DO UPDATE
  SET
    grant_type = EXCLUDED.grant_type,
    granted_by = EXCLUDED.granted_by,
    grant_reason = EXCLUDED.grant_reason,
    earned_at = COALESCE(public.user_badges.earned_at, EXCLUDED.earned_at)
  RETURNING id INTO v_user_badge_id;

  RETURN QUERY SELECT v_user_badge_id, p_badge_id, p_profile_id;
END;
$$;

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
    AND (
      b.is_hidden_until_awarded = false
      OR ub.id IS NOT NULL
    )
  ORDER BY b.sort_group, b.sort_order, b.requirement_value, b.id;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_and_award_badges(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_badge_to_profile(bigint, bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_profile_badge_progress(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.evaluate_and_award_badges(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_badge_progress(bigint) TO authenticated;
