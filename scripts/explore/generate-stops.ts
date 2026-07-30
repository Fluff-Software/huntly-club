import * as turf from "@turf/turf";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
} from "geojson";
import { LINE_ALTERNATIVE_OFFSETS_METERS, STEP3_BASELINE } from "./config.js";
import { scoreConfidence } from "./confidence.js";
import { mainEnvironment, scoreEnvironment } from "./environment.js";
import {
  AREA_SOURCE_TYPES,
  LINE_SOURCE_TYPES,
  evaluateSafetyContext,
} from "./safety-context.js";
import {
  haversineMeters,
  loadAndClassify,
  type ClassifiedFeature,
} from "./safety-rules.js";
import { FeatureSpatialIndex } from "./national/spatial-index.js";
import { profileTime } from "./national/profile.js";
import {
  buildCandidateId,
  buildPriorityKey,
  buildStopId,
  stableHashMod,
} from "./stable-hash.js";
import type {
  AcceptedStop,
  CandidateBase,
  GenerationResult,
  GenerationSummary,
  GeneratorConfig,
  LatLon,
  RejectedCandidate,
  ReviewFlag,
  SourceFeatureType,
} from "./types.js";

type RawCandidate = CandidateBase & {
  lineLengthMeters?: number;
};

function roundCoord(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function asLineFeature(feature: Feature): Feature<LineString> | null {
  const g = feature.geometry;
  if (!g) return null;
  if (g.type === "LineString") return feature as Feature<LineString>;
  if (g.type === "MultiLineString") {
    let best: number[][] | null = null;
    let bestLen = -1;
    for (const coords of (g as MultiLineString).coordinates) {
      const line = turf.lineString(coords);
      const len = turf.length(line, { units: "meters" });
      if (len > bestLen) {
        bestLen = len;
        best = coords;
      }
    }
    if (!best) return null;
    return turf.lineString(best, feature.properties ?? {}) as Feature<LineString>;
  }
  return null;
}

function generateLineCandidates(
  item: ClassifiedFeature,
  config: GeneratorConfig
): RawCandidate[] {
  if (!item.sourceType || !LINE_SOURCE_TYPES.has(item.sourceType)) return [];
  const line = asLineFeature(item.feature);
  if (!line) return [];

  const lengthMeters = turf.length(line, { units: "meters" });
  if (lengthMeters < 20) return [];

  const spacing = config.lineCandidateSpacingMeters;
  const offset = stableHashMod(
    `v${config.generationVersion}|${item.id}|line-offset`,
    spacing
  );

  const out: RawCandidate[] = [];
  let index = 0;
  for (let d = offset; d <= lengthMeters; d += spacing) {
    if (d <= 0 || d >= lengthMeters) {
      index += 1;
      continue;
    }
    const pt = turf.along(line, d, { units: "meters" });
    const [longitude, latitude] = pt.geometry.coordinates;
    out.push({
      candidateId: buildCandidateId({
        generationVersion: config.generationVersion,
        sourceType: item.sourceType,
        sourceFeatureId: item.id,
        candidateIndex: index,
      }),
      sourceType: item.sourceType,
      sourceFeatureId: item.id,
      candidateIndex: index,
      latitude,
      longitude,
      alongMeters: d,
      alternativeIndex: 0,
      alternativeDisplacementMeters: 0,
      alternativeDirection: "primary",
      lineLengthMeters: lengthMeters,
    });
    index += 1;
  }
  return out;
}

function generateAreaCandidates(
  item: ClassifiedFeature,
  config: GeneratorConfig
): RawCandidate[] {
  if (!item.sourceType || !AREA_SOURCE_TYPES.has(item.sourceType)) return [];
  const geom = item.feature.geometry;
  if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) return [];

  const poly = item.feature as Feature<Polygon | MultiPolygon>;
  const [minX, minY, maxX, maxY] = turf.bbox(poly);
  const cells = Math.max(3, Math.ceil(Math.sqrt(config.maxAreaCandidatesPerFeature * 2)));
  const candidates: RawCandidate[] = [];
  let rawIndex = 0;

  for (let row = 1; row < cells; row++) {
    for (let col = 1; col < cells; col++) {
      const x = minX + ((maxX - minX) * col) / cells;
      const y = minY + ((maxY - minY) * row) / cells;
      const pt = turf.point([x, y]);
      if (!turf.booleanPointInPolygon(pt, poly)) continue;

      const ring = turf.polygonToLine(poly);
      let edgeDist = Number.POSITIVE_INFINITY;
      if (ring.type === "FeatureCollection") {
        for (const f of ring.features) {
          const n = turf.nearestPointOnLine(f as Feature<LineString>, pt, { units: "meters" });
          edgeDist = Math.min(edgeDist, n.properties.dist ?? Number.POSITIVE_INFINITY);
        }
      } else {
        edgeDist =
          turf.nearestPointOnLine(ring as Feature<LineString>, pt, { units: "meters" }).properties
            .dist ?? Number.POSITIVE_INFINITY;
      }
      if (edgeDist < 8) continue;

      candidates.push({
        candidateId: buildCandidateId({
          generationVersion: config.generationVersion,
          sourceType: item.sourceType,
          sourceFeatureId: item.id,
          candidateIndex: rawIndex,
        }),
        sourceType: item.sourceType,
        sourceFeatureId: item.id,
        candidateIndex: rawIndex,
        latitude: y,
        longitude: x,
        alternativeIndex: 0,
        alternativeDisplacementMeters: 0,
        alternativeDirection: "primary",
      });
      rawIndex += 1;
    }
  }

  candidates.sort((a, b) => a.candidateIndex - b.candidateIndex);
  return candidates.slice(0, config.maxAreaCandidatesPerFeature);
}

