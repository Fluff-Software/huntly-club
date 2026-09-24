import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { GeneratorConfig } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Package root whether running from source (`tsx`) or compiled `dist/`. */
function explorePackageRoot(): string {
  if (fs.existsSync(path.join(__dirname, "package.json"))) return __dirname;
  if (fs.existsSync(path.join(__dirname, "..", "package.json"))) {
    return path.join(__dirname, "..");
  }
  return __dirname;
}

export const EXPLORE_PACKAGE_ROOT = explorePackageRoot();

/**
 * Default test area: ~1.7 km box centred on 21 Mornington Road, Sneyd Green,
 * Stoke-on-Trent ST1 6EN (approx 53.044236, -2.165567).
 */
export const DEFAULT_TEST_AREA_LABEL =
  "Sneyd Green / Mornington Road, Stoke-on-Trent ST1 6EN (~1.7 km box)";

export const LOCAL_OSM_GEOJSON_PATH = path.join(
  EXPLORE_PACKAGE_ROOT,
  "fixtures",
  "local",
  "stoke-sneyd-green.geojson"
);

export const SYNTHETIC_FIXTURE_PATH = path.join(
  EXPLORE_PACKAGE_ROOT,
  "fixtures",
  "test-area.geojson"
);

/** Step 3 baseline counts for before/after comparison in docs. */
export const STEP3_BASELINE = {
  acceptedCount: 34,
  acceptedLowConfidence: 5,
  acceptedNearWater: 4,
  acceptedNearMajorRoad: 0,
  reviewSampleSize: 23,
  unclearRemoteReview: 9,
  looksSafeRemoteReview: 14,
};

export const DEFAULT_CONFIG: GeneratorConfig = {
  minLatitude: 53.0367,
  minLongitude: -2.1776,
  maxLatitude: 53.0518,
  maxLongitude: -2.1535,
  /** Bumped in Step 4 — safety / confidence rules changed stop placement. */
  generationVersion: 2,
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
  /** Flag / sample band for meaningfully reduced confidence (alts, hazards). */
  lowConfidenceThreshold: 0.75,
  sourceGeoJsonPath: LOCAL_OSM_GEOJSON_PATH,
  outputDir: path.join(EXPLORE_PACKAGE_ROOT, "output"),
};

/** Line alternatives: primary then ±25 m only (Step 4 — drop ±50 m weak alts). */
export const LINE_ALTERNATIVE_OFFSETS_METERS: readonly number[] = [0, -25, 25];

export function mergeConfig(overrides: Partial<GeneratorConfig> = {}): GeneratorConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}
