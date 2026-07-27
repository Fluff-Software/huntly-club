/** Explore nearby-stops API / domain types (not Supabase rows). */

export type ExploreStopSourceType =
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
  | "unsupported"
  | string;

export type ExploreReviewFlag =
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
  | "alternative_position"
  | string;

export type ExploreEnvironmentProfile = Record<string, number>;

export type ExploreStop = {
  stopId: string;
  latitude: number;
  longitude: number;
  distanceMetres: number;
  generationVersion: number;
  osmRevision?: string;
  sourceType: ExploreStopSourceType;
  sourceFeatureId: string;
  confidence: number;
  confidenceReasons: string[];
  environmentProfile: ExploreEnvironmentProfile;
  reviewFlags: ExploreReviewFlag[];
  nearestWaterMetres: number | null;
  nearestMajorRoadMetres: number | null;
  nearestSchoolMetres: number | null;
  nearestBarrierMetres: number | null;
  nearestBarrierType: string | null;
  distanceToBboxEdgeMetres: number | null;
};

export type ExploreTestArea = {
  label: string;
  boundingBox: {
    minLatitude: number;
    minLongitude: number;
    maxLatitude: number;
    maxLongitude: number;
  };
};

export type ExploreStopsRequest = {
  latitude: number;
  longitude: number;
  radiusMetres: number;
  generationVersion?: number;
};

export type ExploreStopsResponse = {
  generationVersion: number;
  osmRevision?: string;
  requestedRadiusMetres?: number;
  sourceRadiusMetres?: number;
  tileCount?: number;
  cachedTileCount?: number;
  preparedTileCount?: number;
  sourceFeatureCount?: number;
  /** Present for local Node transport only (legacy Step 5–10). */
  testArea?: ExploreTestArea;
  request: {
    latitude: number;
    longitude: number;
    radiusMetres: number;
  };
  stops: ExploreStop[];
};

export type ExploreStopsErrorCode =
  | "outside_supported_test_area"
  | "invalid_latitude"
  | "invalid_longitude"
  | "invalid_radius"
  | "radius_too_large"
  | "unsupported_generation_version"
  | "missing_parameter"
  | "invalid_parameter"
  | "osm_extract_missing"
  | "backend_unavailable"
  | "invalid_response"
  | "not_configured"
  | "invalid_request"
  | "invalid_stop_id"
  | "invalid_location"
  | "invalid_accuracy"
  | "stop_not_found"
  | "too_far_away"
  | "gps_accuracy_too_low"
  | "generator_unavailable"
  | "unauthenticated"
  | "invalid_profile"
  | "already_claimed"
  | "rate_limited"
  | "claim_failed"
  | "map_data_preparing"
  | "provider_unavailable"
  | "provider_timeout"
  | "cached_tile_invalid"
  | "padded_radius_too_large"
  | "too_many_missing_tiles"
  | string;

export type ExploreStopsError = {
  code: ExploreStopsErrorCode;
  message: string;
  testArea?: ExploreTestArea;
  details?: Record<string, unknown>;
};

export class ExploreStopsRequestError extends Error {
  readonly exploreError: ExploreStopsError;

  constructor(error: ExploreStopsError) {
    super(error.message);
    this.name = "ExploreStopsRequestError";
    this.exploreError = error;
  }
}

export type ExploreVerifyRequest = {
  stopId: string;
  generationVersion?: number;
  osmRevision?: string;
  latitude: number;
  longitude: number;
  accuracyMetres: number;
};

export type ExploreVerifiedStop = {
  stopId: string;
  latitude: number;
  longitude: number;
  generationVersion: number;
  sourceType: string;
  confidence: number;
  environmentProfile: ExploreEnvironmentProfile;
};

export type ExploreVerificationMetrics = {
  distanceMetres?: number;
  claimRadiusMetres?: number;
  reportedAccuracyMetres?: number;
  maximumAccuracyMetres?: number;
};

export type ExploreVerifyResponse = {
  valid: boolean;
  claimable: boolean;
  error?: ExploreStopsErrorCode;
  stop?: ExploreVerifiedStop;
  verification?: ExploreVerificationMetrics;
};

export type ExploreClaimRequest = {
  stopId: string;
  generationVersion?: number;
  osmRevision?: string;
  profileId: number;
  latitude: number;
  longitude: number;
  accuracyMetres: number;
  idempotencyKey: string;
};

export type ExploreClaimRecord = {
  claimId: string;
  stopId: string;
  generationVersion: number;
  claimedAt: string;
  verifiedDistanceMetres: number;
  profileId: number;
  awardedCardId: string | null;
};

export type ExploreClaimSuccess = {
  success: true;
  claim: ExploreClaimRecord;
  award?: ExploreAward;
  idempotentReplay?: boolean;
};

export type ExploreClaimFailure = {
  success: false;
  error: ExploreStopsErrorCode;
  claim?: ExploreClaimRecord;
  award?: ExploreAward;
  details?: Record<string, unknown>;
};

export type ExploreClaimResponse = ExploreClaimSuccess | ExploreClaimFailure;

export type ExploreAwardCard = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  imageUrl: string | null;
  sortOrder?: number;
  habitatWeights?: Record<string, number>;
};

export type ExploreAward = {
  card: ExploreAwardCard;
  isNew: boolean;
  count: number;
  matchedEnvironments: string[];
};

export type ExploreClaimedStopsResponse = {
  success: true;
  profileId: number;
  stopIds: string[];
};

export type ExploreCollectionItem = {
  card: ExploreAwardCard;
  count: number;
  collected: boolean;
  firstCollectedAt: string | null;
  lastCollectedAt: string | null;
};

export type ExploreCollectionResponse = {
  success: true;
  profileId: number;
  items: ExploreCollectionItem[];
};