function tryLineAlternatives(
  candidate: RawCandidate,
  item: ClassifiedFeature,
  config: GeneratorConfig,
  classified: ClassifiedFeature[],
  index: FeatureSpatialIndex | null
): { accepted: RawCandidate } | { rejected: RejectedCandidate[] } {
  const line = asLineFeature(item.feature);
  if (!line || candidate.alongMeters == null || candidate.lineLengthMeters == null) {
    return {
      rejected: [{ ...candidate, rejectionReason: "no_safe_alternative" }],
    };
  }

  const rejected: RejectedCandidate[] = [];
  for (let alt = 0; alt < LINE_ALTERNATIVE_OFFSETS_METERS.length; alt++) {
    const offset = LINE_ALTERNATIVE_OFFSETS_METERS[alt]!;
    if (Math.abs(offset) > config.maxAlternativeDisplacementMeters) {
      rejected.push({
        ...candidate,
        alternativeIndex: alt,
        alternativeDisplacementMeters: Math.abs(offset),
        alternativeDirection: offset < 0 ? "backwards" : offset > 0 ? "forwards" : "primary",
        rejectionReason: "alternative_too_far",
      });
      continue;
    }
    const along = candidate.alongMeters + offset;
    if (along <= 0 || along >= candidate.lineLengthMeters) continue;

    const pt = turf.along(line, along, { units: "meters" });
    const [longitude, latitude] = pt.geometry.coordinates;
    const attempt: RawCandidate = {
      ...candidate,
      latitude,
      longitude,
      alongMeters: along,
      alternativeIndex: alt,
      alternativeDisplacementMeters: Math.abs(offset),
      alternativeDirection: offset < 0 ? "backwards" : offset > 0 ? "forwards" : "primary",
    };
    const result = evaluateSafetyContext(
      { latitude, longitude },
      config,
      classified,
      {
        sourceFeatureId: candidate.sourceFeatureId,
        sourceType: candidate.sourceType,
        sourceProps: item.props,
        isAreaGridCandidate: false,
        index,
      }
    );
    if (result.ok) return { accepted: attempt };
    rejected.push({ ...attempt, rejectionReason: result.reason });
  }
  if (rejected.length === 0) {
    rejected.push({ ...candidate, rejectionReason: "no_safe_alternative" });
  }
  return { rejected };
}

