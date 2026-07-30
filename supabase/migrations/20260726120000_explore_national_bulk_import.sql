-- Step 10.5: National catalogue bulk import staging, import jobs, inactive benchmark RPC,
-- and gated national activation (retires Stoke). Does not activate anything by itself.

-- ---------------------------------------------------------------------------
-- Import jobs (service_role / SECURITY DEFINER only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.explore_catalogue_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id text NOT NULL,
  catalogue_build_id text NOT NULL,
  catalogue_version_id bigint
    REFERENCES public.explore_point_catalogue_versions (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'preflight_ok', 'staging', 'validating', 'finalising',
      'ready', 'failed', 'cleaned'
    )),
  expected_point_count integer NOT NULL CHECK (expected_point_count > 0),
  staged_point_count integer NOT NULL DEFAULT 0 CHECK (staged_point_count >= 0),
  final_point_count integer NOT NULL DEFAULT 0 CHECK (final_point_count >= 0),
  source_revision text NOT NULL,
  generator_config_hash text NOT NULL,
  ndjson_sha256 text NOT NULL,
  ndjson_bytes bigint,
  points_by_type jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_reason text,
  started_at timestamptz,
  staging_completed_at timestamptz,
  completed_at timestamptz,
  cleaned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS explore_catalogue_import_jobs_region_status_idx
  ON public.explore_catalogue_import_jobs (region_id, status);

CREATE INDEX IF NOT EXISTS explore_catalogue_import_jobs_build_idx
  ON public.explore_catalogue_import_jobs (catalogue_build_id);

COMMENT ON TABLE public.explore_catalogue_import_jobs IS
  'National (and future) catalogue bulk-import job tracking. Service role only.';

ALTER TABLE public.explore_catalogue_import_jobs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.explore_catalogue_import_jobs TO service_role;
-- No authenticated policies — not user-visible.

-- ---------------------------------------------------------------------------
-- Staging points (ephemeral; never queried by nearby)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.explore_points_import_staging (
  import_job_id uuid NOT NULL
    REFERENCES public.explore_catalogue_import_jobs (id) ON DELETE CASCADE,
  id text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  point_type smallint NOT NULL,
  generation_version integer NOT NULL,
  source_revision text NOT NULL,
  source_type text NOT NULL,
  source_feature_id text,
  confidence real,
  environment_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (import_job_id, id),
  CONSTRAINT explore_staging_lat_range CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT explore_staging_lon_range CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT explore_staging_type_known CHECK (point_type BETWEEN 1 AND 11)
);

CREATE INDEX IF NOT EXISTS explore_points_import_staging_job_idx
  ON public.explore_points_import_staging (import_job_id);

COMMENT ON TABLE public.explore_points_import_staging IS
  'Temporary COPY target for national catalogue import. Not used by nearby RPCs.';

ALTER TABLE public.explore_points_import_staging ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.explore_points_import_staging TO service_role;

-- ---------------------------------------------------------------------------
-- Catalogue version metadata helpers (optional columns via metadata jsonb —
-- keep schema minimal; document expected metadata keys in docs)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Trusted inactive catalogue nearby benchmark (service_role only)
-- ---------------------------------------------------------------------------
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
-- Explicitly NOT granted to authenticated / anon.

COMMENT ON FUNCTION public.get_explore_points_nearby_for_catalogue IS
  'Service-role-only nearby query for a specific catalogue version (incl. inactive ready). Not for mobile clients.';

