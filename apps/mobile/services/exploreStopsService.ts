/**
 * Client for the Explore nearby-stops backend.
 * Default transport: Supabase Edge Functions (Step 10.2).
 * Local Node transport retained for DEV side-by-side tests only.
 * Does not run the generator, load OSM, or touch explore_locations.
 */
import {
  ExploreStopsRequestError,
  type ExploreClaimRequest,
  type ExploreClaimResponse,
  type ExploreClaimedStopsResponse,
  type ExploreCollectionResponse,
  type ExploreStop,
  type ExploreStopsError,
  type ExploreStopsRequest,
  type ExploreStopsResponse,
  type ExploreTestArea,
  type ExploreVerifyRequest,
  type ExploreVerifyResponse,
} from "@/types/exploreStops";
import { getCurrentSession } from "@/services/authService";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "@/services/supabase";
import {
  getExploreApiBaseUrl,
  resolveExploreTransport,
} from "@/utils/exploreApiConfig";

export { ExploreStopsRequestError };

const DEFAULT_GENERATION_VERSION = 2;

/** Short-lived pan cache — avoids repeat Edge calls while panning the same area. */
const NEARBY_CACHE_TTL_MS = 45_000;
const NEARBY_CACHE_MAX = 48;

type NearbyCacheEntry = {
  expiresAt: number;
  response: ExploreStopsResponse;
};

const nearbyStopsCache = new Map<string, NearbyCacheEntry>();

function nearbyCacheKey(request: ExploreStopsRequest): string {
  // ~110 m grid; radius in 50 m buckets.
  const lat = request.latitude.toFixed(3);
  const lon = request.longitude.toFixed(3);
  const radius = Math.round(request.radiusMetres / 50) * 50;
  const version = request.generationVersion ?? DEFAULT_GENERATION_VERSION;
  return `${lat}:${lon}:${radius}:${version}`;
}

function readNearbyCache(key: string): ExploreStopsResponse | null {
  const hit = nearbyStopsCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    nearbyStopsCache.delete(key);
    return null;
  }
  return hit.response;
}

function writeNearbyCache(key: string, response: ExploreStopsResponse): void {
  if (nearbyStopsCache.size >= NEARBY_CACHE_MAX) {
    const oldest = nearbyStopsCache.keys().next().value;
    if (oldest != null) nearbyStopsCache.delete(oldest);
  }
  nearbyStopsCache.set(key, {
    expiresAt: Date.now() + NEARBY_CACHE_TTL_MS,
    response,
  });
}

type RawNearbyStop = {
  id?: string;
  stop_id?: string;
  latitude: number;
  longitude: number;
  distance_metres: number;
  generation_version: number;
  osm_revision?: string;
  type?: number;
  point_type?: number;
  source_type: string;
  source_feature_id?: string;
  confidence?: number;
  confidence_reasons?: string[];
  environment_profile?: Record<string, number>;
  review_flags?: string[];
  nearest_water_meters?: number | null;
  nearest_major_road_meters?: number | null;
  nearest_school_meters?: number | null;
  nearest_barrier_meters?: number | null;
  nearest_barrier_type?: string | null;
  distance_to_bbox_edge_meters?: number | null;
};

type RawNearbySuccess = {
  generation_version: number;
  osm_revision?: string;
  requested_radius_metres?: number;
  source_radius_metres?: number;
  tile_count?: number;
  cached_tile_count?: number;
  prepared_tile_count?: number;
  source_feature_count?: number;
  test_area?: {
    label: string;
    bounding_box: {
      min_latitude: number;
      min_longitude: number;
      max_latitude: number;
      max_longitude: number;
    };
  };
  request?: {
    latitude: number;
    longitude: number;
    radius_metres: number;
  };
  stops: RawNearbyStop[];
};

function mapTestArea(raw: NonNullable<RawNearbySuccess["test_area"]>): ExploreTestArea {
  return {
    label: raw.label,
    boundingBox: {
      minLatitude: raw.bounding_box.min_latitude,
      minLongitude: raw.bounding_box.min_longitude,
      maxLatitude: raw.bounding_box.max_latitude,
      maxLongitude: raw.bounding_box.max_longitude,
    },
  };
}

