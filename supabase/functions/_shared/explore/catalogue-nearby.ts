/**
 * Step 10.3 persisted catalogue nearby / point lookup (PostGIS RPCs).
 * No Overpass, no OSM tiles, no runtime generateStops.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  DEFAULT_MAX_RADIUS_METRES,
  DEFAULT_MAX_RETURNED_STOPS,
  GENERATION_VERSION,
} from "./config.ts";
import { startTimer, type TimingBucket } from "./timings.ts";
import { recordTiming } from "./timings.ts";

export type CatalogueNearbyRequest = {
  latitude: number;
  longitude: number;
  radiusMetres: number;
  generationVersion?: number;
};

export type CataloguePointRow = {
  id: string;
  latitude: number;
  longitude: number;
  point_type: number;
  source_type: string;
  generation_version: number;
  source_revision: string;
  distance_metres: number;
  environment_profile: Record<string, unknown> | null;
  source_feature_id: string | null;
  confidence: number | null;
};

export type CataloguePointAuthority = {
  id: string;
  latitude: number;
  longitude: number;
  point_type: number;
  source_type: string;
  generation_version: number;
  source_revision: string;
  environment_profile: Record<string, number>;
  source_feature_id: string | null;
  confidence: number | null;
  active: boolean;
  catalogue_status: string;
};

export function validateCatalogueNearbyBody(body: unknown):
  | { ok: true; request: CatalogueNearbyRequest }
  | { ok: false; status: number; body: Record<string, unknown> } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, body: { error: "invalid_request" } };
  }
  const raw = body as Record<string, unknown>;
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);
  const radiusMetres = Number(raw.radius_metres ?? raw.radiusMetres ?? 1000);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { ok: false, status: 400, body: { error: "invalid_latitude" } };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { ok: false, status: 400, body: { error: "invalid_longitude" } };
  }
  if (!Number.isFinite(radiusMetres) || radiusMetres <= 0) {
    return { ok: false, status: 400, body: { error: "invalid_radius" } };
  }
  if (radiusMetres > DEFAULT_MAX_RADIUS_METRES) {
    return {
      ok: false,
      status: 400,
      body: { error: "radius_too_large", details: { max: DEFAULT_MAX_RADIUS_METRES } },
    };
  }
  const generationVersion =
    raw.generation_version == null && raw.generationVersion == null
      ? undefined
      : Number(raw.generation_version ?? raw.generationVersion);
  if (
    generationVersion != null &&
    (!Number.isFinite(generationVersion) || generationVersion !== GENERATION_VERSION)
  ) {
    return { ok: false, status: 400, body: { error: "unsupported_generation_version" } };
  }
  return {
    ok: true,
    request: { latitude, longitude, radiusMetres, generationVersion },
  };
}

export async function runCatalogueNearby(opts: {
  service: SupabaseClient;
  request: CatalogueNearbyRequest;
  requestId: string;
}): Promise<
  | {
      kind: "ok";
      status: 200;
      body: Record<string, unknown>;
    }
  | {
      kind: "empty";
      status: 200;
      body: Record<string, unknown>;
    }
  | {
      kind: "no_coverage";
      status: 404;
      body: Record<string, unknown>;
    }
  | {
      kind: "error";
      status: number;
      body: Record<string, unknown>;
    }
> {
  const timings: TimingBucket = {};
  const q = startTimer();
  const { data, error } = await opts.service.rpc("get_explore_points_nearby", {
    p_latitude: opts.request.latitude,
    p_longitude: opts.request.longitude,
    p_radius_metres: opts.request.radiusMetres,
    p_limit_count: DEFAULT_MAX_RETURNED_STOPS,
  });
  recordTiming(timings, "rpc_ms", q.elapsedMs());

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("radius_too_large")) {
      return { kind: "error", status: 400, body: { error: "radius_too_large" } };
    }
    if (msg.includes("invalid_coordinates")) {
      return { kind: "error", status: 400, body: { error: "invalid_coordinates" } };
    }
    return {
      kind: "error",
      status: 503,
      body: { error: "catalogue_unavailable", message: error.message },
    };
  }

  const rows = (Array.isArray(data) ? data : []) as CataloguePointRow[];
  const stops = rows.map((r) => ({
    id: r.id,
    stop_id: r.id,
    latitude: r.latitude,
    longitude: r.longitude,
    type: r.point_type,
    point_type: r.point_type,
    source_type: r.source_type,
    distance_metres: Math.round(Number(r.distance_metres) * 10) / 10,
    generation_version: r.generation_version,
    osm_revision: r.source_revision,
    source_feature_id: r.source_feature_id ?? "",
    confidence: r.confidence ?? 0,
    environment_profile:
      r.environment_profile && typeof r.environment_profile === "object"
        ? r.environment_profile
        : {},
    confidence_reasons: [] as string[],
    review_flags: [] as string[],
    nearest_water_meters: null,
    nearest_major_road_meters: null,
    nearest_school_meters: null,
    nearest_barrier_meters: null,
    nearest_barrier_type: null,
    distance_to_bbox_edge_meters: null,
  }));

  if (stops.length === 0) {
    const cov = await opts.service.rpc("explore_has_active_coverage", {
      p_latitude: opts.request.latitude,
      p_longitude: opts.request.longitude,
      p_probe_metres: 5000,
    });
    const hasCoverage = cov.data === true;
    if (!hasCoverage) {
      return {
        kind: "no_coverage",
        status: 404,
        body: {
          error: "no_coverage",
          code: "no_coverage",
          message: "Explore is not available in this area yet.",
        },
      };
    }
    return {
      kind: "empty",
      status: 200,
      body: {
        generation_version: GENERATION_VERSION,
        mode: "catalogue",
        requested_radius_metres: opts.request.radiusMetres,
        stop_count: 0,
        request: {
          latitude: opts.request.latitude,
          longitude: opts.request.longitude,
          radius_metres: opts.request.radiusMetres,
        },
        stops: [],
        timings,
      },
    };
  }

  return {
    kind: "ok",
    status: 200,
    body: {
      generation_version: stops[0]?.generation_version ?? GENERATION_VERSION,
      osm_revision: stops[0]?.osm_revision,
      mode: "catalogue",
      requested_radius_metres: opts.request.radiusMetres,
      stop_count: stops.length,
      request: {
        latitude: opts.request.latitude,
        longitude: opts.request.longitude,
        radius_metres: opts.request.radiusMetres,
      },
      stops,
      timings,
    },
  };
}

export async function loadCataloguePointById(
  service: SupabaseClient,
  stopId: string
): Promise<CataloguePointAuthority | null> {
  const { data, error } = await service.rpc("get_explore_point_by_id", {
    p_stop_id: stopId,
  });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as Record<string, unknown>;
  const env =
    row.environment_profile && typeof row.environment_profile === "object"
      ? (row.environment_profile as Record<string, number>)
      : {};
  return {
    id: String(row.id),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    point_type: Number(row.point_type),
    source_type: String(row.source_type),
    generation_version: Number(row.generation_version),
    source_revision: String(row.source_revision),
    environment_profile: env,
    source_feature_id: row.source_feature_id == null ? null : String(row.source_feature_id),
    confidence: row.confidence == null ? null : Number(row.confidence),
    active: row.active === true,
    catalogue_status: String(row.catalogue_status ?? ""),
  };
}