-- ---------------------------------------------------------------------------
-- Finalise import: staging → explore_points (atomic), mark ready, inactive
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalise_explore_catalogue_import(
  p_import_job_id uuid,
  p_expected_count integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.explore_catalogue_import_jobs%ROWTYPE;
  v_staged integer;
  v_version_id bigint;
  v_final integer;
  v_dup integer;
BEGIN
  SELECT * INTO v_job
  FROM public.explore_catalogue_import_jobs
  WHERE id = p_import_job_id
  FOR UPDATE;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'import_job_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_job.status NOT IN ('staging', 'validating', 'finalising') THEN
    RAISE EXCEPTION 'import_job_bad_status:%', v_job.status USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*)::integer INTO v_staged
  FROM public.explore_points_import_staging
  WHERE import_job_id = p_import_job_id;

  IF v_staged <> p_expected_count THEN
    UPDATE public.explore_catalogue_import_jobs
    SET status = 'failed',
        failure_reason = format('staged_count_mismatch:got=%s expected=%s', v_staged, p_expected_count),
        staged_point_count = v_staged,
        updated_at = now()
    WHERE id = p_import_job_id;

    IF v_job.catalogue_version_id IS NOT NULL THEN
      UPDATE public.explore_point_catalogue_versions
      SET status = 'failed',
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('import_failed', true)
      WHERE id = v_job.catalogue_version_id
        AND status IN ('building', 'validating');
    END IF;

    RAISE EXCEPTION 'staged_count_mismatch' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*)::integer INTO v_dup
  FROM (
    SELECT id
    FROM public.explore_points_import_staging
    WHERE import_job_id = p_import_job_id
    GROUP BY id
    HAVING count(*) > 1
  ) d;

  IF v_dup > 0 THEN
    UPDATE public.explore_catalogue_import_jobs
    SET status = 'failed',
        failure_reason = format('duplicate_ids_in_staging:%s', v_dup),
        updated_at = now()
    WHERE id = p_import_job_id;
    RAISE EXCEPTION 'duplicate_ids_in_staging' USING ERRCODE = 'P0001';
  END IF;

  v_version_id := v_job.catalogue_version_id;
  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'catalogue_version_missing' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.explore_catalogue_import_jobs
  SET status = 'finalising',
      staged_point_count = v_staged,
      updated_at = now()
  WHERE id = p_import_job_id;

  -- Replace any previous points for this version (safe rerun).
  DELETE FROM public.explore_points WHERE catalogue_version_id = v_version_id;

  INSERT INTO public.explore_points (
    id,
    catalogue_version_id,
    latitude,
    longitude,
    point_type,
    generation_version,
    source_revision,
    active,
    source_type,
    source_feature_id,
    confidence,
    environment_profile
  )
  SELECT
    s.id,
    v_version_id,
    s.latitude,
    s.longitude,
    s.point_type,
    s.generation_version,
    s.source_revision,
    true,
    s.source_type,
    s.source_feature_id,
    s.confidence,
    s.environment_profile
  FROM public.explore_points_import_staging s
  WHERE s.import_job_id = p_import_job_id;

  SELECT count(*)::integer INTO v_final
  FROM public.explore_points
  WHERE catalogue_version_id = v_version_id;

  IF v_final <> p_expected_count THEN
    DELETE FROM public.explore_points WHERE catalogue_version_id = v_version_id;
    UPDATE public.explore_catalogue_import_jobs
    SET status = 'failed',
        failure_reason = format('final_count_mismatch:got=%s expected=%s', v_final, p_expected_count),
        final_point_count = v_final,
        updated_at = now()
    WHERE id = p_import_job_id;
    UPDATE public.explore_point_catalogue_versions
    SET status = 'failed'
    WHERE id = v_version_id;
    RAISE EXCEPTION 'final_count_mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- Ready but NEVER active.
  UPDATE public.explore_point_catalogue_versions
  SET status = 'ready',
      point_count = v_final,
      activated_at = null,
      retired_at = null,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'import_job_id', p_import_job_id,
        'imported_at', now(),
        'active', false
      )
  WHERE id = v_version_id;

  DELETE FROM public.explore_points_import_staging WHERE import_job_id = p_import_job_id;

  UPDATE public.explore_catalogue_import_jobs
  SET status = 'ready',
      staged_point_count = v_staged,
      final_point_count = v_final,
      completed_at = now(),
      cleaned_at = now(),
      updated_at = now(),
      failure_reason = null
  WHERE id = p_import_job_id;

  RETURN jsonb_build_object(
    'ok', true,
    'import_job_id', p_import_job_id,
    'catalogue_version_id', v_version_id,
    'final_point_count', v_final,
    'status', 'ready',
    'active', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalise_explore_catalogue_import(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalise_explore_catalogue_import(uuid, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- Cleanup abandoned staging for a job
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_explore_catalogue_import(
  p_import_job_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.explore_points_import_staging
  WHERE import_job_id = p_import_job_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  UPDATE public.explore_catalogue_import_jobs
  SET status = CASE WHEN status IN ('ready') THEN status ELSE 'cleaned' END,
      cleaned_at = now(),
      updated_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('staging_rows_deleted', v_deleted)
  WHERE id = p_import_job_id;

  RETURN jsonb_build_object('ok', true, 'deleted_staging_rows', v_deleted);
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_explore_catalogue_import(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_explore_catalogue_import(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- National activation: activate UK+ROI and retire Stoke (same transaction).
-- Requires caller confirmation at CLI (--confirm-activate). Service role only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_explore_national_catalogue(
  p_catalogue_version_id bigint,
  p_confirm boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_region text;
  v_status text;
  v_count integer;
  v_stoke_id bigint;
BEGIN
  IF coalesce(p_confirm, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'activation_not_confirmed' USING ERRCODE = 'P0001';
  END IF;

  SELECT region_id, status, point_count
  INTO v_region, v_status, v_count
  FROM public.explore_point_catalogue_versions
  WHERE id = p_catalogue_version_id;

  IF v_region IS NULL OR v_region <> 'uk-and-ireland' THEN
    RAISE EXCEPTION 'not_national_catalogue' USING ERRCODE = 'P0001';
  END IF;

  IF v_status <> 'ready' THEN
    RAISE EXCEPTION 'catalogue_not_ready' USING ERRCODE = 'P0001';
  END IF;

  -- Retire any active Stoke catalogue(s).
  UPDATE public.explore_point_catalogue_versions
  SET status = 'retired',
      retired_at = now()
  WHERE region_id = 'stoke-on-trent'
    AND status = 'active';

  -- Retire other active national versions if any.
  UPDATE public.explore_point_catalogue_versions
  SET status = 'retired',
      retired_at = now()
  WHERE region_id = 'uk-and-ireland'
    AND status = 'active'
    AND id <> p_catalogue_version_id;

  UPDATE public.explore_point_catalogue_versions
  SET status = 'active',
      activated_at = now(),
      retired_at = null
  WHERE id = p_catalogue_version_id;

  SELECT id INTO v_stoke_id
  FROM public.explore_point_catalogue_versions
  WHERE region_id = 'stoke-on-trent' AND status = 'active'
  LIMIT 1;

  IF v_stoke_id IS NOT NULL THEN
    RAISE EXCEPTION 'stoke_still_active' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'catalogue_version_id', p_catalogue_version_id,
    'region_id', v_region,
    'point_count', v_count,
    'stoke_retired', true,
    'national_active', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_explore_national_catalogue(bigint, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_explore_national_catalogue(bigint, boolean) TO service_role;

-- Storage measurement helper (service_role)
CREATE OR REPLACE FUNCTION public.explore_catalogue_storage_stats(
  p_catalogue_version_id bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points_total bigint;
  v_points_version bigint;
  v_avg_env double precision;
  v_p95_env double precision;
BEGIN
  SELECT count(*) INTO v_points_total FROM public.explore_points;
  IF p_catalogue_version_id IS NOT NULL THEN
    SELECT count(*) INTO v_points_version
    FROM public.explore_points WHERE catalogue_version_id = p_catalogue_version_id;

    SELECT avg(pg_column_size(environment_profile))::double precision,
           percentile_cont(0.95) WITHIN GROUP (ORDER BY pg_column_size(environment_profile))
    INTO v_avg_env, v_p95_env
    FROM public.explore_points
    WHERE catalogue_version_id = p_catalogue_version_id;
  END IF;

  RETURN jsonb_build_object(
    'explore_points_total_rows', v_points_total,
    'explore_points_version_rows', v_points_version,
    'explore_points_table_bytes', pg_total_relation_size('public.explore_points'),
    'explore_points_relation_bytes', pg_relation_size('public.explore_points'),
    'explore_points_indexes_bytes', pg_indexes_size('public.explore_points'),
    'explore_points_toast_bytes', pg_total_relation_size('public.explore_points')
      - pg_relation_size('public.explore_points') - pg_indexes_size('public.explore_points'),
    'gist_index_bytes', pg_relation_size('public.explore_points_location_gix'),
    'catalogue_versions_bytes', pg_total_relation_size('public.explore_point_catalogue_versions'),
    'staging_bytes', CASE
      WHEN to_regclass('public.explore_points_import_staging') IS NOT NULL
      THEN pg_total_relation_size('public.explore_points_import_staging')
      ELSE 0
    END,
    'env_profile_avg_bytes', v_avg_env,
    'env_profile_p95_bytes', v_p95_env,
    'note', 'GiST index size is shared across all catalogue versions; version share is estimated by row ratio when needed.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.explore_catalogue_storage_stats(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.explore_catalogue_storage_stats(bigint) TO service_role;
