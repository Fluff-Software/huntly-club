/**
 * Nearby stops pipeline — Step 10.2 tile/OSM path retained for offline parity helpers.
 * Active Edge nearby uses catalogue-nearby.ts (Step 10.3 PostGIS catalogue).
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  ACTIVE_OSM_REVISION,
  DEFAULT_MAX_MISSING_TILES,
  DEFAULT_MAX_PADDED_RADIUS_METRES,
  DEFAULT_MAX_RADIUS_METRES,
  DEFAULT_MAX_RETURNED_STOPS,
  DEFAULT_MAX_STOP_GENERATIONS,
  GENERATION_VERSION,
} from "./config.ts";
import { computeSourcePadding } from "./padding.ts";
import { haversineMeters } from "./safety-rules.ts";
import { loadOrPrepareTiles } from "./tile-preparation.ts";
import { loadOrPrepareTileStops } from "./tile-stops.ts";
import { tilesForRadius, type TileId } from "./tiles.ts";
import { recordTiming, startTimer, type TimingBucket } from "./timings.ts";
import type { AcceptedStop } from "./types.ts";

export type NearbyRequest = {
  latitude: number;
  longitude: number;
  radiusMetres: number;
  generationVersion?: number;
  osmRevision?: string;
};

export type NearbyStopDto = {
  stop_id: string;
  latitude: number;
  longitude: number;
  distance_metres: number;
  generation_version: number;
  osm_revision: string;
  source_type: string;
  source_feature_id: string;
  confidence: number;
  confidence_reasons: string[];
  environment_profile: Record<string, number>;
  review_flags: string[];
  nearest_water_meters: number | null;
  nearest_major_road_meters: number | null;
  nearest_school_meters: number | null;
  nearest_barrier_meters: number | null;
  nearest_barrier_type: string | null;
  distance_to_bbox_edge_meters: number | null;
};

export type NearbySuccess = {
  generation_version: number;
  osm_revision: string;
  requested_radius_metres: number;
  source_radius_metres: number;
  tile_count: number;
  cached_tile_count: number;
  prepared_tile_count: number;
  source_feature_count: number;
  stop_count: number;
  request: {
    latitude: number;
    longitude: number;
    radius_metres: number;
  };
  stops: NearbyStopDto[];
  timings?: TimingBucket;
};

export type NearbyOutcome =
  | { kind: "ok"; status: number; body: NearbySuccess }
  | {
      kind: "preparing";
      status: number;
      body: {
        code: "map_data_preparing";
        error: "map_data_preparing";
        message: string;
        retry_after_seconds: number;
      };
    }
  | { kind: "error"; status: number; body: Record<string, unknown> };

export function validateNearbyBody(body: unknown):
  | { ok: true; request: NearbyRequest }
  | { ok: false; status: number; body: Record<string, unknown> } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, body: { error: "invalid_request" } };
  }
  const raw = body as Record<string, unknown>;
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);
  const radiusMetres = Number(raw.radius_metres ?? raw.radiusMetres);
  const generationVersion =
    raw.generation_version == null && raw.generationVersion == null
      ? GENERATION_VERSION
      : Number(raw.generation_version ?? raw.generationVersion);

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
      body: {
        error: "radius_too_large",
        details: { max_radius_metres: DEFAULT_MAX_RADIUS_METRES },
      },
    };
  }
  if (generationVersion !== GENERATION_VERSION) {
    return {
      ok: false,
      status: 400,
      body: { error: "unsupported_generation_version" },
    };
  }

  const osmRevision =
    typeof raw.osm_revision === "string"
      ? raw.osm_revision
      : typeof raw.osmRevision === "string"
        ? raw.osmRevision
        : undefined;

  return {
    ok: true,
    request: { latitude, longitude, radiusMetres, generationVersion, osmRevision },
  };
}

function mapStop(
  stop: AcceptedStop,
  distanceMetres: number,
  osmRevision: string
): NearbyStopDto {
  return {
    stop_id: stop.stopId,
    latitude: stop.latitude,
    longitude: stop.longitude,
    distance_metres: Math.round(distanceMetres * 10) / 10,
    generation_version: stop.generationVersion,
    osm_revision: osmRevision,
    source_type: stop.sourceType,
    source_feature_id: stop.sourceFeatureId,
    confidence: stop.confidence,
    confidence_reasons: stop.confidenceReasons,
    environment_profile: stop.environmentProfile as Record<string, number>,
    review_flags: stop.reviewFlags,
    nearest_water_meters: stop.nearestWaterMeters,
    nearest_major_road_meters: stop.nearestMajorRoadMeters,
    nearest_school_meters: stop.nearestSchoolMeters,
    nearest_barrier_meters: stop.nearestBarrierMeters,
    nearest_barrier_type: stop.nearestBarrierType,
    distance_to_bbox_edge_meters: stop.distanceToBboxEdgeMeters,
  };
}

export async function runNearby(opts: {
  service: SupabaseClient;
  request: NearbyRequest;
  requestId: string;
  allowAcquisition: boolean;
  userId?: string;
}): Promise<NearbyOutcome> {
  const revision = opts.request.osmRevision ?? ACTIVE_OSM_REVISION;
  const padding = computeSourcePadding(opts.request.radiusMetres);

  if (padding.sourceRadiusMetres > DEFAULT_MAX_PADDED_RADIUS_METRES) {
    return {
      kind: "error",
      status: 400,
      body: {
        error: "padded_radius_too_large",
        details: {
          source_radius_metres: padding.sourceRadiusMetres,
          max: DEFAULT_MAX_PADDED_RADIUS_METRES,
        },
      },
    };
  }

  const tiles: TileId[] = tilesForRadius(
    opts.request.latitude,
    opts.request.longitude,
    padding.sourceRadiusMetres
  );

  const prepared = await loadOrPrepareTiles({
    service: opts.service,
    tiles,
    revision,
    requestId: opts.requestId,
    allowAcquisition: opts.allowAcquisition,
    maxMissingTiles: DEFAULT_MAX_MISSING_TILES,
    userId: opts.userId,
  });

  if (prepared.status === "preparing") {
    return {
      kind: "preparing",
      status: 202,
      body: {
        code: "map_data_preparing",
        error: "map_data_preparing",
        message: "Explore is preparing this area.",
        retry_after_seconds: prepared.retryAfterSeconds,
        tile_count: tiles.length,
        cached_tile_count: prepared.cachedCount,
        missing_tile_count: prepared.missingCount,
        preparing_tile_ids: prepared.preparingTileIds,
      },
    };
  }

  if (prepared.status === "error") {
    return {
      kind: "error",
      status: 503,
      body: {
        error: prepared.error,
        message: prepared.message,
        details: prepared.details,
      },
    };
  }

  // Per-tile stop caches — never run generateStops over a multi-tile merge (Edge CPU kill).
  const stopsTimer = startTimer();
  const stopsReady = await loadOrPrepareTileStops({
    service: opts.service,
    tiles: prepared.tiles,
    revision,
    requestId: opts.requestId,
    maxGenerate: DEFAULT_MAX_STOP_GENERATIONS,
  });
  recordTiming(prepared.timings, "stops_ms", stopsTimer.elapsedMs());

  if (stopsReady.status === "preparing") {
    return {
      kind: "preparing",
      status: 202,
      body: {
        code: "map_data_preparing",
        error: "map_data_preparing",
        message: "Explore is preparing stops for this area.",
        retry_after_seconds: stopsReady.retryAfterSeconds,
        tile_count: tiles.length,
        cached_tile_count: prepared.cachedCount,
        missing_tile_count: stopsReady.missingCount,
        preparing_tile_ids: [],
      },
    };
  }

  const stops = stopsReady.stops
    .map((stop) => {
      const d = haversineMeters(
        { latitude: opts.request.latitude, longitude: opts.request.longitude },
        { latitude: stop.latitude, longitude: stop.longitude }
      );
      return { stop, d };
    })
    .filter(({ d }) => d <= opts.request.radiusMetres)
    .sort((a, b) => a.d - b.d)
    .slice(0, DEFAULT_MAX_RETURNED_STOPS)
    .map(({ stop, d }) => mapStop(stop, d, revision));

  return {
    kind: "ok",
    status: 200,
    body: {
      generation_version: GENERATION_VERSION,
      osm_revision: revision,
      requested_radius_metres: opts.request.radiusMetres,
      source_radius_metres: padding.sourceRadiusMetres,
      tile_count: tiles.length,
      cached_tile_count: prepared.cachedCount,
      prepared_tile_count: prepared.preparedCount,
      source_feature_count: prepared.tiles.reduce((n, t) => n + t.feature_count, 0),
      stop_count: stops.length,
      request: {
        latitude: opts.request.latitude,
        longitude: opts.request.longitude,
        radius_metres: opts.request.radiusMetres,
      },
      stops,
      timings: prepared.timings,
    },
  };
}

/** Regenerate accepted stops for authoritative verify/claim. */
export async function loadAcceptedStopsForPoint(opts: {
  service: SupabaseClient;
  latitude: number;
  longitude: number;
  /** Enough coverage to regenerate a stop near the user / known stop. */
  radiusMetres: number;
  requestId: string;
  revision?: string;
  allowAcquisition: boolean;
  userId?: string;
}): Promise<
  | { ok: true; accepted: AcceptedStop[]; revision: string; timings: TimingBucket }
  | { ok: false; preparing: true; retryAfterSeconds: number }
  | { ok: false; error: string; message: string; status: number }