function mapStop(raw: RawNearbyStop): ExploreStop {
  const stopId = raw.stop_id ?? raw.id ?? "";
  return {
    stopId,
    latitude: raw.latitude,
    longitude: raw.longitude,
    distanceMetres: raw.distance_metres,
    generationVersion: raw.generation_version,
    osmRevision: raw.osm_revision,
    sourceType: raw.source_type,
    sourceFeatureId: raw.source_feature_id ?? "",
    confidence: raw.confidence ?? 0,
    confidenceReasons: raw.confidence_reasons ?? [],
    environmentProfile: raw.environment_profile ?? {},
    reviewFlags: raw.review_flags ?? [],
    nearestWaterMetres: raw.nearest_water_meters ?? null,
    nearestMajorRoadMetres: raw.nearest_major_road_meters ?? null,
    nearestSchoolMetres: raw.nearest_school_meters ?? null,
    nearestBarrierMetres: raw.nearest_barrier_meters ?? null,
    nearestBarrierType: raw.nearest_barrier_type ?? null,
    distanceToBboxEdgeMetres: raw.distance_to_bbox_edge_meters ?? null,
  };
}

function isRawNearbySuccess(value: unknown): value is RawNearbySuccess {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.generation_version === "number" && Array.isArray(v.stops);
}

function friendlyMessage(code: string, fallback: string): string {
  switch (code) {
    case "map_data_preparing":
    case "too_many_missing_tiles":
    case "generator_unavailable":
      return "Explore is preparing this area. Try again in a few seconds.";
    case "provider_unavailable":
    case "provider_timeout":
      return "Map data is still preparing. Try again in a few seconds.";
    case "WORKER_RESOURCE_LIMIT":
    case "worker_resource_limit":
      return "Explore is still warming this area. Try again in a moment.";
    case "cached_tile_invalid":
      return "Map data needs a refresh. Please try again.";
    case "rate_limited":
      return "Whoa, slow down a little — try again in a moment.";
    case "radius_too_large":
    case "padded_radius_too_large":
      return "That search area is a bit too big. Zoom in and try again.";
    case "unauthenticated":
      return "Sign in to use Explore.";
    case "no_coverage":
      return "This place isn’t covered by Explore yet.";
    case "no_nearby_points":
      return "No spots in view. Pan toward parks, footpaths, or green space.";
    case "outside_supported_test_area":
      return "You’re outside Explore coverage for now.";
    case "too_far_away":
    case "too_far":
      return "Get closer to this spot to collect the card.";
    case "gps_accuracy_too_low":
    case "accuracy_too_poor":
    case "invalid_accuracy":
      return "GPS is a bit fuzzy right now. Try again somewhere more open.";
    case "already_claimed":
      return "You’ve already collected this spot.";
    case "stop_not_found":
      return "That Explore spot is no longer available.";
    case "invalid_profile":
      return "Choose a player profile to collect cards.";
    case "claim_failed":
      return "Couldn’t collect this card. Please try again.";
    case "backend_unavailable":
      return "Explore is temporarily unavailable. Please try again in a moment.";
    case "invalid_response":
    case "invalid_request":
    case "invalid_parameter":
    case "missing_parameter":
      return "Something went wrong. Please try again.";
    case "not_configured":
      return "Explore isn’t set up on this build yet.";
    case "invalid_location":
    case "invalid_latitude":
    case "invalid_longitude":
      return "We couldn’t read your location. Check GPS and try again.";
    default:
      return fallback;
  }
}

/** User-facing copy for Explore error / claim codes. */
export function exploreUserMessage(
  code: string,
  fallback = "Something went wrong. Please try again."
): string {
  return friendlyMessage(code, fallback);
}

function mapBackendError(payload: unknown, status: number): ExploreStopsError {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    const code =
      typeof p.code === "string"
        ? p.code
        : typeof p.error === "string"
          ? p.error
          : `http_${status}`;
    const testArea =
      p.test_area && typeof p.test_area === "object"
        ? mapTestArea(p.test_area as NonNullable<RawNearbySuccess["test_area"]>)
        : undefined;
    const message =
      typeof p.message === "string"
        ? p.message
        : friendlyMessage(code, `Explore backend error: ${code}`);
    const details: Record<string, unknown> = {
      ...(typeof p.details === "object" && p.details
        ? (p.details as Record<string, unknown>)
        : {}),
    };
    if (typeof p.retry_after_seconds === "number") {
      details.retry_after_seconds = p.retry_after_seconds;
    }
    if (typeof p.cached_tile_count === "number") {
      details.cached_tile_count = p.cached_tile_count;
    }
    if (typeof p.missing_tile_count === "number") {
      details.missing_tile_count = p.missing_tile_count;
    }
    if (typeof p.tile_count === "number") {
      details.tile_count = p.tile_count;
    }
    return {
      code,
      message: friendlyMessage(code, message),
      testArea,
      details: Object.keys(details).length ? details : undefined,
    };
  }
  return {
    code: `http_${status}`,
    message: `Explore backend returned HTTP ${status}`,
  };
}