/** Area alts: primary only + tiny N/E nudges within max displacement (stay in polygon). */
const AREA_ALTERNATIVE_OFFSETS_METERS: ReadonlyArray<{
  dlon: number;
  dlat: number;
  direction: string;
  meters: number;
}> = [
  { dlon: 0, dlat: 0, direction: "primary", meters: 0 },
  { dlon: 0, dlat: 0.000135, direction: "north", meters: 15 },
  { dlon: 0, dlat: -0.000135, direction: "south", meters: 15 },
  { dlon: 0.0002, dlat: 0, direction: "east", meters: 15 },
  { dlon: -0.0002, dlat: 0, direction: "west", meters: 15 },
];

function tryAreaAlternatives(
  candidate: RawCandidate,
  item: ClassifiedFeature,
  config: GeneratorConfig,
  classified: ClassifiedFeature[],
  index: FeatureSpatialIndex | null
): { accepted: RawCandidate } | { rejected: RejectedCandidate[] } {
  const rejected: RejectedCandidate[] = [];
  for (let alt = 0; alt < AREA_ALTERNATIVE_OFFSETS_METERS.length; alt++) {
    const spec = AREA_ALTERNATIVE_OFFSETS_METERS[alt]!;
    if (spec.meters > config.maxAreaAlternativeDisplacementMeters) {
      rejected.push({
        ...candidate,
        alternativeIndex: alt,
        alternativeDisplacementMeters: spec.meters,
        alternativeDirection: spec.direction,
        rejectionReason: "alternative_too_far",
      });
      continue;
    }
    const attempt: RawCandidate = {
      ...candidate,
      latitude: candidate.latitude + spec.dlat,
      longitude: candidate.longitude + spec.dlon,
      alternativeIndex: alt,
      alternativeDisplacementMeters: spec.meters,
      alternativeDirection: spec.direction,
    };
    const result = evaluateSafetyContext(
      { latitude: attempt.latitude, longitude: attempt.longitude },
      config,
      classified,
      {
        sourceFeatureId: attempt.sourceFeatureId,
        sourceType: attempt.sourceType,
        sourceProps: item.props,
        isAreaGridCandidate: true,
        requireInsideSourceId: attempt.sourceFeatureId,
        index,
      }
    );
    if (result.ok) return { accepted: attempt };
    rejected.push({ ...attempt, rejectionReason: result.reason });
  }
  return { rejected };
}

function applySpacing(
  survivors: RawCandidate[],
  config: GeneratorConfig
): { accepted: RawCandidate[]; rejected: RejectedCandidate[] } {
  const ranked = survivors
    .map((c) => ({
      candidate: c,
      priorityKey: buildPriorityKey({
        generationVersion: config.generationVersion,
        sourceType: c.sourceType,
        sourceFeatureId: c.sourceFeatureId,
        candidateIndex: c.candidateIndex,
      }),
    }))
    .sort((a, b) => {
      if (a.priorityKey !== b.priorityKey) return a.priorityKey < b.priorityKey ? -1 : 1;
      const ak = `${a.candidate.sourceFeatureId}|${a.candidate.candidateIndex}`;
      const bk = `${b.candidate.sourceFeatureId}|${b.candidate.candidateIndex}`;
      return ak < bk ? -1 : ak > bk ? 1 : 0;
    });

  const kept: RawCandidate[] = [];
  const rejected: RejectedCandidate[] = [];

  for (const { candidate, priorityKey } of ranked) {
    const tooClose = kept.some(
      (k) =>
        haversineMeters(
          { latitude: candidate.latitude, longitude: candidate.longitude },
          { latitude: k.latitude, longitude: k.longitude }
        ) < config.minimumStopSpacingMeters
    );
    if (tooClose) {
      rejected.push({
        ...candidate,
        rejectionReason: "too_close_to_existing_stop",
      });
      continue;
    }
    const withKey = candidate as RawCandidate & { priorityKey: string };
    withKey.priorityKey = priorityKey;
    kept.push(withKey);
  }

  return { accepted: kept, rejected };
}

