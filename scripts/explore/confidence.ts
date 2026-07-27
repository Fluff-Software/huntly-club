import type {
  ConfidenceReason,
  GeneratorConfig,
  OsmLikeProperties,
  ReviewFlag,
  SourceFeatureType,
} from "./types.js";

export type ConfidenceInput = {
  sourceType: SourceFeatureType;
  sourceProps?: OsmLikeProperties;
  reviewFlags: ReviewFlag[];
  alternativeIndex: number;
  alternativeDisplacementMeters: number;
};

/**
 * Deterministic explainable confidence in [0.35, 0.98].
 * Positive factors raise; negative factors lower. Documented in Step 4 doc.
 */
export function scoreConfidence(
  input: ConfidenceInput,
  _config: GeneratorConfig
): { confidence: number; confidenceReasons: ConfidenceReason[] } {
  // Clean primary public footpath → ~0.90; alternatives / hazards pull below 0.75.
  let score = 0.8;
  const reasons: ConfidenceReason[] = [];
  const props = input.sourceProps ?? { id: "unknown" };
  const flags = new Set(input.reviewFlags);

  const positive = (reason: ConfidenceReason, delta: number) => {
    score += delta;
    reasons.push(reason);
  };
  const negative = (reason: ConfidenceReason, delta: number) => {
    score -= delta;
    reasons.push(reason);
  };

  if (
    input.sourceType === "footpath" ||
    input.sourceType === "sidewalk" ||
    input.sourceType === "path" ||
    input.sourceType === "cycleway_walk"
  ) {
    positive("explicit_public_path", 0.1);
  }
  if (input.sourceType === "plaza" || input.sourceType === "pedestrian") {
    positive("pedestrian_area", 0.08);
  }
  if (props.access === "yes" || props.access === "public" || props.foot === "designated") {
    positive("public_access_tag", 0.04);
  }
  if (input.sourceType === "sidewalk" || props.footway === "sidewalk") {
    positive("mapped_sidewalk", 0.05);
  }
  if (
    input.sourceType === "park" ||
    input.sourceType === "garden" ||
    input.sourceType === "recreation_ground" ||
    input.sourceType === "common"
  ) {
    positive("inside_public_park", 0.08);
  }
  if (flags.has("mapped_public_waterside_route")) {
    positive("mapped_public_waterside_route", 0.03);
  }

  if (input.alternativeIndex > 0) {
    negative("alternative_position", 0.15 + Math.min(0.08, input.alternativeDisplacementMeters / 200));
  }
  if (flags.has("near_water") && !flags.has("mapped_public_waterside_route") && !flags.has("path_beside_water")) {
    negative("near_water", 0.12);
  }
  if (flags.has("path_beside_water")) {
    // Explicit path beside water is usually fine — mild review penalty only.
    negative("path_beside_water", 0.04);
  }
  if (flags.has("water_edge_uncertain")) {
    negative("water_edge_uncertain", 0.06);
  }
  if (flags.has("near_school") || flags.has("public_path_near_school")) {
    negative("near_school", 0.08);
  }
  if (flags.has("near_gate")) {
    negative("near_gate", 0.07);
  }
  if (flags.has("near_fence")) {
    negative("near_fence", 0.06);
  }
  if (flags.has("barrier_access_uncertain")) {
    negative("barrier_access_uncertain", 0.05);
  }
  if (flags.has("near_bbox_edge")) {
    negative("near_bbox_edge", 0.1);
  }
  if (props.access === "permissive" || props.access === "destination") {
    negative("unclear_access", 0.05);
  }
  if (
    (input.sourceType === "path" || input.sourceType === "footpath") &&
    !props.foot &&
    !props.surface &&
    props.access == null
  ) {
    negative("missing_pedestrian_detail", 0.02);
  }

  const confidence = Math.round(Math.max(0.35, Math.min(0.98, score)) * 100) / 100;
  return { confidence, confidenceReasons: reasons };
}