function mapNearbySuccess(payload: RawNearbySuccess): ExploreStopsResponse {
  return {
    generationVersion: payload.generation_version,
    osmRevision: payload.osm_revision,
    requestedRadiusMetres: payload.requested_radius_metres,
    sourceRadiusMetres: payload.source_radius_metres,
    tileCount: payload.tile_count,
    cachedTileCount: payload.cached_tile_count,
    preparedTileCount: payload.prepared_tile_count,
    sourceFeatureCount: payload.source_feature_count,
    testArea: payload.test_area ? mapTestArea(payload.test_area) : undefined,
    request: payload.request
      ? {
          latitude: payload.request.latitude,
          longitude: payload.request.longitude,
          radiusMetres: payload.request.radius_metres,
        }
      : {
          latitude: 0,
          longitude: 0,
          radiusMetres: payload.requested_radius_metres ?? 0,
        },
    stops: payload.stops.map(mapStop),
  };
}

async function getAccessTokenOrThrow(): Promise<string> {
  const { session } = await getCurrentSession();
  const token = session?.access_token;
  if (!token) {
    throw new ExploreStopsRequestError({
      code: "unauthenticated",
      message: "Sign in to use Explore.",
    });
  }
  return token;
}

function parseJsonBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return { raw: trimmed.slice(0, 240) };
  }
}

function normalizeEdgePayload(data: unknown): unknown {
  if (typeof data === "string") return parseJsonBody(data);
  return data;
}

function isMapDataPreparing(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return p.code === "map_data_preparing" || p.error === "map_data_preparing";
}

async function fetchEdgeFunction(
  name: string,
  body: Record<string, unknown>
): Promise<{ data: unknown; status: number }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new ExploreStopsRequestError({
      code: "not_configured",
      message: "Supabase URL / anon key missing for Explore Edge calls.",
    });
  }
  const token = await getAccessTokenOrThrow();
  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ExploreStopsRequestError({
      code: "backend_unavailable",
      message: `Could not reach Explore Edge Function ${name}.`,
    });
  }

  const text = await response.text();
  return { status: response.status, data: parseJsonBody(text) };
}

/**
 * Fetch nearby Explore stops (with a short in-memory pan cache).
 */
export async function getExploreStopsNear(
  request: ExploreStopsRequest
): Promise<ExploreStopsResponse> {
  const cacheKey = nearbyCacheKey(request);
  const cached = readNearbyCache(cacheKey);
  if (cached) return cached;

  const response = await fetchExploreStopsNearUncached(request);
  writeNearbyCache(cacheKey, response);
  return response;
}

