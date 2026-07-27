import type {
  ClassifiedFeature,
} from "./safety-rules.js";
import {
  distanceToFeatureMeters,
  evaluateSafety,
  haversineMeters,
  isMajorRoadProps,
  isWaterProps,
  minDistanceToMatching,
  pointInBbox,
} from "./safety-rules.js";
import type { FeatureSpatialIndex } from "./national/spatial-index.js";
import { featuresForPoint, type SafetyLookup } from "./national/spatial-index.js";
import type {
  GeneratorConfig,
  LatLon,
  OsmLikeProperties,
  ProximityMetrics,
  RejectionReason,
  ReviewFlag,
  SourceFeatureType,
} from "./types.js";

const LINE_SOURCE_TYPES = new Set<SourceFeatureType>([
  "footpath",
  "pedestrian",
  "path",
  "sidewalk",
  "cycleway_walk",
]);

const AREA_SOURCE_TYPES = new Set<SourceFeatureType>([
  "park",
  "garden",
  "recreation_ground",
  "plaza",
  "common",
]);

export function isSchoolProps(props: OsmLikeProperties): boolean {
  return (
    props.amenity === "school" ||
    props.amenity === "college" ||
    props.amenity === "university" ||
    props.amenity === "kindergarten" ||
    props.landuse === "education" ||
    props.building === "school"
  );
}

export function isPublicWatersideRoute(props: OsmLikeProperties): boolean {
  if (props.access === "private" || props.access === "no") return false;
  if (props.towpath === "yes") return true;
  if (props.highway === "footway" && props.name && /tow\s*path|promenade|boardwalk/i.test(props.name)) {
    return true;
  }
  if (props.footway === "sidewalk") return false;
  // Explicit canal towpath tagging used in OSM
  if (props.highway === "path" && props.towpath === "yes") return true;
  return false;
}

export function distanceToBboxEdgeMeters(point: LatLon, config: GeneratorConfig): number {
  const corners: LatLon[] = [
    { latitude: point.latitude, longitude: config.minLongitude },
    { latitude: point.latitude, longitude: config.maxLongitude },
    { latitude: config.minLatitude, longitude: point.longitude },
    { latitude: config.maxLatitude, longitude: point.longitude },
  ];
  // Approximate: convert lat/lon deltas to metres via haversine to edge projections.
  const toEdge = [
    haversineMeters(point, { latitude: point.latitude, longitude: config.minLongitude }),
    haversineMeters(point, { latitude: point.latitude, longitude: config.maxLongitude }),
    haversineMeters(point, { latitude: config.minLatitude, longitude: point.longitude }),
    haversineMeters(point, { latitude: config.maxLatitude, longitude: point.longitude }),
  ];
  void corners;
  return Math.min(...toEdge);
}

export function nearestBarrier(
  point: LatLon,
  classified: ClassifiedFeature[],
  index?: FeatureSpatialIndex | null,
  config?: GeneratorConfig
): { meters: number | null; type: string | null; access: string | null; props: OsmLikeProperties | null } {
  let best = Number.POSITIVE_INFINITY;
  let type: string | null = null;
  let access: string | null = null;
  let props: OsmLikeProperties | null = null;
  const lookup: SafetyLookup = { classified, index };
  const scan =
    index && config ? featuresForPoint(point, config, lookup) : classified;
  for (const item of scan) {
    if (!item.props.barrier || item.props.barrier === "no" || item.props.barrier === "kerb") continue;
    const d = distanceToFeatureMeters(point, item.feature);
    if (d < best) {
      best = d;
      type = String(item.props.barrier);
      access = item.props.access ?? null;
      props = item.props;
    }
  }
  if (!Number.isFinite(best)) {
    return { meters: null, type: null, access: null, props: null };
  }
  return { meters: best, type, access, props };
}

export function collectProximityMetrics(
  point: LatLon,
  config: GeneratorConfig,
  classified: ClassifiedFeature[],
  index?: FeatureSpatialIndex | null
): ProximityMetrics {
  const water = minDistanceToMatching(point, classified, isWaterProps, index, config);
  const road = minDistanceToMatching(point, classified, isMajorRoadProps, index, config);
  const school = minDistanceToMatching(point, classified, isSchoolProps, index, config);
  const barrier = nearestBarrier(point, classified, index, config);
  return {
    nearestWaterMeters: Number.isFinite(water) ? Math.round(water * 10) / 10 : null,
    nearestMajorRoadMeters: Number.isFinite(road) ? Math.round(road * 10) / 10 : null,
    nearestSchoolMeters: Number.isFinite(school) ? Math.round(school * 10) / 10 : null,
    nearestBarrierMeters: barrier.meters != null ? Math.round(barrier.meters * 10) / 10 : null,
    nearestBarrierType: barrier.type,
    distanceToBboxEdgeMeters: Math.round(distanceToBboxEdgeMeters(point, config) * 10) / 10,
  };
}

export type SafetyContextOptions = {
  sourceFeatureId?: string;
  sourceType: SourceFeatureType;
  /** True when candidate comes from area interior grid (not an explicit path). */
  isAreaGridCandidate?: boolean;
  sourceProps?: OsmLikeProperties;
  requireInsideSourceId?: string;
  /** Optional spatial index — identical decisions, fewer exact checks. */
  index?: FeatureSpatialIndex | null;
};

