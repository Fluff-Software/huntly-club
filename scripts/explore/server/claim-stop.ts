/**
 * Authenticated Explore stop claim — re-verifies proximity, then inserts via service-role RPC.
 * Does not award cards. Does not store generated stops.
 */
import type { User } from "@supabase/supabase-js";
import {
  createServiceClient,
  loadExploreSupabaseEnv,
  type ExploreSupabaseEnv,
} from "./auth.js";
import {
  checkClaimRateLimit,
  claimRateLimitFromEnv,
  recordClaimFailure,
} from "./rate-limit.js";
import {
  CLAIM_RADIUS_METRES,
  MAXIMUM_ACCEPTED_ACCURACY_METRES,
  validateVerifyBody,
  verifyExploreStop,
  type VerifyRequest,
} from "./verify-stop.js";

export type ClaimBodyInput = {
  stop_id?: unknown;
  generation_version?: unknown;
  profile_id?: unknown;
  reported_location?: unknown;
  idempotency_key?: unknown;
  /** Ignored if present — never trusted. */
  user_id?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

export type ClaimDto = {
  claim_id: string;
  stop_id: string;
  generation_version: number;
  claimed_at: string;
  verified_distance_metres: number;
  profile_id: number;
  awarded_card_id: string | null;
};

export type ClaimSuccess = {
  success: true;
  claim: ClaimDto;
  award?: AwardDto;
  idempotent_replay?: boolean;
};

export type ClaimFailure = {
  success: false;
  error: string;
  details?: Record<string, unknown>;
  claim?: ClaimDto;
  award?: AwardDto;
};

export type ClaimResult = ClaimSuccess | ClaimFailure;

export type AwardCardDto = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  image_url: string | null;
};

export type AwardDto = {
  card: AwardCardDto;
  is_new: boolean;
  count: number;
  matched_environments: string[];
};

function mapClaimRow(raw: Record<string, unknown>): ClaimDto {
  return {
    claim_id: String(raw.claim_id),
    stop_id: String(raw.stop_id),
    generation_version: Number(raw.generation_version),
    claimed_at: String(raw.claimed_at),
    verified_distance_metres: Number(raw.verified_distance_metres),
    profile_id: Number(raw.profile_id),
    awarded_card_id: raw.awarded_card_id == null ? null : String(raw.awarded_card_id),
  };
}

function mapAward(raw: unknown): AwardDto | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const a = raw as Record<string, unknown>;
  const card = a.card;
  if (!card || typeof card !== "object") return undefined;
  const c = card as Record<string, unknown>;
  return {
    card: {
      id: String(c.id),
      slug: String(c.slug),
      name: String(c.name),
      description: String(c.description ?? ""),
      category: String(c.category),
      rarity: String(c.rarity),
      image_url: c.image_url == null ? null : String(c.image_url),
    },
    is_new: a.is_new === true,
    count: Number(a.count ?? 1),
    matched_environments: Array.isArray(a.matched_environments)
      ? a.matched_environments.map((x) => String(x))
      : [],
  };
}

export function validateClaimBody(
  body: unknown
):
  | {
      ok: true;
      request: VerifyRequest & { profileId: number; idempotencyKey: string | null };
    }
  | { ok: false; result: ClaimFailure } {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, result: { success: false, error: "invalid_request" } };
  }
  const raw = body as ClaimBodyInput;

  const verified = validateVerifyBody({
    stop_id: raw.stop_id,
    generation_version: raw.generation_version,
    reported_location: raw.reported_location,
  });
  if (!verified.ok) {
    return {
      ok: false,
      result: { success: false, error: verified.result.error },
    };
  }

  const profileRaw = raw.profile_id;
  const profileId =
    typeof profileRaw === "number"
      ? profileRaw
      : typeof profileRaw === "string"
        ? Number(profileRaw)
        : NaN;
  if (!Number.isFinite(profileId) || profileId <= 0 || !Number.isInteger(profileId)) {
    return {
      ok: false,
      result: { success: false, error: "invalid_profile" },
    };
  }

  let idempotencyKey: string | null = null;
  if (raw.idempotency_key != null) {
    if (typeof raw.idempotency_key !== "string" || raw.idempotency_key.trim() === "") {
      return {
        ok: false,
        result: { success: false, error: "invalid_request", details: { field: "idempotency_key" } },
      };
    }
    idempotencyKey = raw.idempotency_key.trim();
  }

  return {
    ok: true,
    request: {
      ...verified.request,
      profileId,
      idempotencyKey,
    },
  };
}

