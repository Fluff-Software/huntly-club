/**
 * Edge-compatible Explore generator config (no filesystem paths).
 * Buffer values must stay in sync with scripts/explore/config.ts.
 */
import type { GeneratorConfig } from "./types.ts";

export const GENERATION_VERSION = 2;

export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
export const OSM_LICENCE = "ODbL 1.0";
export const OSM_ATTRIBUTION_URL = "https://www.openstreetmap.org/copyright";

/** Active OSM tile revision — change only when regenerating the tile cache. */
export const ACTIVE_OSM_REVISION = "2026-07";

/** Canonical tile format version. */
export const TILE_FORMAT_VERSION = 1;

/**
 * Web Mercator slippy-map zoom for source tiles.
 * Benchmarked vs z16: z15 keeps typical UK 500 m requests within ~4–9 tiles
 * while staying under Edge download/CPU budgets; z16 roughly 4× tile count.
 */
export const TILE_SCHEME = "web_mercator_slippy" as const;
export const TILE_ZOOM = 15;

export const STORAGE_BUCKET = "explore-osm-source";

export const DEFAULT_MAX_RADIUS_METRES = 2000;
export const DEFAULT_MAX_PADDED_RADIUS_METRES = 2500;
/** Max tiles prepared in one Edge request. Keep at 1 — Edge CPU limits are tight. */
export const DEFAULT_MAX_MISSING_TILES = 1;
/** Max tile stop-caches generated in one Edge request. */
export const DEFAULT_MAX_STOP_GENERATIONS = 1;
export const DEFAULT_MAX_RETURNED_STOPS = 40;

/** Same numeric buffers as scripts/explore DEFAULT_CONFIG (paths omitted). */
export const GENERATOR_BUFFERS = {
  generationVersion: GENERATION_VERSION,
  minimumStopSpacingMeters: 150,
  lineCandidateSpacingMeters: 150,
  coordinateDecimals: 6,
  motorwayBufferMeters: 40,
  trunkBufferMeters: 25,
  primaryBufferMeters: 8,
  railwayBufferMeters: 20,
  waterBufferMeters: 15,
  pathWaterBufferMeters: 20,
  nearWaterReviewMeters: 40,
  barrierBufferMeters: 3,
  gateBufferMeters: 12,
  schoolBufferMeters: 50,
  bboxEdgeBufferMeters: 20,
  nearMajorRoadReviewMeters: 35,
  environmentRadiusMeters: 100,
  maxAlternativeDisplacementMeters: 35,
  maxAreaAlternativeDisplacementMeters: 20,
  maxAreaCandidatesPerFeature: 12,
  reviewSampleSeed: "explore-step4-review-v1",
  reviewSampleExtraCount: 10,
  lowConfidenceThreshold: 0.75,
} as const;

/** Line alternatives: primary then ±25 m only. */
export const LINE_ALTERNATIVE_OFFSETS_METERS: readonly number[] = [0, -25, 25];

/** Retained for Step 3/4 comparison summaries inside the generator. */
export const STEP3_BASELINE = {
  acceptedCount: 34,
  acceptedLowConfidence: 5,
  acceptedNearWater: 4,
  acceptedNearMajorRoad: 0,
  reviewSampleSize: 23,
  unclearRemoteReview: 9,
  looksSafeRemoteReview: 14,
};

export type BoundingBoxConfig = {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
};

/**
 * Build a GeneratorConfig for a request bbox (source coverage).
 * sourceGeoJsonPath / outputDir are unused on Edge but required by the type.
 */
export function buildGeneratorConfig(bbox: BoundingBoxConfig): GeneratorConfig {
  return {
    ...GENERATOR_BUFFERS,
    ...bbox,
    sourceGeoJsonPath: "",
    outputDir: "",
  };
}