function spacingStats(accepted: AcceptedStop[]): {
  minimumSpacingMeters: number | null;
  averageSpacingMeters: number | null;
} {
  if (accepted.length < 2) {
    return { minimumSpacingMeters: null, averageSpacingMeters: null };
  }
  const distances: number[] = [];
  for (let i = 0; i < accepted.length; i++) {
    let nearest = Number.POSITIVE_INFINITY;
    for (let j = 0; j < accepted.length; j++) {
      if (i === j) continue;
      nearest = Math.min(nearest, haversineMeters(accepted[i]!, accepted[j]!));
    }
    distances.push(nearest);
  }
  return {
    minimumSpacingMeters: Math.round(Math.min(...distances) * 10) / 10,
    averageSpacingMeters:
      Math.round((distances.reduce((a, b) => a + b, 0) / distances.length) * 10) / 10,
  };
}

function confidenceBand(confidence: number): string {
  if (confidence >= 0.85) return "high_ge_0.85";
  if (confidence >= 0.7) return "mid_0.70_0.84";
  return "low_lt_0.70";
}

const STEP4_REJECTION_REASONS = new Set([
  "too_close_to_school",
  "near_bbox_edge",
  "alternative_too_far",
  "too_close_to_barrier",
  "too_close_to_water",
]);

