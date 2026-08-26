-- Clears the Supabase Security Advisor "Security Definer View" warnings for
-- profile_public, scavenger_quests_public, scavenger_quest_groups_public,
-- scavenger_quest_items_public and scavenger_quest_locks_public.
--
-- These views are deliberately privilege-elevated: they expose a narrow,
-- filtered slice of tables that authenticated users have no direct RLS
-- access to (published-only rows, or just id/nickname). The Advisor lint
-- only inspects views, not functions, so we move the elevated-permission
-- read into a SECURITY DEFINER function and make the view itself a plain
-- security_invoker pass-through. Behavior and data exposure are unchanged.

-- ═══════════════════════════════════════════════════════════════════════════
-- profile_public: already backed by profile_public_info() (SECURITY DEFINER),
-- so the view just needs to stop being definer itself.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW "public"."profile_public" WITH (security_invoker = on) AS
  SELECT * FROM "public"."profile_public_info"();

-- ═══════════════════════════════════════════════════════════════════════════
-- scavenger_quests_public
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.scavenger_quests_public_fn()
RETURNS SETOF public.scavenger_quests_public
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    q.id,
    q.name,
    q.description,
    q.cover_image_url,
    q.tile_image_url,
    q.tags,
    q.published,
    q.is_grouped,
    q.lockable,
    q.group_id,
    q.lock_id,
    q.attraction_logo_url,
    q.attraction_colour_hex,
    q.attraction_name,
    q.attraction_bio,
    q.attraction_image_url,
    q.attraction_fun_facts,
    q.attraction_website,
    q.attraction_address,
    q.attraction_lat,
    q.attraction_lng,
    q.on_completion,
    q.created_at,
    q.updated_at
  FROM public.huntly_quests q
  WHERE q.published = true;
$$;

REVOKE EXECUTE ON FUNCTION public.scavenger_quests_public_fn() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scavenger_quests_public_fn() TO authenticated, service_role;

CREATE OR REPLACE VIEW public.scavenger_quests_public
WITH (security_invoker = on, security_barrier = true) AS
SELECT * FROM public.scavenger_quests_public_fn();

-- ═══════════════════════════════════════════════════════════════════════════
-- scavenger_quest_groups_public
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.scavenger_quest_groups_public_fn()
RETURNS SETOF public.scavenger_quest_groups_public
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    g.id,
    g.name,
    g.description,
    g.cover_image_url,
    g.display_order,
    g.tags,
    g.published,
    g.lockable,
    g.lock_id,
    g.on_completion,
    g.created_at,
    g.updated_at
  FROM public.huntly_quest_groups g
  WHERE g.published = true;
$$;

REVOKE EXECUTE ON FUNCTION public.scavenger_quest_groups_public_fn() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scavenger_quest_groups_public_fn() TO authenticated, service_role;

CREATE OR REPLACE VIEW public.scavenger_quest_groups_public
WITH (security_invoker = on, security_barrier = true) AS
SELECT * FROM public.scavenger_quest_groups_public_fn();

-- ═══════════════════════════════════════════════════════════════════════════
-- scavenger_quest_items_public
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.scavenger_quest_items_public_fn()
RETURNS SETOF public.scavenger_quest_items_public
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    i.id,
    i.quest_id,
    i.name,
    i.image_url,
    i.branded,
    i.description,
    i.hint,
    i.tags,
    i.warning,
    i.lat,
    i.lng,
    i.question,
    (i.question IS NOT NULL AND btrim(i.question) <> '') AS has_question,
    i."order",
    i.created_at,
    i.updated_at
  FROM public.huntly_quest_items i
  INNER JOIN public.huntly_quests q ON q.id = i.quest_id
  WHERE q.published = true;
$$;

REVOKE EXECUTE ON FUNCTION public.scavenger_quest_items_public_fn() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scavenger_quest_items_public_fn() TO authenticated, service_role;

CREATE OR REPLACE VIEW public.scavenger_quest_items_public
WITH (security_invoker = on, security_barrier = true) AS
SELECT * FROM public.scavenger_quest_items_public_fn();

-- ═══════════════════════════════════════════════════════════════════════════
-- scavenger_quest_locks_public
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.scavenger_quest_locks_public_fn()
RETURNS SETOF public.scavenger_quest_locks_public
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    l.id,
    l.types,
    l.permanent_unlock,
    l.location_lat,
    l.location_lng,
    l.location_radius,
    ('code' = ANY (l.types)) AS requires_code,
    ('location' = ANY (l.types)) AS requires_location
  FROM public.huntly_quest_locks l
  WHERE l.id IN (
    SELECT q.lock_id FROM public.huntly_quests q
    WHERE q.published = true AND q.lock_id IS NOT NULL
    UNION
    SELECT g.lock_id FROM public.huntly_quest_groups g
    WHERE g.published = true AND g.lock_id IS NOT NULL
  );
$$;

REVOKE EXECUTE ON FUNCTION public.scavenger_quest_locks_public_fn() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scavenger_quest_locks_public_fn() TO authenticated, service_role;

CREATE OR REPLACE VIEW public.scavenger_quest_locks_public
WITH (security_invoker = on, security_barrier = true) AS
SELECT * FROM public.scavenger_quest_locks_public_fn();