async function fetchExploreStopsNearUncached(
  request: ExploreStopsRequest
): Promise<ExploreStopsResponse> {
  const transport = resolveExploreTransport();

  if (transport === "edge") {
    const { data: rawData, status } = await fetchEdgeFunction("explore-nearby", {
      latitude: request.latitude,
      longitude: request.longitude,
      radius_metres: request.radiusMetres,
      generation_version: request.generationVersion ?? DEFAULT_GENERATION_VERSION,
    });
    const data = normalizeEdgePayload(rawData);

    // 202 Accepted (and any body that says preparing) → client retry loop
    if (status === 202 || isMapDataPreparing(data)) {
      throw new ExploreStopsRequestError(
        mapBackendError(
          data && typeof data === "object"
            ? data
            : {
                code: "map_data_preparing",
                error: "map_data_preparing",
                message: "Explore is preparing this area.",
              },
          202
        )
      );
    }

    if (status >= 400) {
      // Supabase kills long/CPU-heavy isolates with WORKER_RESOURCE_LIMIT —
      // treat as preparing so the client keeps warming tiles/stops.
      if (
        data &&
        typeof data === "object" &&
        ((data as Record<string, unknown>).code === "WORKER_RESOURCE_LIMIT" ||
          (data as Record<string, unknown>).error === "WORKER_RESOURCE_LIMIT")
      ) {
        throw new ExploreStopsRequestError(
          mapBackendError(
            {
              ...(typeof data === "object" && data ? (data as object) : {}),
              code: "map_data_preparing",
              error: "map_data_preparing",
              message:
                "Explore hit a temporary server limit while preparing this area.",
              retry_after_seconds: 8,
            },
            202
          )
        );
      }
      throw new ExploreStopsRequestError(mapBackendError(data, status));
    }

    if (data && typeof data === "object") {
      const p = data as Record<string, unknown>;
      if (typeof p.error === "string") {
        throw new ExploreStopsRequestError(mapBackendError(data, status));
      }
    }

    if (!isRawNearbySuccess(data)) {
      throw new ExploreStopsRequestError({
        code: "invalid_response",
        message: "Explore Edge response shape was unexpected.",
        details: {
          http_status: status,
          payload_preview:
            data == null
              ? null
              : typeof data === "object"
                ? Object.keys(data as object).slice(0, 12)
                : String(data).slice(0, 120),
        },
      });
    }
    return mapNearbySuccess(data);
  }

  const base = getExploreApiBaseUrl();
  if (!base) {
    throw new ExploreStopsRequestError({
      code: "not_configured",
      message:
        "Local Explore transport selected but EXPO_PUBLIC_EXPLORE_API_URL is not set.",
    });
  }

  const params = new URLSearchParams({
    latitude: String(request.latitude),
    longitude: String(request.longitude),
    radius_metres: String(request.radiusMetres),
    generation_version: String(request.generationVersion ?? DEFAULT_GENERATION_VERSION),
  });

  const url = `${base}/explore/stops/nearby?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new ExploreStopsRequestError({
      code: "backend_unavailable",
      message:
        "Could not reach the local Explore backend. Is `npm run serve` running under scripts/explore?",
    });
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    throw new ExploreStopsRequestError({
      code: "invalid_response",
      message: "Explore backend returned a non-JSON response.",
    });
  }

  if (!response.ok) {
    throw new ExploreStopsRequestError(mapBackendError(payload, response.status));
  }

  if (!isRawNearbySuccess(payload)) {
    throw new ExploreStopsRequestError({
      code: "invalid_response",
      message: "Explore backend response shape was unexpected.",
    });
  }

  return mapNearbySuccess(payload);
}

export function getExploreApiUrlForDocs(): string | null {
  const transport = resolveExploreTransport();
  if (transport === "edge") return "supabase://functions/explore-nearby";
  return getExploreApiBaseUrl();
}

/**
 * Ask the backend whether the user is close enough to claim a stop.
 */
export async function verifyExploreStop(
  request: ExploreVerifyRequest
): Promise<ExploreVerifyResponse> {
  const transport = resolveExploreTransport();
  const body = {
    stop_id: request.stopId,
    generation_version: request.generationVersion ?? DEFAULT_GENERATION_VERSION,
    osm_revision: request.osmRevision,
    reported_location: {
      latitude: request.latitude,
      longitude: request.longitude,
      accuracy_metres: request.accuracyMetres,
    },
  };

  let payload: unknown;

  if (transport === "edge") {
    const { data, status } = await fetchEdgeFunction("explore-verify", body);
    payload = normalizeEdgePayload(data);
    if (status === 202 || isMapDataPreparing(payload)) {
      throw new ExploreStopsRequestError(mapBackendError(payload, 202));
    }
    if (status >= 400) {
      throw new ExploreStopsRequestError(mapBackendError(payload, status));
    }
  } else {
    const base = getExploreApiBaseUrl();
    if (!base) {
      throw new ExploreStopsRequestError({
        code: "not_configured",
        message:
          "Local Explore transport selected but EXPO_PUBLIC_EXPLORE_API_URL is not set.",
      });
    }
    let response: Response;
    try {
      response = await fetch(`${base}/explore/stops/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      throw new ExploreStopsRequestError({
        code: "backend_unavailable",
        message:
          "Could not reach the local Explore backend. Is `npm run serve` running under scripts/explore?",
      });
    }
    try {
      payload = await response.json();
    } catch {
      throw new ExploreStopsRequestError({
        code: "invalid_response",
        message: "Explore backend returned a non-JSON response.",
      });
    }
  }

  if (!payload || typeof payload !== "object") {
    throw new ExploreStopsRequestError({
      code: "invalid_response",
      message: "Explore backend verification response was unexpected.",
    });
  }

  const raw = payload as Record<string, unknown>;
  if (raw.error === "map_data_preparing" || raw.code === "map_data_preparing") {
    throw new ExploreStopsRequestError(mapBackendError(payload, 202));
  }

  if (typeof raw.valid !== "boolean" || typeof raw.claimable !== "boolean") {
    if (typeof raw.error === "string") {
      throw new ExploreStopsRequestError({
        code: raw.error,
        message: friendlyMessage(raw.error, `Explore verification failed: ${raw.error}`),
        details:
          typeof raw.details === "object" && raw.details
            ? (raw.details as Record<string, unknown>)
            : undefined,
      });
    }
    throw new ExploreStopsRequestError({
      code: "invalid_response",
      message: "Explore backend verification response was unexpected.",
    });
  }

  const stopRaw = raw.stop as Record<string, unknown> | undefined;
  const verificationRaw = raw.verification as Record<string, unknown> | undefined;

  return {
    valid: raw.valid,
    claimable: raw.claimable,
    error: typeof raw.error === "string" ? raw.error : undefined,
    stop: stopRaw
      ? {
          stopId: String(stopRaw.stop_id),
          latitude: Number(stopRaw.latitude),
          longitude: Number(stopRaw.longitude),
          generationVersion: Number(stopRaw.generation_version),
          sourceType: String(stopRaw.source_type),
          confidence: Number(stopRaw.confidence),
          environmentProfile:
            typeof stopRaw.environment_profile === "object" && stopRaw.environment_profile
              ? (stopRaw.environment_profile as Record<string, number>)
              : {},
        }
      : undefined,
    verification: verificationRaw
      ? {
          distanceMetres:
            typeof verificationRaw.distance_metres === "number"
              ? verificationRaw.distance_metres
              : undefined,
          claimRadiusMetres:
            typeof verificationRaw.claim_radius_metres === "number"
              ? verificationRaw.claim_radius_metres
              : undefined,
          reportedAccuracyMetres:
            typeof verificationRaw.reported_accuracy_metres === "number"
              ? verificationRaw.reported_accuracy_metres
              : undefined,
          maximumAccuracyMetres:
            typeof verificationRaw.maximum_accuracy_metres === "number"
              ? verificationRaw.maximum_accuracy_metres
              : undefined,
        }
      : undefined,
  };
}