function buildSummary(
  config: GeneratorConfig,
  sourceCount: number,
  sourceCandidatesGenerated: number,
  alternativePositionsTested: number,
  accepted: AcceptedStop[],
  rejected: RejectedCandidate[],
  reviewSampleSize: number
): GenerationSummary {
  const rejectionCountsByReason: Record<string, number> = {};
  const rejectedByNewStep4Rules: Record<string, number> = {};
  for (const r of rejected) {
    rejectionCountsByReason[r.rejectionReason] =
      (rejectionCountsByReason[r.rejectionReason] ?? 0) + 1;
    if (STEP4_REJECTION_REASONS.has(r.rejectionReason)) {
      rejectedByNewStep4Rules[r.rejectionReason] =
        (rejectedByNewStep4Rules[r.rejectionReason] ?? 0) + 1;
    }
  }

  const acceptedBySourceType: Record<string, number> = {};
  const acceptedByMainEnvironment: Record<string, number> = {};
  const acceptedByConfidence: Record<string, number> = {};
  const acceptedByConfidenceBand: Record<string, number> = {};
  let acceptedNearWater = 0;
  let acceptedNearMajorRoad = 0;
  let acceptedNearSchool = 0;
  let acceptedNearBarrier = 0;
  let acceptedNearBboxEdge = 0;
  let acceptedLowConfidence = 0;

  for (const s of accepted) {
    acceptedBySourceType[s.sourceType] = (acceptedBySourceType[s.sourceType] ?? 0) + 1;
    const env = mainEnvironment(s.environmentProfile);
    acceptedByMainEnvironment[env] = (acceptedByMainEnvironment[env] ?? 0) + 1;
    const confKey = String(s.confidence);
    acceptedByConfidence[confKey] = (acceptedByConfidence[confKey] ?? 0) + 1;
    const band = confidenceBand(s.confidence);
    acceptedByConfidenceBand[band] = (acceptedByConfidenceBand[band] ?? 0) + 1;
    if (s.nearWater) acceptedNearWater += 1;
    if (s.nearMajorRoad) acceptedNearMajorRoad += 1;
    if (s.nearSchool) acceptedNearSchool += 1;
    if (s.nearBarrier) acceptedNearBarrier += 1;
    if (s.nearBboxEdge) acceptedNearBboxEdge += 1;
    if (s.confidence < config.lowConfidenceThreshold) acceptedLowConfidence += 1;
  }

  const { minimumSpacingMeters, averageSpacingMeters } = spacingStats(accepted);
  return {
    sourceFeaturesProcessed: sourceCount,
    sourceCandidatesGenerated,
    alternativePositionsTested,
    acceptedCount: accepted.length,
    sourceCandidatesUltimatelyRejected: Math.max(
      0,
      sourceCandidatesGenerated - accepted.length
    ),
    rejectedPositionAttempts: rejected.length,
    rejectionCountsByReason,
    acceptedBySourceType,
    acceptedByMainEnvironment,
    acceptedByConfidence,
    acceptedByConfidenceBand,
    acceptedNearWater,
    acceptedNearMajorRoad,
    acceptedNearSchool,
    acceptedNearBarrier,
    acceptedNearBboxEdge,
    acceptedLowConfidence,
    lowConfidenceThreshold: config.lowConfidenceThreshold,
    rejectedByNewStep4Rules,
    comparisonWithStep3: {
      acceptedBefore: STEP3_BASELINE.acceptedCount,
      acceptedAfter: accepted.length,
      lowConfidenceBefore: STEP3_BASELINE.acceptedLowConfidence,
      lowConfidenceAfter: acceptedLowConfidence,
      nearWaterBefore: STEP3_BASELINE.acceptedNearWater,
      nearWaterAfter: acceptedNearWater,
      reviewSampleBefore: STEP3_BASELINE.reviewSampleSize,
      reviewSampleAfter: reviewSampleSize,
      unclearRemoteReviewBefore: STEP3_BASELINE.unclearRemoteReview,
    },
    reviewSampleSize,
    minimumSpacingMeters,
    averageSpacingMeters,
    generationVersion: config.generationVersion,
    boundingBox: {
      minLatitude: config.minLatitude,
      minLongitude: config.minLongitude,
      maxLatitude: config.maxLatitude,
      maxLongitude: config.maxLongitude,
    },
    candidatesGenerated: sourceCandidatesGenerated,
    rejectedCount: rejected.length,
  };
}

