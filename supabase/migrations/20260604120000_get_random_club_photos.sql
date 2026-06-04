-- Bounded random club feed: recent photo pool + random pick (avoids loading all approved photos on the client).

CREATE INDEX IF NOT EXISTS user_activity_photos_club_feed_idx
  ON public.user_activity_photos (photo_id DESC)
  WHERE status = 1 AND activity_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_random_club_photos(
  p_count integer DEFAULT 6,
  p_exclude_ids bigint[] DEFAULT '{}'
)
RETURNS TABLE (
  photo_id bigint,
  photo_url text,
  profile_id bigint,
  activity_title text,
  nickname text,
  team_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH pool AS (
    SELECT p.photo_id, p.photo_url, p.profile_id, p.activity_id
    FROM public.user_activity_photos p
    WHERE p.status = 1
      AND p.activity_id IS NOT NULL
      AND (
        cardinality(p_exclude_ids) = 0
        OR NOT (p.photo_id = ANY (p_exclude_ids))
      )
    ORDER BY p.photo_id DESC
    LIMIT GREATEST(p_count * 12, 72)
  ),
  picked AS (
    SELECT pool.photo_id, pool.photo_url, pool.profile_id, pool.activity_id
    FROM pool
    ORDER BY random()
    LIMIT GREATEST(p_count, 0)
  )
  SELECT
    pk.photo_id,
    pk.photo_url,
    pk.profile_id,
    COALESCE(a.title, '')::text AS activity_title,
    COALESCE(pp.nickname, '')::text AS nickname,
    COALESCE(lower(pp.team_name::text), '')::text AS team_name
  FROM picked pk
  LEFT JOIN public.activities a ON a.id = pk.activity_id
  LEFT JOIN public.profile_public pp ON pp.id = pk.profile_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_random_club_photos(integer, bigint[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_random_club_photos(integer, bigint[]) TO service_role;
