-- Remove leftover feature/explore schema from the hosted DB.
-- Keeps Step 7 explore_stop_claims + claim_explore_stop / get_explore_claimed_stop_ids.
-- Old objects were applied outside this repo's migration history.

-- 1) Old check-in RPC
DROP FUNCTION IF EXISTS public.check_in_to_explore_location(uuid, double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.check_in_to_explore_location(uuid, double precision, double precision, double precision, boolean);
DROP FUNCTION IF EXISTS public.get_explore_locations_near(double precision, double precision, double precision, integer);

-- Drop any remaining overloads by name (safe if none).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'check_in_to_explore_location',
        'get_explore_locations_near'
      )
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

-- 2) Tables (FK-safe order). Do NOT drop explore_stop_claims.
DROP TABLE IF EXISTS public.explore_visits CASCADE;
DROP TABLE IF EXISTS public.explore_profile_collectibles CASCADE;
DROP TABLE IF EXISTS public.explore_location_collectibles CASCADE;
DROP TABLE IF EXISTS public.explore_collectibles CASCADE;
DROP TABLE IF EXISTS public.explore_collectible_categories CASCADE;
DROP TABLE IF EXISTS public.explore_locations CASCADE;

-- 3) Enum used only by the old card catalogue
DROP TYPE IF EXISTS public.explore_collectible_rarity CASCADE;

-- 4) Restore badge progress helper without explore_* table reads
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

  -- Legacy requirement_type kept as "packs_completed", but this now means
  -- fully completed chapters.
  IF p_requirement_type = 'packs_completed' THEN
    WITH chapter_activity_totals AS (
      SELECT
        ca.chapter_id,
        COUNT(DISTINCT ca.activity_id)::integer AS total_activities
      FROM public.chapter_activities ca
      GROUP BY ca.chapter_id
    ),
    chapter_completed_by_profile AS (
      SELECT
        ca.chapter_id,
        COUNT(DISTINCT ca.activity_id)::integer AS completed_activities
      FROM public.chapter_activities ca
      JOIN public.user_activity_progress uap
        ON uap.activity_id = ca.activity_id
      WHERE uap.profile_id = p_profile_id
        AND uap.completed_at IS NOT NULL
      GROUP BY ca.chapter_id
    )
    SELECT COUNT(*)::integer INTO v_value
    FROM chapter_activity_totals t
    JOIN chapter_completed_by_profile c
      ON c.chapter_id = t.chapter_id
    WHERE t.total_activities > 0
      AND c.completed_activities >= t.total_activities;

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

-- 5) Restore badge requirement_type check without explore-only values
ALTER TABLE public.badges
  DROP CONSTRAINT IF EXISTS badges_requirement_type_check;

ALTER TABLE public.badges
  ADD CONSTRAINT badges_requirement_type_check
  CHECK (requirement_type = ANY (ARRAY[
    'xp_gained'::text,
    'packs_completed'::text,
    'activities_completed'::text,
    'team_xp'::text,
    'team_contribution'::text,
    'activities_by_category'::text
  ]));

-- 6) Storage leftover from feature/explore
-- Direct DELETE on storage.objects/buckets is blocked on hosted Supabase.
-- Empty/remove buckets via Storage API / dashboard after this migration:
--   explore-location-images
--   explore-collectible-images
