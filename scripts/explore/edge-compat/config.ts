/**
 * Node-test shim matching Edge explore config constants used by tile helpers.
 */
export const GENERATION_VERSION = 2;
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
export const OSM_LICENCE = "ODbL 1.0";
export const OSM_ATTRIBUTION_URL = "https://www.openstreetmap.org/copyright";
export const ACTIVE_OSM_REVISION = "2026-07";
export const TILE_FORMAT_VERSION = 1;
export const TILE_SCHEME = "web_mercator_slippy" as const;
export const TILE_ZOOM = 15;
export const STORAGE_BUCKET = "explore-osm-source";
export const DEFAULT_MAX_RADIUS_METRES = 2000;
export const DEFAULT_MAX_PADDED_RADIUS_METRES = 2500;
export const DEFAULT_MAX_MISSING_TILES = 1;
export const DEFAULT_MAX_RETURNED_STOPS = 40;

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
