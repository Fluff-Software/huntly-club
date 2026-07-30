import type { Feature, FeatureCollection } from "geojson";
import { stableHashHex, stableHashMod } from "./stable-hash.js";
import type {
  AcceptedStop,
  GeneratorConfig,
  ReviewSampleReason,
} from "./types.js";

export type ReviewSampleStop = AcceptedStop & {
  reviewReasons: ReviewSampleReason[];
};

/**
 * Deterministic remote-review sample (Step 4 categories).
 */
export function buildReviewSample(
  accepted: AcceptedStop[],
  config: GeneratorConfig
): ReviewSampleStop[] {
  const byId = new Map<string, ReviewSampleStop>();

  const add = (stop: AcceptedStop, reason: ReviewSampleReason) => {
    const existing = byId.get(stop.stopId);
    if (existing) {
      if (!existing.reviewReasons.includes(reason)) existing.reviewReasons.push(reason);
      return;
    }
    byId.set(stop.stopId, { ...stop, reviewReasons: [reason] });
  };

  for (const stop of accepted) {
    if (stop.confidence < config.lowConfidenceThreshold) add(stop, "low_confidence");
    if (stop.nearWater) add(stop, "near_water");
    if (stop.nearSchool) add(stop, "near_school");
    if (stop.nearBarrier) add(stop, "near_barrier");
    if (stop.nearBboxEdge) add(stop, "near_bbox_edge");
    if (stop.nearMajorRoad) add(stop, "near_major_road");
    if (stop.sourceType === "venue") add(stop, "venue_derived");
  }

  const types = [...new Set(accepted.map((s) => s.sourceType))].sort();
  for (const type of types) {
    const ofType = accepted
      .filter((s) => s.sourceType === type)
      .sort((a, b) => (a.stopId < b.stopId ? -1 : 1));
    if (ofType[0]) add(ofType[0]!, "source_type_coverage");
  }

  const remaining = accepted
    .filter((s) => !byId.has(s.stopId))
    .sort((a, b) => (a.stopId < b.stopId ? -1 : 1));

  const scored = remaining
    .map((s) => ({
      stop: s,
      rank: stableHashHex(`${config.reviewSampleSeed}|${s.stopId}`),
    }))
    .sort((a, b) => (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0));

  const extra = Math.min(config.reviewSampleExtraCount, scored.length);
  for (let i = 0; i < extra; i++) add(scored[i]!.stop, "seeded_sample");

  if (byId.size === 0 && accepted.length > 0) {
    const idx = stableHashMod(config.reviewSampleSeed, accepted.length);
    add(accepted[idx]!, "seeded_sample");
  }

  return [...byId.values()].sort((a, b) => (a.stopId < b.stopId ? -1 : 1));
}

export function toReviewSampleGeoJson(sample: ReviewSampleStop[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: sample.map(
      (s): Feature => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [s.longitude, s.latitude],
        },
        properties: {
          stop_id: s.stopId,
          source_type: s.sourceType,
          source_feature_id: s.sourceFeatureId,
          confidence: s.confidence,
          confidence_reasons: s.confidenceReasons,
          review_flags: s.reviewFlags,
          near_water: s.nearWater,
          near_school: s.nearSchool,
          near_barrier: s.nearBarrier,
          near_bbox_edge: s.nearBboxEdge,
          near_major_road: s.nearMajorRoad,
          environment_profile: s.environmentProfile,
          review_reasons: s.reviewReasons,
          latitude: s.latitude,
          longitude: s.longitude,
          nearest_water_meters: s.nearestWaterMeters,
          nearest_school_meters: s.nearestSchoolMeters,
          nearest_barrier_meters: s.nearestBarrierMeters,
          nearest_barrier_type: s.nearestBarrierType,
          distance_to_bbox_edge_meters: s.distanceToBboxEdgeMeters,
        },
      })
    ),
  };
}
