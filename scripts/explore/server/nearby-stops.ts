/**
 * Nearby-stop query against the deterministic Explore generator.
 * Loads local OSM GeoJSON only — never calls Overpass or writes to a database.
 */
import fs from "node:fs";
import type { FeatureCollection } from "geojson";
import {
  DEFAULT_CONFIG,
  DEFAULT_TEST_AREA_LABEL,
  mergeConfig,
} from "../config.js";
import { generateStops } from "../generate-stops.js";
import { haversineMeters, pointInBbox } from "../safety-rules.js";
import type { AcceptedStop, GeneratorConfig } from "../types.js";
import type { NearbyQuery } from "./validation.js";
import { resolveOsmDataPath } from "./env.js";
import { loadOsmRevisionMeta } from "./osm-revision.js";
import { exploreLog } from "./log.js";

export type TestAreaMeta = {
  label: string;
  bounding_box: {
    min_latitude: number;
    min_longitude: number;
    max_latitude: number;
    max_longitude: number;
  };
};

export type NearbyStopDto = {
  stop_id: string;
  latitude: number;
  longitude: number;
  distance_metres: number;
  generation_version: number;
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
  distance_to_bbox_edge_meters: number;
};

export type NearbyStopsSuccess = {
  generation_version: number;
  test_area: TestAreaMeta;
  request: {
    latitude: number;
    longitude: number;
    radius_metres: number;
  };
  stops: NearbyStopDto[];
};

export type NearbyStopsOutsideArea = {
  error: "outside_supported_test_area";
  test_area: TestAreaMeta;
};

export type NearbyStopsMissingSource = {
  error: "osm_extract_missing";
  message: string;
};

type CacheEntry = {
  config: GeneratorConfig;
  accepted: AcceptedStop[];
  sourcePath: string;
  sourceMtimeMs: number;
  osmDataRevision: string;
};

let cache: CacheEntry | null = null;

export function clearNearbyCache(): void {
  cache = null;
}

export function getNearbyCacheStats(): {
  warm: boolean;
  stopCount: number;
  osmDataRevision: string | null;
  generationVersion: number | null;
} {
  if (!cache) {
    return { warm: false, stopCount: 0, osmDataRevision: null, generationVersion: null };
  }
  return {
    warm: true,
    stopCount: cache.accepted.length,
    osmDataRevision: cache.osmDataRevision,
    generationVersion: cache.config.generationVersion,
  };
}

/** Warm the disposable accepted-stops cache (safe to call at startup). */
export function warmAcceptedStopsCache(
  generationVersion: number = DEFAULT_CONFIG.generationVersion
): { ok: true; stopCount: number } | { ok: false; error: string } {
  try {
    const accepted = loadAcceptedStops(generationVersion);
    return { ok: true, stopCount: accepted.length };
  } catch (e) {
    const err = e as Error & { code?: string };
    return { ok: false, error: err.code ?? err.message };
  }
}

/** Resolve authoritative accepted stops for a generation version (uses disposable cache). */
export function getAcceptedStops(generationVersion: number): AcceptedStop[] {
  return loadAcceptedStops(generationVersion);
}

export function findAcceptedStop(
  stopId: string,
  generationVersion: number
): AcceptedStop | null {
  return getAcceptedStops(generationVersion).find((s) => s.stopId === stopId) ?? null;
}

export function getTestAreaMeta(config: GeneratorConfig = DEFAULT_CONFIG): TestAreaMeta {
  return {
    label: DEFAULT_TEST_AREA_LABEL,
    bounding_box: {
      min_latitude: config.minLatitude,
      min_longitude: config.minLongitude,
      max_latitude: config.maxLatitude,
      max_longitude: config.maxLongitude,
    },
  };
}

