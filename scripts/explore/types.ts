/** Explore stop-generator prototype types (Step 4). */

export type SourceFeatureType =
  | "footpath"
  | "pedestrian"
  | "path"
  | "sidewalk"
  | "cycleway_walk"
  | "park"
  | "garden"
  | "recreation_ground"
  | "plaza"
  | "common"
  | "venue"
  | "unsupported";

export type RejectionReason =
  | "inside_water"
  | "inside_building"
  | "on_motorway"
  | "on_trunk_road"
  | "on_primary_road"
  | "on_railway"
  | "private_access"
  | "inside_private_garden"
  | "too_close_to_motorway"
  | "too_close_to_trunk_road"
  | "too_close_to_primary_road"
  | "too_close_to_railway"
  | "too_close_to_water"
  | "too_close_to_barrier"
  | "too_close_to_school"
  | "near_bbox_edge"
  | "outside_test_area"
  | "unsupported_feature"
  | "outside_source_area"
  | "too_close_to_existing_stop"
  | "no_safe_alternative"
  | "alternative_too_far"
  | "residential_without_safe_pedestrian";

export type EnvironmentKey =
  | "freshwater"
  | "wetland"
  | "woodland"
  | "grassland"
  | "farmland"
  | "urban"
  | "park_garden"
  | "general";

export type EnvironmentProfile = Partial<Record<EnvironmentKey, number>> & {
  general?: number;
};

export type ReviewFlag =
  | "near_water"
  | "water_edge_uncertain"
  | "path_beside_water"
  | "mapped_public_waterside_route"
  | "near_school"
  | "school_boundary_uncertain"
  | "public_path_near_school"
  | "near_gate"
  | "near_fence"
  | "barrier_access_uncertain"
  | "near_bbox_edge"
  | "near_major_road"
  | "low_confidence"
  | "alternative_position";

export type ConfidenceReason =
  | "explicit_public_path"
  | "pedestrian_area"
  | "public_access_tag"
  | "mapped_sidewalk"
  | "inside_public_park"
  | "mapped_public_waterside_route"
  | "alternative_position"
  | "near_water"
  | "path_beside_water"
  | "water_edge_uncertain"
  | "near_school"
  | "near_gate"
  | "near_fence"
  | "barrier_access_uncertain"
  | "near_bbox_edge"
  | "unclear_access"
  | "missing_pedestrian_detail";

export type BoundingBox = {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
};

export type GeneratorConfig = BoundingBox & {
  generationVersion: number;
  minimumStopSpacingMeters: number;
  lineCandidateSpacingMeters: number;
  coordinateDecimals: number;
  motorwayBufferMeters: number;
  trunkBufferMeters: number;
  primaryBufferMeters: number;
  railwayBufferMeters: number;
  /** Default water buffer for area / non-path candidates. */
  waterBufferMeters: number;
  /** Stronger water buffer for ordinary path/footpath candidates. */
  pathWaterBufferMeters: number;
  /** Soft review band beyond hard water reject. */
  nearWaterReviewMeters: number;
  barrierBufferMeters: number;
  /** Soft reject / flag distance for private or unclear gates. */
  gateBufferMeters: number;
  schoolBufferMeters: number;
  bboxEdgeBufferMeters: number;
  nearMajorRoadReviewMeters: number;
  environmentRadiusMeters: number;
  /** Max along-line alternative displacement (metres). */
  maxAlternativeDisplacementMeters: number;
  /** Max area alternative displacement (metres). */
  maxAreaAlternativeDisplacementMeters: number;
  maxAreaCandidatesPerFeature: number;
  reviewSampleSeed: string;
  reviewSampleExtraCount: number;
  /** Confidence below this is "low" for review sampling / map filters. */
  lowConfidenceThreshold: number;
  sourceGeoJsonPath: string;
  outputDir: string;
};

