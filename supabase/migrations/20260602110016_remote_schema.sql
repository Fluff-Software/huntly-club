create extension if not exists "pg_cron" with schema "pg_catalog";

drop extension if exists "pgjwt";

drop function if exists "public"."end_campfire_session_live"(target_session_id bigint);

drop function if exists "public"."get_server_now"();

drop function if exists "public"."start_campfire_session_live"(target_session_id bigint);

drop index if exists "public"."campfire_sessions_live_started_at_idx";

drop index if exists "public"."campfire_sessions_scheduled_at_idx";

alter table "public"."campfire_sessions" drop column "live_ended_at";

alter table "public"."campfire_sessions" drop column "live_started_at";

alter table "public"."user_data" add column "first_mission_activity_id" bigint;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.add_team_xp(team_id bigint, xp_amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE teams 
  SET team_xp = team_xp + xp_amount 
  WHERE id = team_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.evaluate_and_award_badges(p_profile_id bigint)
 RETURNS TABLE(badge_id bigint, name text, description text, image_url text, category text, requirement_type text, requirement_value integer, requirement_category text, badge_type text, sort_group text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
          v_badge.sort_group;
      END IF;
    END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_profile_badge_progress(p_profile_id bigint)
 RETURNS TABLE(badge_id bigint, name text, description text, image_url text, category text, requirement_type text, requirement_value integer, requirement_category text, badge_type text, is_active boolean, is_hidden_until_awarded boolean, sort_group text, earned boolean, earned_at timestamp with time zone, progress_value integer, progress_percent numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  ORDER BY b.sort_group, b.requirement_value, b.id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_profile_stat_value(p_profile_id bigint, p_requirement_type text, p_requirement_category text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_push_enabled(p_device_id text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select enabled from push_tokens where device_id = p_device_id limit 1),
    false
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_team_xp(team_id bigint)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_xp integer;
BEGIN
  SELECT team_xp INTO current_xp FROM teams WHERE id = team_id;
  RETURN COALESCE(current_xp, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.grant_badge_to_profile(p_profile_id bigint, p_badge_id bigint, p_reason text DEFAULT NULL::text)
 RETURNS TABLE(user_badge_id bigint, badge_id bigint, profile_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_user_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.user_data (user_id, team, weekly_email)
  values (new.id, null, true);
  return new;
end;
$function$
;

create or replace view "public"."profile_public" as  SELECT id,
    nickname,
    team_name
   FROM public.profile_public_info() profile_public_info(id, nickname, team_name);


CREATE OR REPLACE FUNCTION public.profile_public_info()
 RETURNS TABLE(id bigint, nickname text, team_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.nickname, t.name AS team_name
  FROM profiles p
  LEFT JOIN user_data ud ON ud.user_id = p.user_id
  LEFT JOIN teams t ON t.id = ud.team;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM auth.refresh_tokens WHERE user_id = p_user_id;
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_push_enabled(p_device_id text, p_enabled boolean, p_expo_push_token text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_enabled then
    if p_expo_push_token is null or p_expo_push_token = '' then
      raise exception 'expo_push_token is required when enabling push';
    end if;
    insert into push_tokens (device_id, expo_push_token, enabled, updated_at)
    values (p_device_id, p_expo_push_token, true, now())
    on conflict (device_id) do update set
      expo_push_token = excluded.expo_push_token,
      enabled = true,
      updated_at = excluded.updated_at;
  else
    update push_tokens
    set enabled = false, updated_at = now()
    where device_id = p_device_id;
  end if;
end;
$function$
;