function finalizeAccepted(
  c: RawCandidate,
  config: GeneratorConfig,
  classified: ClassifiedFeature[],
  sourceProps: Map<string, ClassifiedFeature>,
  index: FeatureSpatialIndex | null
): AcceptedStop | null {
  const latitude = roundCoord(c.latitude, config.coordinateDecimals);
  const longitude = roundCoord(c.longitude, config.coordinateDecimals);
  const point: LatLon = { latitude, longitude };
  const item = sourceProps.get(c.sourceFeatureId);
  const safety = evaluateSafetyContext(point, config, classified, {
    sourceFeatureId: c.sourceFeatureId,
    sourceType: c.sourceType,
    sourceProps: item?.props,
    isAreaGridCandidate: AREA_SOURCE_TYPES.has(c.sourceType),
    requireInsideSourceId: AREA_SOURCE_TYPES.has(c.sourceType)
      ? c.sourceFeatureId
      : undefined,
    index,
  });
  if (!safety.ok) return null;

  const flags: ReviewFlag[] = [...safety.flags];
  if (c.alternativeIndex > 0) flags.push("alternative_position");

  const { confidence, confidenceReasons } = scoreConfidence(
    {
      sourceType: c.sourceType,
      sourceProps: item?.props,
      reviewFlags: flags,
      alternativeIndex: c.alternativeIndex,
      alternativeDisplacementMeters: c.alternativeDisplacementMeters ?? 0,
    },
    config
  );
  if (confidence < config.lowConfidenceThreshold) flags.push("low_confidence");

  // Environment only after safety acceptance.
  const environmentProfile = scoreEnvironment(
    point,
    config,
    classified,
    c.sourceType,
    index
  );
  const priorityKey =
    (c as RawCandidate & { priorityKey?: string }).priorityKey ??
    buildPriorityKey({
      generationVersion: config.generationVersion,
      sourceType: c.sourceType,
      sourceFeatureId: c.sourceFeatureId,
      candidateIndex: c.candidateIndex,
    });

  const uniqueFlags = [...new Set(flags)];
  return {
    ...c,
    latitude,
    longitude,
    stopId: buildStopId({
      generationVersion: config.generationVersion,
      sourceType: c.sourceType,
      sourceFeatureId: c.sourceFeatureId,
      candidateIndex: c.candidateIndex,
      latitude,
      longitude,
      coordinateDecimals: config.coordinateDecimals,
    }),
    generationVersion: config.generationVersion,
    confidence,
    confidenceReasons,
    environmentProfile,
    acceptedReason: "passed_safety_and_spacing",
    priorityKey,
    reviewFlags: uniqueFlags,
    nearWater: uniqueFlags.includes("near_water") || uniqueFlags.includes("mapped_public_waterside_route"),
    nearMajorRoad: uniqueFlags.includes("near_major_road"),
    nearSchool:
      uniqueFlags.includes("near_school") ||
      uniqueFlags.includes("public_path_near_school") ||
      uniqueFlags.includes("school_boundary_uncertain"),
    nearBarrier:
      uniqueFlags.includes("near_gate") ||
      uniqueFlags.includes("near_fence") ||
      uniqueFlags.includes("barrier_access_uncertain"),
    nearBboxEdge: uniqueFlags.includes("near_bbox_edge"),
    mappedPublicWatersideRoute: uniqueFlags.includes("mapped_public_waterside_route"),
    ...safety.metrics,
  };
}

export type GenerateStopsOptions = {
  /** Build RBush index (default true). Set false only for A/B legacy comparison. */
  useSpatialIndex?: boolean;
  /** Reuse a pre-built classified list (regional block reuse). */
  classified?: ClassifiedFeature[];
  /** Reuse a pre-built spatial index. */
  index?: FeatureSpatialIndex | null;
  /**
   * Only emit candidates from these source feature ids.
   * Safety / environment still use the full classified list + index.
   */
  sourceIdAllowlist?: Set<string>;
};

/**
 * Core deterministic generator. Pure with respect to inputs.
 * Does not touch any database.
 */