export type OsmLikeProperties = {
  id: string;
  name?: string;
  highway?: string;
  footway?: string;
  sidewalk?: string;
  foot?: string;
  bicycle?: string;
  access?: string;
  leisure?: string;
  landuse?: string;
  natural?: string;
  waterway?: string;
  railway?: string;
  building?: string;
  place?: string;
  amenity?: string;
  shop?: string;
  barrier?: string;
  entrance?: string;
  tourism?: string;
  towpath?: string;
  surface?: string;
  explore_source?: SourceFeatureType;
  explore_role?: "source" | "hazard" | "environment";
  [key: string]: unknown;
};

export type LatLon = {
  latitude: number;
  longitude: number;
};

export type CandidateBase = {
  candidateId: string;
  sourceType: SourceFeatureType;
  sourceFeatureId: string;
  candidateIndex: number;
  latitude: number;
  longitude: number;
  alongMeters?: number;
  alternativeIndex: number;
  /** Metres from the primary candidate position (0 for primary). */
  alternativeDisplacementMeters?: number;
  alternativeDirection?: string;
};

export type RejectedCandidate = CandidateBase & {
  rejectionReason: RejectionReason;
};

export type ProximityMetrics = {
  nearestWaterMeters: number | null;
  nearestMajorRoadMeters: number | null;
  nearestSchoolMeters: number | null;
  nearestBarrierMeters: number | null;
  nearestBarrierType: string | null;
  distanceToBboxEdgeMeters: number;
};

export type AcceptedStop = CandidateBase & {
  stopId: string;
  generationVersion: number;
  confidence: number;
  confidenceReasons: ConfidenceReason[];
  environmentProfile: EnvironmentProfile;
  acceptedReason: string;
  priorityKey: string;
  reviewFlags: ReviewFlag[];
  nearWater: boolean;
  nearMajorRoad: boolean;
  nearSchool: boolean;
  nearBarrier: boolean;
  nearBboxEdge: boolean;
  mappedPublicWatersideRoute: boolean;
} & ProximityMetrics;

export type GenerationResult = {
  accepted: AcceptedStop[];
  rejected: RejectedCandidate[];
  summary: GenerationSummary;
};

export type GenerationSummary = {
  sourceFeaturesProcessed: number;
  sourceCandidatesGenerated: number;
  alternativePositionsTested: number;
  acceptedCount: number;
  sourceCandidatesUltimatelyRejected: number;
  rejectedPositionAttempts: number;
  rejectionCountsByReason: Record<string, number>;
  acceptedBySourceType: Record<string, number>;
  acceptedByMainEnvironment: Record<string, number>;
  acceptedByConfidence: Record<string, number>;
  acceptedByConfidenceBand: Record<string, number>;
  acceptedNearWater: number;
  acceptedNearMajorRoad: number;
  acceptedNearSchool: number;
  acceptedNearBarrier: number;
  acceptedNearBboxEdge: number;
  acceptedLowConfidence: number;
  lowConfidenceThreshold: number;
  rejectedByNewStep4Rules: Record<string, number>;
  /** Step 3 → Step 4 comparison snapshot (same extract). */
  comparisonWithStep3?: {
    acceptedBefore: number;
    acceptedAfter: number;
    lowConfidenceBefore: number;
    lowConfidenceAfter: number;
    nearWaterBefore: number;
    nearWaterAfter: number;
    reviewSampleBefore: number;
    reviewSampleAfter: number;
    unclearRemoteReviewBefore: number;
  };
  reviewSampleSize: number;
  minimumSpacingMeters: number | null;
  averageSpacingMeters: number | null;
  generationVersion: number;
  boundingBox: BoundingBox;
  candidatesGenerated: number;
  rejectedCount: number;
};

export type ReviewSampleReason =
  | "low_confidence"
  | "near_water"
  | "near_school"
  | "near_barrier"
  | "near_bbox_edge"
  | "near_major_road"
  | "venue_derived"
  | "source_type_coverage"
  | "seeded_sample";
