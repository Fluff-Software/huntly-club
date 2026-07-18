-- World Exploration: spatial read path for global scale.
--
-- The v1 foundation fetched *every* active location in one query (getActiveLocations() in
-- apps/mobile/services/exploreLocationService.ts). That is fine for a pilot town and collapses
-- the moment locations exist worldwide -- you cannot ship every point on Earth to a child's phone,
-- and the lat/lng btrees can't answer "what's near me" efficiently.
--
-- This migration makes the read path O(nearby) instead of O(world):
--   * a PostGIS geography column on explore_locations, kept in sync by trigger,
--   * a GiST spatial index over it,
--   * get_explore_locations_near(lat, lng, radius) using ST_DWithin.
--
-- No existing column, policy, or RPC changes. The client swaps getActiveLocations() for a
-- viewport-scoped fetch; everything else in the feature is untouched.

-- PostGIS lives in the `extensions` schema on Supabase. IF NOT EXISTS makes this a no-op (ignoring
-- the schema clause) if it is already enabled elsewhere -- either way the search_paths below include
-- both public and extensions, so the PostGIS type/functions/operators always resolve.
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
SET search_path = public, extensions;

-- Denormalised geography point maintained from latitude/longitude. A trigger (rather than a
-- GENERATED column) keeps this robust across PostGIS versions where the geometry->geography cast
-- is not marked IMMUTABLE and would reject a generated expression.
ALTER TABLE "public"."explore_locations"
  ADD COLUMN IF NOT EXISTS "geog" geography(Point, 4326);

CREATE OR REPLACE FUNCTION public.explore_locations_sync_geog()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  NEW.geog := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS explore_locations_sync_geog_biu ON public.explore_locations;
CREATE TRIGGER explore_locations_sync_geog_biu
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON public.explore_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.explore_locations_sync_geog();

-- Backfill any rows seeded before this migration.
UPDATE public.explore_locations
  SET geog = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  WHERE geog IS NULL;

CREATE INDEX IF NOT EXISTS explore_locations_geog_idx
  ON public.explore_locations USING GIST (geog);

-- The lat/lng btree from the v1 migration is now dead weight -- the GiST index serves every
-- spatial query. Drop it to save write cost.
DROP INDEX IF EXISTS public.explore_locations_lat_lng_idx;

-- Nearby-locations query: the client passes its position and a radius (a few km, or the map
-- viewport) and gets back only in-range active spots, nearest first. SECURITY INVOKER so the
-- existing "authenticated can view active locations" RLS policy still applies. Columns mirror the
-- explore_locations row exactly (geog is intentionally omitted -- the client never needs the raw
-- geography blob) so the client's ExploreLocation type keeps working unchanged.
CREATE OR REPLACE FUNCTION public.get_explore_locations_near(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters double precision DEFAULT 5000
)
RETURNS TABLE (
  id bigint,
  created_at timestamptz,
  updated_at timestamptz,
  name text,
  description text,
  image_url text,
  latitude double precision,
  longitude double precision,
  radius_meters integer,
  is_active boolean,
  created_by uuid
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT
    l.id, l.created_at, l.updated_at, l.name, l.description, l.image_url,
    l.latitude, l.longitude, l.radius_meters, l.is_active, l.created_by
  FROM public.explore_locations l
  WHERE l.is_active = true
    AND ST_DWithin(
      l.geog,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      GREATEST(0, LEAST(p_radius_meters, 50000))  -- clamp: never let a client request the planet
    )
  ORDER BY l.geog <-> ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
  LIMIT 500;
$$;

REVOKE ALL ON FUNCTION public.get_explore_locations_near(double precision, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_explore_locations_near(double precision, double precision, double precision) TO authenticated;