export function generateStops(
  collection: FeatureCollection,
  config: GeneratorConfig,
  options?: GenerateStopsOptions
): GenerationResult {
  return profileTime("generate_stops_ms", () => {
    const useIndex = options?.useSpatialIndex !== false;
    const classified =
      options?.classified ??
      profileTime("classify_ms", () => loadAndClassify(collection));
    const index =
      options?.index !== undefined
        ? options.index
        : useIndex
          ? new FeatureSpatialIndex(classified)
          : null;

    const sources = classified
      .filter((c) => c.role === "source" && c.sourceType)
      .filter((c) => !options?.sourceIdAllowlist || options.sourceIdAllowlist.has(c.id))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const sourceProps = new Map(sources.map((s) => [s.id, s]));

    const allRejected: RejectedCandidate[] = [];
    const survivors: RawCandidate[] = [];
    let sourceCandidatesGenerated = 0;
    let alternativePositionsTested = 0;

    for (const item of sources) {
      const sourceType = item.sourceType as SourceFeatureType;
      if (LINE_SOURCE_TYPES.has(sourceType)) {
        const candidates = generateLineCandidates(item, config);
        sourceCandidatesGenerated += candidates.length;
        for (const candidate of candidates) {
          const result = tryLineAlternatives(candidate, item, config, classified, index);
          if ("accepted" in result) {
            alternativePositionsTested += result.accepted.alternativeIndex + 1;
            survivors.push(result.accepted);
          } else {
            alternativePositionsTested += Math.max(1, result.rejected.length);
            allRejected.push(...result.rejected);
          }
        }
      } else if (AREA_SOURCE_TYPES.has(sourceType)) {
        const candidates = generateAreaCandidates(item, config);
        sourceCandidatesGenerated += candidates.length;
        for (const candidate of candidates) {
          const result = tryAreaAlternatives(candidate, item, config, classified, index);
          if ("accepted" in result) {
            alternativePositionsTested += result.accepted.alternativeIndex + 1;
            survivors.push(result.accepted);
          } else {
            alternativePositionsTested += Math.max(1, result.rejected.length);
            allRejected.push(...result.rejected);
          }
        }
      } else {
        allRejected.push({
          candidateId: buildCandidateId({
            generationVersion: config.generationVersion,
            sourceType: "unsupported",
            sourceFeatureId: item.id,
            candidateIndex: 0,
          }),
          sourceType: "unsupported",
          sourceFeatureId: item.id,
          candidateIndex: 0,
          latitude: 0,
          longitude: 0,
          alternativeIndex: 0,
          rejectionReason: "unsupported_feature",
        });
      }
    }

    const spaced = applySpacing(survivors, config);
    allRejected.push(...spaced.rejected);

    const accepted: AcceptedStop[] = [];
    for (const c of spaced.accepted) {
      const stop = finalizeAccepted(c, config, classified, sourceProps, index);
      if (stop) accepted.push(stop);
      else {
        allRejected.push({
          ...c,
          rejectionReason: "no_safe_alternative",
        });
      }
    }

    accepted.sort((a, b) => (a.stopId < b.stopId ? -1 : a.stopId > b.stopId ? 1 : 0));
    allRejected.sort((a, b) => {
      const ak = `${a.sourceFeatureId}|${a.candidateIndex}|${a.alternativeIndex}|${a.rejectionReason}`;
      const bk = `${b.sourceFeatureId}|${b.candidateIndex}|${b.alternativeIndex}|${b.rejectionReason}`;
      return ak < bk ? -1 : ak > bk ? 1 : 0;
    });

    return {
      accepted,
      rejected: allRejected,
      summary: buildSummary(
        config,
        sources.length,
        sourceCandidatesGenerated,
        alternativePositionsTested,
        accepted,
        allRejected,
        0
      ),
    };
  });
}

export function toAcceptedGeoJson(accepted: AcceptedStop[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: accepted.map((s) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [s.longitude, s.latitude],
      },
      properties: {
        stop_id: s.stopId,
        latitude: s.latitude,
        longitude: s.longitude,
        generation_version: s.generationVersion,
        source_type: s.sourceType,
        source_feature_id: s.sourceFeatureId,
        candidate_index: s.candidateIndex,
        confidence: s.confidence,
        confidence_reasons: s.confidenceReasons,
        environment_profile: s.environmentProfile,
        accepted_reason: s.acceptedReason,
        review_flags: s.reviewFlags,
        near_water: s.nearWater,
        near_major_road: s.nearMajorRoad,
        near_school: s.nearSchool,
        near_barrier: s.nearBarrier,
        near_bbox_edge: s.nearBboxEdge,
        mapped_public_waterside_route: s.mappedPublicWatersideRoute,
        nearest_water_meters: s.nearestWaterMeters,
        nearest_major_road_meters: s.nearestMajorRoadMeters,
        nearest_school_meters: s.nearestSchoolMeters,
        nearest_barrier_meters: s.nearestBarrierMeters,
        nearest_barrier_type: s.nearestBarrierType,
        distance_to_bbox_edge_meters: s.distanceToBboxEdgeMeters,
        alternative_index: s.alternativeIndex,
        alternative_displacement_meters: s.alternativeDisplacementMeters ?? 0,
        alternative_direction: s.alternativeDirection ?? "primary",
      },
    })),
  };
}

