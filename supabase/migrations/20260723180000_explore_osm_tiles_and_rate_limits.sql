-- Step 10.2: Explore OSM tile jobs + database-backed rate limits.
-- Private Storage bucket for canonical OSM source tiles.
-- No user coordinates are stored in these tables.

-- ---------------------------------------------------------------------------
-- Storage bucket (private — service role / trusted tooling only)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'explore-osm-source',
  'explore-osm-source',
  false,
  10485760, -- 10 MB per object
  ARRAY['application/json', 'application/geo+json']
)
ON CONFLICT (id) DO NOTHING;

-- No public policies: mobile must not read/write OSM tiles directly.
-- Service role bypasses RLS.

-- ---------------------------------------------------------------------------
-- Tile preparation jobs (concurrency control)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.explore_osm_tile_jobs (
  revision text NOT NULL,
  tile_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('preparing', 'ready', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_error text,
  retry_after timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (revision, tile_id)
);

COMMENT ON TABLE public.explore_osm_tile_jobs IS
  'Concurrency control for on-demand OSM tile preparation. Does not store user coordinates.';

CREATE INDEX IF NOT EXISTS explore_osm_tile_jobs_status_idx
  ON public.explore_osm_tile_jobs (status, started_at);

ALTER TABLE public.explore_osm_tile_jobs ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated/anon — service role only.

CREATE OR REPLACE FUNCTION public.explore_acquire_osm_tile_job(
  p_revision text,
  p_tile_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing public.explore_osm_tile_jobs%ROWTYPE;
  stale_before timestamptz := now() - interval '2 minutes';
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO existing
  FROM public.explore_osm_tile_jobs
  WHERE revision = p_revision AND tile_id = p_tile_id
  FOR UPDATE;

  IF FOUND THEN
    IF existing.status = 'ready' THEN
      RETURN jsonb_build_object('status', 'ready');
    END IF;
    IF existing.status = 'preparing' AND existing.started_at > stale_before THEN
      RETURN jsonb_build_object(
        'status', 'busy',
        'retry_after_seconds', 10
      );
    END IF;
    -- Stale preparing or failed → re-acquire
    UPDATE public.explore_osm_tile_jobs
    SET status = 'preparing',
        started_at = now(),
        completed_at = NULL,
        last_error = NULL,
        retry_after = now() + interval '10 seconds',
        updated_at = now()
    WHERE revision = p_revision AND tile_id = p_tile_id;
    RETURN jsonb_build_object('status', 'acquired');
  END IF;

  INSERT INTO public.explore_osm_tile_jobs (revision, tile_id, status, retry_after)
  VALUES (p_revision, p_tile_id, 'preparing', now() + interval '10 seconds');

  RETURN jsonb_build_object('status', 'acquired');
END;
$$;

CREATE OR REPLACE FUNCTION public.explore_complete_osm_tile_job(
  p_revision text,
  p_tile_id text,
  p_ok boolean,
  p_last_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.explore_osm_tile_jobs
  SET status = CASE WHEN p_ok THEN 'ready' ELSE 'failed' END,
      completed_at = now(),
      last_error = CASE WHEN p_ok THEN NULL ELSE p_last_error END,
      updated_at = now()
  WHERE revision = p_revision AND tile_id = p_tile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.explore_acquire_osm_tile_job(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.explore_complete_osm_tile_job(text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.explore_acquire_osm_tile_job(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.explore_complete_osm_tile_job(text, text, boolean, text) TO service_role;

-- ---------------------------------------------------------------------------
-- Rate limits (no coordinates)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.explore_rate_limits (
  subject_id text NOT NULL,
  category text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_id, category, window_start)
);

COMMENT ON TABLE public.explore_rate_limits IS
  'Explore API rate-limit counters by user (or global) and route category. No location history.';

CREATE INDEX IF NOT EXISTS explore_rate_limits_window_idx
  ON public.explore_rate_limits (window_start);

ALTER TABLE public.explore_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.explore_check_rate_limit(
  p_subject_id text,
  p_category text,
  p_window_start timestamptz,
  p_limit integer,
  p_window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO public.explore_rate_limits (subject_id, category, window_start, request_count)
  VALUES (p_subject_id, p_category, p_window_start, 1)
  ON CONFLICT (subject_id, category, window_start)
  DO UPDATE SET
    request_count = public.explore_rate_limits.request_count + 1,
    updated_at = now()
  RETURNING request_count INTO current_count;

  IF current_count > p_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after_seconds', GREATEST(1, p_window_seconds)
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', GREATEST(0, p_limit - current_count)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.explore_cleanup_rate_limits(
  p_older_than interval DEFAULT interval '2 hours'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.explore_rate_limits
  WHERE window_start < now() - p_older_than;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.explore_check_rate_limit(text, text, timestamptz, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.explore_cleanup_rate_limits(interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.explore_check_rate_limit(text, text, timestamptz, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.explore_cleanup_rate_limits(interval) TO service_role;
