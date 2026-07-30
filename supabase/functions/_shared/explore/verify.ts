/**
 * Stop proximity verification — loads authoritative point from persisted catalogue.
 * Ignores client-supplied coordinates for point authority.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { GENERATION_VERSION } from "./config.ts";
import { loadCataloguePointById } from "./catalogue-nearby.ts";
import { haversineMeters } from "./safety-rules.ts";

export const CLAIM_RADIUS_METRES = 50;
export const MAXIMUM_ACCEPTED_ACCURACY_METRES = 75;
/** @deprecated retained for local Node parity imports */
export const VERIFY_SOURCE_RADIUS_METRES = 400;

export type VerifyRequest = {
  stopId: string;
  generationVersion: number;
  osmRevision?: string;
  reportedLocation: {
    latitude: number;
    longitude: number;
    accuracyMetres: number;
  };
};

export function validateVerifyBody(body: unknown):
  | { ok: true; request: VerifyRequest }
  | { ok: false; result: Record<string, unknown> } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
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
      result: { valid: false, claimable: false, error: "invalid_stop_id" },
    };
  }

  const generationVersion =
    raw.generation_version == null ? GENERATION_VERSION : Number(raw.generation_version);
  if (!Number.isFinite(generationVersion) || generationVersion <= 0) {
    return {
      ok: false,
      result: {
        valid: false,
        claimable: false,
        error: "unsupported_generation_version",
      },
    };
  }

  const loc = raw.reported_location;
  if (!loc || typeof loc !== "object" || Array.isArray(loc)) {
    return {
      ok: false,
      result: { valid: false, claimable: false, error: "invalid_location" },
    };
  }
  const l = loc as Record<string, unknown>;
  const latitude = Number(l.latitude);
  const longitude = Number(l.longitude);
  const accuracyMetres = Number(l.accuracy_metres ?? l.accuracyMetres);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      ok: false,
      result: { valid: false, claimable: false, error: "invalid_location" },
    };
  }
  if (!Number.isFinite(accuracyMetres) || accuracyMetres < 0) {
    return {
      ok: false,
      result: { valid: false, claimable: false, error: "invalid_accuracy" },
    };
  }

  const osmRevision =
    typeof raw.osm_revision === "string" ? raw.osm_revision : undefined;

  return {
    ok: true,
    request: {
      stopId: stopId.trim(),
      generationVersion,
      osmRevision,
      reportedLocation: { latitude, longitude, accuracyMetres },
    },
  };
}

function stopDto(point: {
  id: string;
  latitude: number;
  longitude: number;
  generation_version: number;
  source_revision: string;
  source_type: string;
  confidence: number | null;
  environment_profile: Record<string, number>;
  point_type: number;
}) {
  return {
    stop_id: point.id,
    latitude: point.latitude,
    longitude: point.longitude,
    generation_version: point.generation_version,
    osm_revision: point.source_revision,
    source_type: point.source_type,
    confidence: point.confidence ?? 0,
    environment_profile: point.environment_profile,
    type: point.point_type,
    point_type: point.point_type,
  };
}

export async function runVerify(opts: {
  service: SupabaseClient;
  request: VerifyRequest;
  requestId: string;
  allowAcquisition: boolean;
  userId?: string;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const point = await loadCataloguePointById(opts.service, opts.request.stopId);
  if (!point) {
    return {
      status: 404,
      body: { valid: false, claimable: false, error: "stop_not_found" },
    };
  }

  if (!point.active || point.catalogue_status !== "active") {
    return {
      status: 404,
      body: { valid: false, claimable: false, error: "stop_not_found" },
    };
  }

  if (point.generation_version !== opts.request.generationVersion) {
    return {
      status: 400,
      body: {
        valid: false,
        claimable: false,
        error: "unsupported_generation_version",
      },
    };
  }

  const distance = haversineMeters(
    {
      latitude: opts.request.reportedLocation.latitude,
      longitude: opts.request.reportedLocation.longitude,
    },
    { latitude: point.latitude, longitude: point.longitude }
  );

  const dto = stopDto(point);

  if (opts.request.reportedLocation.accuracyMetres > MAXIMUM_ACCEPTED_ACCURACY_METRES) {
    return {
      status: 200,
      body: {
        valid: true,
        claimable: false,
        error: "gps_accuracy_too_low",
        stop: dto,
        verification: {
          distance_metres: Math.round(distance * 10) / 10,
          claim_radius_metres: CLAIM_RADIUS_METRES,
          reported_accuracy_metres: opts.request.reportedLocation.accuracyMetres,
          maximum_accuracy_metres: MAXIMUM_ACCEPTED_ACCURACY_METRES,
        },
      },
    };
  }

  if (distance > CLAIM_RADIUS_METRES) {
    return {
      status: 200,
      body: {
        valid: true,
        claimable: false,
        error: "too_far_away",
        stop: dto,
        verification: {
          distance_metres: Math.round(distance * 10) / 10,
          claim_radius_metres: CLAIM_RADIUS_METRES,
          reported_accuracy_metres: opts.request.reportedLocation.accuracyMetres,
          maximum_accuracy_metres: MAXIMUM_ACCEPTED_ACCURACY_METRES,
        },
      },
    };
  }

  return {
    status: 200,
    body: {
      valid: true,
      claimable: true,
      stop: dto,
      verification: {
        distance_metres: Math.round(distance * 10) / 10,
        claim_radius_metres: CLAIM_RADIUS_METRES,
        reported_accuracy_metres: opts.request.reportedLocation.accuracyMetres,
        maximum_accuracy_metres: MAXIMUM_ACCEPTED_ACCURACY_METRES,
      },
    },
  };
}