export function toRejectedGeoJson(rejected: RejectedCandidate[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: rejected
      .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude))
      .filter((r) => !(r.latitude === 0 && r.longitude === 0))
      .map((r) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [r.longitude, r.latitude],
        },
        properties: {
          candidate_id: r.candidateId,
          latitude: r.latitude,
          longitude: r.longitude,
          source_type: r.sourceType,
          source_feature_id: r.sourceFeatureId,
          candidate_index: r.candidateIndex,
          rejection_reason: r.rejectionReason,
          alternative_index: r.alternativeIndex,
          alternative_displacement_meters: r.alternativeDisplacementMeters ?? 0,
          alternative_direction: r.alternativeDirection ?? "primary",
        },
      })),
  };
}

export function formatSummary(summary: GenerationSummary): string {
  const lines = [
    "=== Explore stop generator summary ===",
    `Generation version: ${summary.generationVersion}`,
    `BBox: [${summary.boundingBox.minLatitude}, ${summary.boundingBox.minLongitude}] → [${summary.boundingBox.maxLatitude}, ${summary.boundingBox.maxLongitude}]`,
    `Source features processed: ${summary.sourceFeaturesProcessed}`,
    `Source candidates generated: ${summary.sourceCandidatesGenerated}`,
    `Alternative positions tested: ${summary.alternativePositionsTested}`,
    `Accepted: ${summary.acceptedCount}`,
    `Source candidates ultimately rejected: ${summary.sourceCandidatesUltimatelyRejected}`,
    `Rejected position attempts: ${summary.rejectedPositionAttempts}`,
    `Accepted near water: ${summary.acceptedNearWater}`,
    `Accepted near school: ${summary.acceptedNearSchool}`,
    `Accepted near barrier: ${summary.acceptedNearBarrier}`,
    `Accepted near bbox edge: ${summary.acceptedNearBboxEdge}`,
    `Accepted low confidence: ${summary.acceptedLowConfidence}`,
    `Review sample size: ${summary.reviewSampleSize}`,
    ...(summary.comparisonWithStep3
      ? [
          "Comparison vs Step 3 (same extract):",
          `  - accepted: ${summary.comparisonWithStep3.acceptedBefore} → ${summary.comparisonWithStep3.acceptedAfter}`,
          `  - low confidence: ${summary.comparisonWithStep3.lowConfidenceBefore} → ${summary.comparisonWithStep3.lowConfidenceAfter}`,
          `  - near water: ${summary.comparisonWithStep3.nearWaterBefore} → ${summary.comparisonWithStep3.nearWaterAfter}`,
          `  - review sample: ${summary.comparisonWithStep3.reviewSampleBefore} → ${summary.comparisonWithStep3.reviewSampleAfter}`,
          `  - unclear remote (Step 3): ${summary.comparisonWithStep3.unclearRemoteReviewBefore}`,
        ]
      : []),
    "Rejection by reason:",
    ...Object.entries(summary.rejectionCountsByReason)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([reason, count]) => `  - ${reason}: ${count}`),
    "Step 4 rule rejects:",
    ...Object.entries(summary.rejectedByNewStep4Rules)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([reason, count]) => `  - ${reason}: ${count}`),
    "Accepted by source type:",
    ...Object.entries(summary.acceptedBySourceType)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([t, count]) => `  - ${t}: ${count}`),
    "Accepted by confidence band:",
    ...Object.entries(summary.acceptedByConfidenceBand)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([t, count]) => `  - ${t}: ${count}`),
    `Min nearest-neighbour spacing (m): ${summary.minimumSpacingMeters ?? "n/a"}`,
    `Avg nearest-neighbour spacing (m): ${summary.averageSpacingMeters ?? "n/a"}`,
  ];
  return lines.join("\n");
}