function mapClaimRecord(raw: Record<string, unknown>) {
  return {
    claimId: String(raw.claim_id),
    stopId: String(raw.stop_id),
    generationVersion: Number(raw.generation_version),
    claimedAt: String(raw.claimed_at),
    verifiedDistanceMetres: Number(raw.verified_distance_metres),
    profileId: Number(raw.profile_id),
    awardedCardId: raw.awarded_card_id == null ? null : String(raw.awarded_card_id),
  };
}

function mapAwardCard(raw: Record<string, unknown>) {
  const habitat =
    raw.habitat_weights && typeof raw.habitat_weights === "object" && !Array.isArray(raw.habitat_weights)
      ? (raw.habitat_weights as Record<string, number>)
      : {};
  return {
    id: String(raw.id),
    slug: String(raw.slug),
    name: String(raw.name),
    description: String(raw.description ?? ""),
    category: String(raw.category),
    rarity: String(raw.rarity),
    imageUrl: raw.image_url == null ? null : String(raw.image_url),
    sortOrder: typeof raw.sort_order === "number" ? raw.sort_order : 0,
    habitatWeights: habitat,
  };
}

function mapAward(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const a = raw as Record<string, unknown>;
  if (!a.card || typeof a.card !== "object") return undefined;
  return {
    card: mapAwardCard(a.card as Record<string, unknown>),
    isNew: a.is_new === true,
    count: Number(a.count ?? 1),
    matchedEnvironments: Array.isArray(a.matched_environments)
      ? a.matched_environments.map((x) => String(x))
      : [],
  };
}

/**
 * Authenticated claim — backend re-verifies proximity, then saves one claim row.
 */