function loadAcceptedStops(generationVersion: number): AcceptedStop[] {
  const sourcePath = resolveOsmDataPath();
  if (!fs.existsSync(sourcePath)) {
    throw Object.assign(new Error(`OSM extract missing: ${sourcePath}`), {
      code: "osm_extract_missing",
    });
  }
  const stat = fs.statSync(sourcePath);
  const osmMeta = loadOsmRevisionMeta(sourcePath);
  const osmDataRevision = osmMeta.osm_data_revision;
  const config = mergeConfig({
    generationVersion,
    sourceGeoJsonPath: sourcePath,
  });

  if (
    cache &&
    cache.config.generationVersion === generationVersion &&
    cache.sourcePath === sourcePath &&
    cache.sourceMtimeMs === stat.mtimeMs &&
    cache.osmDataRevision === osmDataRevision
  ) {
    return cache.accepted;
  }

  const started = Date.now();
  const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as FeatureCollection;
  const result = generateStops(raw, config);
  cache = {
    config,
    accepted: result.accepted,
    sourcePath,
    sourceMtimeMs: stat.mtimeMs,
    osmDataRevision,
  };
  exploreLog("info", "cache_built", {
    generation_version: generationVersion,
    osm_data_revision: osmDataRevision,
    stop_count: result.accepted.length,
    duration_ms: Date.now() - started,
  });
  return cache.accepted;
}

function toDto(stop: AcceptedStop, distanceMetres: number): NearbyStopDto {
  return {
    stop_id: stop.stopId,
    latitude: stop.latitude,
    longitude: stop.longitude,
    distance_metres: Math.round(distanceMetres * 10) / 10,
    generation_version: stop.generationVersion,
    source_type: stop.sourceType,
    source_feature_id: stop.sourceFeatureId,
    confidence: stop.confidence,
    confidence_reasons: [...stop.confidenceReasons],
    environment_profile: { ...stop.environmentProfile },
    review_flags: [...stop.reviewFlags],
    nearest_water_meters: stop.nearestWaterMeters,
    nearest_major_road_meters: stop.nearestMajorRoadMeters,
    nearest_school_meters: stop.nearestSchoolMeters,
    nearest_barrier_meters: stop.nearestBarrierMeters,
    nearest_barrier_type: stop.nearestBarrierType,
    distance_to_bbox_edge_meters: stop.distanceToBboxEdgeMeters,
  };
}

/**
 * Generate (or reuse cached) full-area stops, then filter by radius.
 * User coordinates never enter the generator — only distance filtering.
 */
export function getNearbyStops(
  query: NearbyQuery
): NearbyStopsSuccess | NearbyStopsOutsideArea | NearbyStopsMissingSource {
  const config = mergeConfig({ generationVersion: query.generationVersion });
  const testArea = getTestAreaMeta(config);
  const point = { latitude: query.latitude, longitude: query.longitude };

  if (!pointInBbox(point, config)) {
    return { error: "outside_supported_test_area", test_area: testArea };
  }

  let accepted: AcceptedStop[];
  try {
    accepted = loadAcceptedStops(query.generationVersion);
  } catch (e) {
    const err = e as Error & { code?: string };
    if (err.code === "osm_extract_missing") {
      return {
        error: "osm_extract_missing",
        message:
          "Prepared OSM extract not found. Run `npm run prepare:osm` once, then retry.",
      };
    }
    throw e;
  }

  const stops = accepted
    .map((stop) => {
      const distance = haversineMeters(point, {
        latitude: stop.latitude,
        longitude: stop.longitude,
      });
      return { stop, distance };
    })
    .filter(({ distance }) => distance <= query.radiusMetres)
    .sort((a, b) => a.distance - b.distance || (a.stop.stopId < b.stop.stopId ? -1 : 1))
    .map(({ stop, distance }) => toDto(stop, distance));

  return {
    generation_version: query.generationVersion,
    test_area: testArea,
    request: {
      latitude: query.latitude,
      longitude: query.longitude,
      radius_metres: query.radiusMetres,
    },
    stops,
  };
}

/** Test helper: expose cached accepted stop coordinates (read-only). */
export function getCachedAcceptedCoordinatesForTests(): Array<{
  stopId: string;
  latitude: number;
  longitude: number;
}> {
  if (!cache) return [];
  return cache.accepted.map((s) => ({
    stopId: s.stopId,
    latitude: s.latitude,
    longitude: s.longitude,
  }));
}