/**
 * Full claim pipeline. Client user_id / stop coordinates are ignored.
 */
export async function claimExploreStop(opts: {
  user: User;
  body: unknown;
  env?: ExploreSupabaseEnv | null;
}): Promise<{ status: number; body: ClaimResult }> {
  const env = opts.env === undefined ? loadExploreSupabaseEnv() : opts.env;
  if (!env) {
    return {
      status: 503,
      body: {
        success: false,
        error: "claim_failed",
        details: { reason: "supabase_not_configured" },
      },
    };
  }

  const validated = validateClaimBody(opts.body);
  if (!validated.ok) {
    return { status: 400, body: validated.result };
  }

  const rate = checkClaimRateLimit(opts.user.id, claimRateLimitFromEnv());
  if (!rate.ok) {
    return {
      status: 429,
      body: {
        success: false,
        error: "rate_limited",
        details: { retry_after_ms: rate.retry_after_ms },
      },
    };
  }

  // Re-verify every claim — never trust a prior verify response.
  const verification = verifyExploreStop({
    stopId: validated.request.stopId,
    generationVersion: validated.request.generationVersion,
    reportedLocation: validated.request.reportedLocation,
  });

  if (!verification.valid) {
    recordClaimFailure(opts.user.id);
    return {
      status: verification.error === "stop_not_found" ? 404 : 400,
      body: { success: false, error: verification.error },
    };
  }

  if (!verification.claimable) {
    recordClaimFailure(opts.user.id);
    return {
      status: 200,
      body: { success: false, error: verification.error },
    };
  }

  const service = createServiceClient(env);
  if (!service) {
    return {
      status: 503,
      body: {
        success: false,
        error: "claim_failed",
        details: { reason: "service_role_not_configured" },
      },
    };
  }

  const { data, error } = await service.rpc("claim_explore_stop", {
    p_user_id: opts.user.id,
    p_profile_id: validated.request.profileId,
    p_stop_id: validated.request.stopId,
    p_generation_version: validated.request.generationVersion,
    p_reported_latitude: validated.request.reportedLocation.latitude,
    p_reported_longitude: validated.request.reportedLocation.longitude,
    p_reported_accuracy_metres: validated.request.reportedLocation.accuracyMetres,
    p_verified_distance_metres: verification.verification.distance_metres,
    p_source_type: verification.stop.source_type,
    p_environment_profile: verification.stop.environment_profile,
    p_idempotency_key: validated.request.idempotencyKey,
  });

  if (error) {
    recordClaimFailure(opts.user.id);
    return {
      status: 500,
      body: {
        success: false,
        error: "claim_failed",
        details: {
          reason: "rpc_error",
          message: error.message,
          code: error.code,
        },
      },
    };
  }

  const payload = data as Record<string, unknown> | null;
  if (!payload || typeof payload.success !== "boolean") {
    recordClaimFailure(opts.user.id);
    return { status: 500, body: { success: false, error: "claim_failed" } };
  }

  if (!payload.success) {
    const errCode = typeof payload.error === "string" ? payload.error : "claim_failed";
    if (errCode !== "already_claimed") {
      recordClaimFailure(opts.user.id);
    }
    const claimRaw =
      payload.claim && typeof payload.claim === "object"
        ? mapClaimRow(payload.claim as Record<string, unknown>)
        : undefined;
    return {
      status: errCode === "already_claimed" ? 200 : 400,
      body: {
        success: false,
        error: errCode,
        ...(claimRaw ? { claim: claimRaw } : {}),
        ...(mapAward(payload.award) ? { award: mapAward(payload.award) } : {}),
      },
    };
  }

  const claimRaw = payload.claim as Record<string, unknown>;
  const award = mapAward(payload.award);
  if (process.env.EXPLORE_DEV_LOG_AWARDS === "1" && award) {
    console.log(
      `[explore-claim] awarded ${award.card.slug} new=${award.is_new} count=${award.count} matched=${award.matched_environments.join(",")}`
    );
  }
  return {
    status: 200,
    body: {
      success: true,
      claim: mapClaimRow(claimRaw),
      ...(award ? { award } : {}),
      ...(payload.idempotent_replay === true ? { idempotent_replay: true } : {}),
    },
  };
}

export { CLAIM_RADIUS_METRES, MAXIMUM_ACCEPTED_ACCURACY_METRES };