export async function claimExploreStop(
  request: ExploreClaimRequest
): Promise<ExploreClaimResponse> {
  const transport = resolveExploreTransport();
  const body = {
    stop_id: request.stopId,
    generation_version: request.generationVersion ?? DEFAULT_GENERATION_VERSION,
    osm_revision: request.osmRevision,
    profile_id: request.profileId,
    reported_location: {
      latitude: request.latitude,
      longitude: request.longitude,
      accuracy_metres: request.accuracyMetres,
    },
    idempotency_key: request.idempotencyKey,
  };

  let payload: unknown;

  if (transport === "edge") {
    const { data, status } = await fetchEdgeFunction("explore-claim", body);
    payload = normalizeEdgePayload(data);
    if (status === 202 || isMapDataPreparing(payload)) {
      throw new ExploreStopsRequestError(mapBackendError(payload, 202));
    }
    if (status >= 400) {
      throw new ExploreStopsRequestError(mapBackendError(payload, status));
    }
  } else {
    const base = getExploreApiBaseUrl();
    if (!base) {
      throw new ExploreStopsRequestError({
        code: "not_configured",
        message:
          "Local Explore transport selected but EXPO_PUBLIC_EXPLORE_API_URL is not set.",
      });
    }
    const accessToken = await getAccessTokenOrThrow();
    let response: Response;
    try {
      response = await fetch(`${base}/explore/stops/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new ExploreStopsRequestError({
        code: "backend_unavailable",
        message:
          "Could not reach the local Explore backend. Is `npm run serve` running under scripts/explore?",
      });
    }
    try {
      payload = await response.json();
    } catch {
      throw new ExploreStopsRequestError({
        code: "invalid_response",
        message: "Explore backend returned a non-JSON claim response.",
      });
    }
  }

  if (!payload || typeof payload !== "object") {
    throw new ExploreStopsRequestError({
      code: "invalid_response",
      message: "Explore backend claim response was unexpected.",
    });
  }

  const raw = payload as Record<string, unknown>;
  if (raw.error === "map_data_preparing" || raw.code === "map_data_preparing") {
    throw new ExploreStopsRequestError(mapBackendError(payload, 202));
  }

  if (typeof raw.success !== "boolean") {
    if (typeof raw.error === "string") {
      throw new ExploreStopsRequestError({
        code: raw.error,
        message: friendlyMessage(raw.error, `Explore claim failed: ${raw.error}`),
        details:
          typeof raw.details === "object" && raw.details
            ? (raw.details as Record<string, unknown>)
            : undefined,
      });
    }
    throw new ExploreStopsRequestError({
      code: "invalid_response",
      message: "Explore backend claim response was unexpected.",
    });
  }

  if (!raw.success) {
    return {
      success: false,
      error: typeof raw.error === "string" ? raw.error : "claim_failed",
      claim:
        raw.claim && typeof raw.claim === "object"
          ? mapClaimRecord(raw.claim as Record<string, unknown>)
          : undefined,
      award: mapAward(raw.award),
      details:
        typeof raw.details === "object" && raw.details
          ? (raw.details as Record<string, unknown>)
          : undefined,
    };
  }

  if (!raw.claim || typeof raw.claim !== "object") {
    throw new ExploreStopsRequestError({
      code: "invalid_response",
      message: "Explore claim succeeded without a claim payload.",
    });
  }

  return {
    success: true,
    claim: mapClaimRecord(raw.claim as Record<string, unknown>),
    award: mapAward(raw.award),
    idempotentReplay: raw.idempotent_replay === true,
  };
}

/**
 * Load claimed stop IDs for the selected player profile (own claims only).
 * Prefer a direct table read (RLS-scoped); fall back to RPC / local Node.
 */
export async function getClaimedExploreStopIds(
  profileId: number
): Promise<ExploreClaimedStopsResponse> {
  await getAccessTokenOrThrow();

  const { data: rows, error: tableError } = await supabase
    .from("explore_stop_claims")
    .select("stop_id")
    .eq("profile_id", profileId);

  if (!tableError && Array.isArray(rows)) {
    return {
      success: true,
      profileId,
      stopIds: rows.map((row) => String(row.stop_id)),
    };
  }

  const { data, error } = await supabase.rpc("get_explore_claimed_stop_ids", {
    p_profile_id: profileId,
  });

  if (error) {
    // Fall back to local Node claimed endpoint when RPC unavailable and local transport.
    const transport = resolveExploreTransport();
    if (transport === "local") {
      return getClaimedExploreStopIdsViaLocal(profileId);
    }
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("not authenticated")) {
      throw new ExploreStopsRequestError({
        code: "unauthenticated",
        message: "Sign in to view claimed stops.",
      });
    }
    throw new ExploreStopsRequestError({
      code: "claim_failed",
      message: `Could not load claimed stops: ${
        tableError?.message ? `${tableError.message}; ` : ""
      }${error.message}`,
    });
  }

  const stopIds = normalizeClaimedStopIds(data);
  if (stopIds != null) {
    return {
      success: true,
      profileId,
      stopIds,
    };
  }

  throw new ExploreStopsRequestError({
    code: "invalid_response",
    message: "Explore claimed-stops response was unexpected.",
  });
}

/** Normalize RPC payloads: bare text[], wrapped objects, or Postgres array literals. */
function normalizeClaimedStopIds(data: unknown): string[] | null {
  if (Array.isArray(data)) {
    return data.map((id) => String(id));
  }
  if (data && typeof data === "object") {
    const raw = data as Record<string, unknown>;
    if (Array.isArray(raw.stop_ids)) {
      return raw.stop_ids.map((id) => String(id));
    }
  }
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed === "{}" || trimmed === "") return [];
    // Postgres text[] literal: {stop_a,stop_b}
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(",").map((part) => part.replace(/^"|"$/g, "").trim());
    }
  }
  return null;
}

async function getClaimedExploreStopIdsViaLocal(
  profileId: number
): Promise<ExploreClaimedStopsResponse> {
  const base = getExploreApiBaseUrl();
  if (!base) {
    throw new ExploreStopsRequestError({
      code: "not_configured",
      message: "Local Explore API URL is not set.",
    });
  }
  const accessToken = await getAccessTokenOrThrow();
  const params = new URLSearchParams({ profile_id: String(profileId) });
  const response = await fetch(`${base}/explore/stops/claimed?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = await response.json();
  const raw = payload as Record<string, unknown>;
  if (raw.success !== true || !Array.isArray(raw.stop_ids)) {
    throw new ExploreStopsRequestError({
      code: typeof raw.error === "string" ? raw.error : "claim_failed",
      message: `Could not load claimed stops: ${typeof raw.error === "string" ? raw.error : "unknown"}`,
    });
  }
  return {
    success: true,
    profileId: Number(raw.profile_id ?? profileId),
    stopIds: raw.stop_ids.map((id) => String(id)),
  };
}

/**
 * Load the selected profile's Explore binder catalogue (all active cards + ownership).
 */
export async function getExploreCardCollection(
  profileId: number
): Promise<ExploreCollectionResponse> {
  await getAccessTokenOrThrow();

  const { data, error } = await supabase.rpc("get_explore_profile_card_collection", {
    p_profile_id: profileId,
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("not authenticated")) {
      throw new ExploreStopsRequestError({
        code: "unauthenticated",
        message: "Sign in to view the Card Binder.",
      });
    }
    if (msg.includes("not authorized")) {
      throw new ExploreStopsRequestError({
        code: "invalid_profile",
        message: "That player profile is not available for this account.",
      });
    }
    throw new ExploreStopsRequestError({
      code: "claim_failed",
      message: `Could not load collection: ${error.message}`,
    });
  }

  const raw = data as Record<string, unknown> | null;
  if (!raw || raw.success !== true || !Array.isArray(raw.items)) {
    throw new ExploreStopsRequestError({
      code: "invalid_response",
      message: "Explore collection response was unexpected.",
    });
  }

  return {
    success: true,
    profileId: Number(raw.profile_id ?? profileId),
    items: raw.items.map((item) => {
      const row = item as Record<string, unknown>;
      const card = (row.card ?? {}) as Record<string, unknown>;
      const count = Number(row.count ?? 0);
      const collected =
        count > 0 ||
        row.collected === true ||
        row.collected === "true" ||
        row.collected === 1 ||
        (row.first_collected_at != null && row.first_collected_at !== "");
      return {
        card: mapAwardCard(card),
        count: Number.isFinite(count) ? Math.max(0, count) : 0,
        collected,
        firstCollectedAt:
          row.first_collected_at == null ? null : String(row.first_collected_at),
        lastCollectedAt:
          row.last_collected_at == null ? null : String(row.last_collected_at),
      };
    }),
  };
}
