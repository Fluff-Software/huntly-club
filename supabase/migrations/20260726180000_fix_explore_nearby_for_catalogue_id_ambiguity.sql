-- Fix PL/pgSQL ambiguity: RETURNS TABLE (id ...) vs catalogue_versions.id
CREATE OR REPLACE FUNCTION public.get_explore_points_nearby_for_catalogue(
  p_catalogue_version_id bigint,
  p_latitude double precision,
  p_longitude double precision,
  p_radius_metres double precision DEFAULT 1000,
  p_limit_count integer DEFAULT 40
)
RETURNS TABLE (
  id text,
  latitude double precision,
  longitude double precision,
  point_type smallint,
  source_type text,
  generation_version integer,
  source_revision text,
  distance_metres double precision,
  environment_profile jsonb,
  source_feature_id text,
  confidence real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_radius double precision;
  v_limit integer;
  v_origin extensions.geography;
  v_status text;
BEGIN
  IF p_catalogue_version_id IS NULL THEN
    RAISE EXCEPTION 'invalid_catalogue_version' USING ERRCODE = '22023';
  END IF;

  -- Qualify column: RETURNS TABLE (id ...) would make bare `id` ambiguous.
  SELECT cv.status INTO v_status
  FROM public.explore_point_catalogue_versions cv
  WHERE cv.id = p_catalogue_version_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'catalogue_not_found' USING ERRCODE = 'P0001';
  END IF;

  -- Allow ready/active/retired for admin benchmarks; never building/failed.
  IF v_status NOT IN ('ready', 'active', 'retired') THEN
    RAISE EXCEPTION 'catalogue_not_queryable' USING ERRCODE = 'P0001';
  END IF;

  IF p_latitude IS NULL OR p_longitude IS NULL
     OR p_latitude < -90 OR p_latitude > 90
     OR p_longitude < -180 OR p_longitude > 180 THEN
    RAISE EXCEPTION 'invalid_coordinates' USING ERRCODE = '22023';
  END IF;

  v_radius := coalesce(p_radius_metres, 1000);
  IF v_radius <= 0 OR v_radius > 5000 THEN
    RAISE EXCEPTION 'radius_too_large' USING ERRCODE = '22023';
  END IF;

  v_limit := least(greatest(coalesce(p_limit_count, 40), 1), 200);
  v_origin := extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography;

  RETURN QUERY
  SELECT
    ep.id,
    ep.latitude,
    ep.longitude,
    ep.point_type,
    ep.source_type,
    ep.generation_version,
    ep.source_revision,
    extensions.ST_Distance(ep.location, v_origin)::double precision AS distance_metres,
    ep.environment_profile,
    ep.source_feature_id,
    ep.confidence
  FROM public.explore_points ep
  WHERE ep.catalogue_version_id = p_catalogue_version_id
    AND ep.active = true
    AND extensions.ST_DWithin(ep.location, v_origin, v_radius)
  ORDER BY distance_metres ASC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_explore_points_nearby_for_catalogue(
  bigint, double precision, double precision, double precision, integer
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_explore_points_nearby_for_catalogue(
  bigint, double precision, double precision, double precision, integer
) TO service_role;
