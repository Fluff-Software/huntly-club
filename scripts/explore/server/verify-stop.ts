/**
 * Stop proximity verification — backend distance only; never trusts client stop coords.
 */
import { haversineMeters } from "../safety-rules.js";
import { findAcceptedStop } from "./nearby-stops.js";
import { SUPPORTED_GENERATION_VERSIONS } from "./validation.js";

export const CLAIM_RADIUS_METRES = 50;
export const MAXIMUM_ACCEPTED_ACCURACY_METRES = 75;

export type VerifyReportedLocation = {
  latitude: number;
  longitude: number;
  accuracyMetres: number;
};

export type VerifyRequest = {
  stopId: string;
  generationVersion: number;
  reportedLocation: VerifyReportedLocation;
};

export type VerifyStopDto = {
  stop_id: string;
  latitude: number;
  longitude: number;
  generation_version: number;
  source_type: string;
  confidence: number;
  environment_profile: Record<string, number>;
};

export type VerifySuccessClaimable = {
  valid: true;
  claimable: true;
  stop: VerifyStopDto;
  verification: {
    distance_metres: number;
    claim_radius_metres: number;
    reported_accuracy_metres: number;
    maximum_accuracy_metres: number;
  };
};

export type VerifySuccessNotClaimable = {
  valid: true;
  claimable: false;
  error: "too_far_away" | "gps_accuracy_too_low";
  stop?: VerifyStopDto;
  verification?: {
    distance_metres?: number;
    claim_radius_metres?: number;
    reported_accuracy_metres?: number;
    maximum_accuracy_metres?: number;
  };
};

export type VerifyFailure = {
  valid: false;
  claimable: false;
  error:
    | "invalid_request"
    | "invalid_stop_id"
    | "invalid_location"
    | "invalid_accuracy"
    | "unsupported_generation_version"
    | "stop_not_found"
    | "generator_unavailable";
  details?: Record<string, unknown>;
};

export type VerifyResult = VerifySuccessClaimable | VerifySuccessNotClaimable | VerifyFailure;

export type ValidateVerifyBodyResult =
  | { ok: true; request: VerifyRequest }
  | { ok: false; result: VerifyFailure };

/**
 * Validate a parsed JSON body for POST /explore/stops/verify.
 * Ignores any client-supplied stop latitude/longitude fields.
 */
export function validateVerifyBody(body: unknown): ValidateVerifyBodyResult {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      result: { valid: false, claimable: false, error: "invalid_request" },
    };
  }
  const raw = body as Record<string, unknown>;

  const stopId = raw.stop_id;
  if (typeof stopId !== "string" || stopId.trim() === "") {
    return {
      ok: false,
      result: {
        valid: false,
        claimable: false,
        error: "invalid_stop_id",
        details: { stop_id: stopId },
      },
    };
  }

  const versionRaw = raw.generation_version;
  const generationVersion =
    versionRaw == null ? 2 : typeof versionRaw === "number" ? versionRaw : Number(versionRaw);
  if (!Number.isFinite(generationVersion) || !SUPPORTED_GENERATION_VERSIONS.has(generationVersion)) {
    return {
      ok: false,
      result: {
        valid: false,
        claimable: false,
        error: "unsupported_generation_version",
        details: {
          generation_version: versionRaw,
          supported: [...SUPPORTED_GENERATION_VERSIONS],
        },
      },
    };
  }

  const loc = raw.reported_location;
  if (loc == null || typeof loc !== "object" || Array.isArray(loc)) {
    return {
      ok: false,
      result: {
        valid: false,
        claimable: false,
        error: "invalid_location",
        details: { reason: "reported_location_required" },
      },
    };
  }
  const reported = loc as Record<string, unknown>;
  const latitude = Number(reported.latitude);
  const longitude = Number(reported.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return {
      ok: false,
      result: {
        valid: false,
        claimable: false,
        error: "invalid_location",
        details: { field: "latitude", value: reported.latitude },
      },
    };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return {
      ok: false,
      result: {
        valid: false,
        claimable: false,
        error: "invalid_location",
        details: { field: "longitude", value: reported.longitude },
      },
    };
  }

  if (!("accuracy_metres" in reported)) {
    return {
      ok: false,
      result: {
        valid: false,
        claimable: false,
        error: "invalid_accuracy",
        details: { reason: "accuracy_metres_required" },
      },
    };
  }
  const accuracyMetres = Number(reported.accuracy_metres);
  if (!Number.isFinite(accuracyMetres) || accuracyMetres <= 0) {
    return {
      ok: false,
      result: {
        valid: false,
        claimable: false,
        error: "invalid_accuracy",
        details: { accuracy_metres: reported.accuracy_metres },
      },
    };
  }

  return {
    ok: true,
    request: {
      stopId: stopId.trim(),
      generationVersion,
      reportedLocation: { latitude, longitude, accuracyMetres },
    },
  };
}

function toVerifyStopDto(stop: NonNullable<ReturnType<typeof findAcceptedStop>>): VerifyStopDto {
  return {
    stop_id: stop.stopId,
    latitude: stop.latitude,
    longitude: stop.longitude,
    generation_version: stop.generationVersion,
    source_type: stop.sourceType,
    confidence: stop.confidence,
    environment_profile: { ...stop.environmentProfile },
  };
}

/**
 * Verify whether the reported user location is close enough to claim a stop.
 * Uses only authoritative generator coordinates for the stop.
 */
export function verifyExploreStop(request: VerifyRequest): VerifyResult {
  let stop;
  try {
    stop = findAcceptedStop(request.stopId, request.generationVersion);
  } catch (e) {
    const err = e as Error & { code?: string };
    if (err.code === "osm_extract_missing") {
      return { valid: false, claimable: false, error: "generator_unavailable" };
    }
    throw e;
  }

  if (!stop) {
    return { valid: false, claimable: false, error: "stop_not_found" };
  }

  const stopDto = toVerifyStopDto(stop);
  const { accuracyMetres, latitude, longitude } = request.reportedLocation;

  if (accuracyMetres > MAXIMUM_ACCEPTED_ACCURACY_METRES) {
    return {
      valid: true,
      claimable: false,
      error: "gps_accuracy_too_low",
      stop: stopDto,
      verification: {
        reported_accuracy_metres: accuracyMetres,
        maximum_accuracy_metres: MAXIMUM_ACCEPTED_ACCURACY_METRES,
        claim_radius_metres: CLAIM_RADIUS_METRES,
      },
    };
  }

  const distance = haversineMeters(
    { latitude, longitude },
    { latitude: stop.latitude, longitude: stop.longitude }
  );
  const distanceRounded = Math.round(distance * 10) / 10;

  if (distance > CLAIM_RADIUS_METRES) {
    return {
      valid: true,
      claimable: false,
      error: "too_far_away",
      stop: stopDto,
      verification: {
        distance_metres: distanceRounded,
        claim_radius_metres: CLAIM_RADIUS_METRES,
        reported_accuracy_metres: accuracyMetres,
        maximum_accuracy_metres: MAXIMUM_ACCEPTED_ACCURACY_METRES,
      },
    };
  }

  return {
    valid: true,
    claimable: true,
    stop: stopDto,
    verification: {
      distance_metres: distanceRounded,
      claim_radius_metres: CLAIM_RADIUS_METRES,
      reported_accuracy_metres: accuracyMetres,
      maximum_accuracy_metres: MAXIMUM_ACCEPTED_ACCURACY_METRES,
    },
  };
}