export type SafetyPass = {
  ok: true;
  flags: ReviewFlag[];
  metrics: ProximityMetrics;
  mappedPublicWatersideRoute: boolean;
};

export type SafetyFail = {
  ok: false;
  reason: RejectionReason;
  flags: ReviewFlag[];
  metrics: ProximityMetrics;
};

/**
 * Layered safety: base geometry hazards + Step 4 water/school/barrier/edge rules.
 */
export function evaluateSafetyContext(
  point: LatLon,
  config: GeneratorConfig,
  classified: ClassifiedFeature[],
  options: SafetyContextOptions
): SafetyPass | SafetyFail {
  const index = options.index ?? null;
  const metrics = collectProximityMetrics(point, config, classified, index);
  const flags: ReviewFlag[] = [];

  if (!pointInBbox(point, config)) {
    return { ok: false, reason: "outside_test_area", flags, metrics };
  }

  const base = evaluateSafety(point, config, classified, {
    sourceFeatureId: options.sourceFeatureId,
    requireInsideSourceId: options.requireInsideSourceId,
    index,
  });
  if (base) {
    return { ok: false, reason: base, flags, metrics };
  }

  const sourceProps = options.sourceProps;
  const isLine = LINE_SOURCE_TYPES.has(options.sourceType);
  const isArea = AREA_SOURCE_TYPES.has(options.sourceType);
  const waterside =
    Boolean(sourceProps && isPublicWatersideRoute(sourceProps)) ||
    (options.sourceType === "cycleway_walk" && sourceProps?.towpath === "yes");

  // --- Water ---
  if (metrics.nearestWaterMeters != null) {
    if (metrics.nearestWaterMeters === 0) {
      flags.push("near_water");
      return { ok: false, reason: "inside_water", flags, metrics };
    }

    if (
      options.isAreaGridCandidate &&
      metrics.nearestWaterMeters < config.waterBufferMeters
    ) {
      flags.push("near_water");
      return { ok: false, reason: "too_close_to_water", flags, metrics };
    }

    if (metrics.nearestWaterMeters < config.nearWaterReviewMeters) {
      if (waterside) {
        flags.push("mapped_public_waterside_route", "near_water");
      } else if (isLine) {
        flags.push("near_water", "path_beside_water");
      } else {
        flags.push("near_water", "water_edge_uncertain");
      }
    }
  }

  // --- School (area-grid only hard reject) ---
  if (metrics.nearestSchoolMeters != null) {
    if (
      options.isAreaGridCandidate &&
      isArea &&
      metrics.nearestSchoolMeters < config.schoolBufferMeters
    ) {
      flags.push("near_school");
      return { ok: false, reason: "too_close_to_school", flags, metrics };
    }
    if (metrics.nearestSchoolMeters < config.schoolBufferMeters) {
      if (isLine) flags.push("public_path_near_school", "near_school");
      else flags.push("near_school", "school_boundary_uncertain");
    }
  }

  // --- Barriers / gates ---
  const barrier = nearestBarrier(point, classified, index, config);
  if (barrier.meters != null && barrier.type) {
    const isGate = barrier.type === "gate" || barrier.type === "kissing_gate" || barrier.type === "stile";
    const isFence = barrier.type === "fence" || barrier.type === "wall" || barrier.type === "hedge";
    const privateish =
      barrier.access === "private" ||
      barrier.access === "no" ||
      barrier.access === "customers" ||
      barrier.access === "permissive";

    if (isGate && privateish && barrier.meters < config.gateBufferMeters) {
      flags.push("near_gate", "barrier_access_uncertain");
      return { ok: false, reason: "too_close_to_barrier", flags, metrics };
    }
    if (isGate && barrier.meters < config.gateBufferMeters) {
      flags.push("near_gate");
      if (!barrier.access || barrier.access === "unknown") {
        flags.push("barrier_access_uncertain");
      }
    }
    if (isFence && barrier.meters < config.barrierBufferMeters) {
      flags.push("near_fence", "barrier_access_uncertain");
      return { ok: false, reason: "too_close_to_barrier", flags, metrics };
    }
    if (isFence && barrier.meters < config.gateBufferMeters) {
      flags.push("near_fence", "barrier_access_uncertain");
    }
  }

  // --- BBox edge ---
  if (metrics.distanceToBboxEdgeMeters < config.bboxEdgeBufferMeters) {
    flags.push("near_bbox_edge");
    if (options.isAreaGridCandidate) {
      return { ok: false, reason: "near_bbox_edge", flags, metrics };
    }
  }

  if (
    metrics.nearestMajorRoadMeters != null &&
    metrics.nearestMajorRoadMeters < config.nearMajorRoadReviewMeters
  ) {
    flags.push("near_major_road");
  }

  return {
    ok: true,
    flags: [...new Set(flags)],
    metrics,
    mappedPublicWatersideRoute: waterside && flags.includes("mapped_public_waterside_route"),
  };
}

export { LINE_SOURCE_TYPES, AREA_SOURCE_TYPES };
