-- Fix ambiguous "badge_id" reference inside PL/pgSQL badge award functions.
-- Also avoids ON CONFLICT column-list parsing ambiguity by using explicit
-- insert-or-update logic.

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

  SELECT ub.id
  INTO v_user_badge_id
  FROM public.user_badges ub
  WHERE ub.user_id = v_target_user_id
    AND ub.profile_id = p_profile_id
    AND ub.badge_id = p_badge_id
  LIMIT 1;

  IF v_user_badge_id IS NULL THEN
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
    RETURNING id INTO v_user_badge_id;
  ELSE
    UPDATE public.user_badges ub
    SET
      grant_type = 'manual',
      granted_by = v_auth_user_id,
      grant_reason = NULLIF(trim(COALESCE(p_reason, '')), ''),
      earned_at = COALESCE(ub.earned_at, now())
    WHERE ub.id = v_user_badge_id;
  END IF;

  RETURN QUERY SELECT v_user_badge_id, p_badge_id, p_profile_id;
END;
$$;

