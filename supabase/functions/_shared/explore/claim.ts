/**
 * Authenticated claim — regenerates stop, then invokes claim_explore_stop_award_achievements RPC.
 */
import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2";
import {
  CLAIM_RADIUS_METRES,
  MAXIMUM_ACCEPTED_ACCURACY_METRES,
  validateVerifyBody,
  runVerify,
  type VerifyRequest,
} from "./verify.ts";

export type ClaimRequest = VerifyRequest & {
  profileId: number;
  idempotencyKey: string | null;
  deferReveal: boolean;
};

export function validateClaimBody(body: unknown):
  | { ok: true; request: ClaimRequest }
  | { ok: false; result: Record<string, unknown> } {
  const verified = validateVerifyBody(body);
  if (!verified.ok) {
    return {
      ok: false,
      result: { success: false, error: verified.result.error },
    };
  }
  const raw = body as Record<string, unknown>;
  const profileRaw = raw.profile_id;
  const profileId =
    typeof profileRaw === "number"
      ? profileRaw
      : typeof profileRaw === "string"
        ? Number(profileRaw)
        : NaN;
  if (!Number.isFinite(profileId) || profileId <= 0 || !Number.isInteger(profileId)) {
    return { ok: false, result: { success: false, error: "invalid_profile" } };
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
      deferReveal: raw.defer_reveal === true,
    },
  };
}

function mapClaimRow(raw: Record<string, unknown>) {
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

function mapAward(raw: unknown) {
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
      sort_order: typeof c.sort_order === "number" ? c.sort_order : 0,
      habitat_weights:
        c.habitat_weights && typeof c.habitat_weights === "object"
          ? c.habitat_weights
          : {},
    },
    is_new: a.is_new === true,
    count: Number(a.count ?? 1),
    matched_environments: Array.isArray(a.matched_environments)
      ? a.matched_environments.map((x) => String(x))
      : [],
  };
}

export async function runClaim(opts: {
  service: SupabaseClient;
  user: User;
  body: unknown;
  requestId: string;
  allowAcquisition: boolean;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const validated = validateClaimBody(opts.body);
  if (!validated.ok) {
    return { status: 400, body: validated.result };
  }

  const verification = await runVerify({
    service: opts.service,
    request: validated.request,
    requestId: opts.requestId,
    allowAcquisition: opts.allowAcquisition,
    userId: opts.user.id,
  });

  if (verification.body.error === "map_data_preparing") {
    return { status: 202, body: { success: false, ...verification.body } };
  }

  if (verification.body.error === "stop_not_found") {
    return { status: 404, body: { success: false, error: "stop_not_found" } };
  }

  if (verification.body.valid !== true) {
    return {
      status: verification.status === 404 ? 404 : 400,
      body: {
        success: false,
        error: verification.body.error ?? "claim_failed",
      },
    };
  }

  if (verification.body.claimable !== true) {
    return {
      status: 200,
      body: {
        success: false,
        error: verification.body.error ?? "claim_failed",
        details: verification.body.verification,
      },
    };
  }

  const stop = verification.body.stop as Record<string, unknown>;
  const verificationMeta = verification.body.verification as Record<string, unknown>;

  const { data, error } = await opts.service.rpc("claim_explore_stop_award_achievements", {
    p_user_id: opts.user.id,
    p_profile_id: validated.request.profileId,
    p_stop_id: validated.request.stopId,
    p_generation_version: validated.request.generationVersion,
    p_reported_latitude: validated.request.reportedLocation.latitude,
    p_reported_longitude: validated.request.reportedLocation.longitude,
    p_reported_accuracy_metres: validated.request.reportedLocation.accuracyMetres,
    p_verified_distance_metres: verificationMeta.distance_metres,
    p_source_type: stop.source_type,
    p_environment_profile: stop.environment_profile,
    p_idempotency_key: validated.request.idempotencyKey,
    p_defer_reveal: validated.request.deferReveal,
  });

  if (error) {
    return {
      status: 500,
      body: {
        success: false,
        error: "claim_failed",
        details: { reason: "rpc_error", message: error.message },
      },
    };
  }

  const payload = data as Record<string, unknown> | null;
  if (!payload || typeof payload.success !== "boolean") {
    return { status: 500, body: { success: false, error: "claim_failed" } };
  }

  if (!payload.success) {
    const errCode = typeof payload.error === "string" ? payload.error : "claim_failed";
    return {
      status: errCode === "already_claimed" ? 200 : 400,
      body: {
        success: false,
        error: errCode,
        ...(payload.claim && typeof payload.claim === "object"
          ? { claim: mapClaimRow(payload.claim as Record<string, unknown>) }
          : {}),
        ...(mapAward(payload.award) ? { award: mapAward(payload.award) } : {}),
      },
    };
  }

  const pack =
    payload.pack && typeof payload.pack === "object"
      ? (payload.pack as Record<string, unknown>)
      : null;

  return {
    status: 200,
    body: {
      success: true,
      claim: mapClaimRow(payload.claim as Record<string, unknown>),
      ...(mapAward(payload.award) ? { award: mapAward(payload.award) } : {}),
      ...(payload.idempotent_replay === true ? { idempotent_replay: true } : {}),
      ...(payload.banked === true ? { banked: true } : {}),
      ...(pack ? { pack_id: String(pack.pack_id) } : {}),
    },
  };
}

export { CLAIM_RADIUS_METRES, MAXIMUM_ACCEPTED_ACCURACY_METRES };