> {
  const revision = opts.revision ?? ACTIVE_OSM_REVISION;
  const padding = computeSourcePadding(opts.radiusMetres);
  const tiles = tilesForRadius(opts.latitude, opts.longitude, padding.sourceRadiusMetres);
  const prepared = await loadOrPrepareTiles({
    service: opts.service,
    tiles,
    revision,
    requestId: opts.requestId,
    allowAcquisition: opts.allowAcquisition,
    maxMissingTiles: DEFAULT_MAX_MISSING_TILES,
    userId: opts.userId,
  });
  if (prepared.status === "preparing") {
    return { ok: false, preparing: true, retryAfterSeconds: prepared.retryAfterSeconds };
  }
  if (prepared.status === "error") {
    return {
      ok: false,
      error: prepared.error,
      message: prepared.message,
      status: 503,
    };
  }
  const stopsReady = await loadOrPrepareTileStops({
    service: opts.service,
    tiles: prepared.tiles,
    revision,
    requestId: opts.requestId,
    maxGenerate: DEFAULT_MAX_STOP_GENERATIONS,
  });
  if (stopsReady.status === "preparing") {
    return { ok: false, preparing: true, retryAfterSeconds: stopsReady.retryAfterSeconds };
  }
  return { ok: true, accepted: stopsReady.stops, revision, timings: prepared.timings };
}
