/**
 * RBush spatial index over classified OSM features (Step 10.4A).
 * Exact Turf distance checks still run on the (much smaller) query result set.
 */
import RBush from "rbush";
import * as turf from "@turf/turf";
import type { ClassifiedFeature } from "../safety-rules.js";
import type { GeneratorConfig, LatLon } from "../types.js";
import { profileInc, profileAdd } from "./profile.js";

export const SPATIAL_INDEX_ALGORITHM_VERSION = "rbush-v1";

export type BBoxItem = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  feature: ClassifiedFeature;
};

function featureBBox(item: ClassifiedFeature): [number, number, number, number] | null {
  const g = item.feature.geometry;
  if (!g) return null;
  try {
    const b = turf.bbox(item.feature);
    if (!b.every((n) => Number.isFinite(n))) return null;
    return b as [number, number, number, number];
  } catch {
    return null;
  }
}

/** Degrees of lat/lon expansion for a metre radius at a given latitude. */
export function metresToDegreePad(metres: number, latitude: number): { dLat: number; dLon: number } {
  const dLat = metres / 111_320;
  const cos = Math.cos((latitude * Math.PI) / 180);
  const dLon = metres / (111_320 * Math.max(0.2, cos));
  return { dLat, dLon };
}

/**
 * Max radius needed so indexed queries are a safe superset of all exact safety /
 * proximity / environment checks for a candidate.
 */
export function maxSafetyQueryMetres(config: GeneratorConfig): number {
  return Math.max(
    config.motorwayBufferMeters,
    config.trunkBufferMeters,
    config.primaryBufferMeters,
    config.railwayBufferMeters,
    config.waterBufferMeters,
    config.pathWaterBufferMeters,
    config.nearWaterReviewMeters,
    config.barrierBufferMeters,
    config.gateBufferMeters,
    config.schoolBufferMeters,
    config.nearMajorRoadReviewMeters,
    config.environmentRadiusMeters,
    5
  );
}

export class FeatureSpatialIndex {
  readonly algorithmVersion = SPATIAL_INDEX_ALGORITHM_VERSION;
  readonly all: ClassifiedFeature[];
  readonly byId: Map<string, ClassifiedFeature>;
  private readonly tree: RBush<BBoxItem>;
  readonly buildMs: number;
  readonly indexedCount: number;

  constructor(classified: ClassifiedFeature[]) {
    const t0 = performance.now();
    this.all = classified;
    this.byId = new Map(classified.map((c) => [c.id, c]));
    this.tree = new RBush();
    const items: BBoxItem[] = [];
    for (const feature of classified) {
      const b = featureBBox(feature);
      if (!b) continue;
      items.push({
        minX: b[0],
        minY: b[1],
        maxX: b[2],
        maxY: b[3],
        feature,
      });
    }
    this.tree.load(items);
    this.indexedCount = items.length;
    this.buildMs = performance.now() - t0;
    profileAdd("index_build_ms", this.buildMs);
    profileInc("index_builds");
  }

  queryBBox(minLon: number, minLat: number, maxLon: number, maxLat: number): ClassifiedFeature[] {
    const hits = this.tree.search({
      minX: minLon,
      minY: minLat,
      maxX: maxLon,
      maxY: maxLat,
    });
    profileInc("index_queries");
    profileAdd("index_hits", hits.length);
    return hits.map((h) => h.feature);
  }

  queryRadius(point: LatLon, metres: number): ClassifiedFeature[] {
    const { dLat, dLon } = metresToDegreePad(metres, point.latitude);
    return this.queryBBox(
      point.longitude - dLon,
      point.latitude - dLat,
      point.longitude + dLon,
      point.latitude + dLat
    );
  }

  /** Heap estimate for reporting (rough). */
  approxMemoryBytes(): number {
    return this.indexedCount * 64 + this.all.length * 128;
  }
}

export type SafetyLookup = {
  classified: ClassifiedFeature[];
  index?: FeatureSpatialIndex | null;
  /** Override query radius (metres). Defaults to maxSafetyQueryMetres(config). */
  queryMetres?: number;
};

/**
 * Features to examine for a candidate: indexed neighbours when available,
 * otherwise the full classified list (legacy path).
 */
export function featuresForPoint(
  point: LatLon,
  config: GeneratorConfig,
  lookup: SafetyLookup
): ClassifiedFeature[] {
  if (lookup.index) {
    const metres = lookup.queryMetres ?? maxSafetyQueryMetres(config);
    const hits = lookup.index.queryRadius(point, metres);
    profileInc("indexed_feature_scans");
    profileAdd("indexed_features_examined", hits.length);
    return hits;
  }
  profileInc("full_feature_scans");
  profileAdd("full_features_examined", lookup.classified.length);
  return lookup.classified;
}
