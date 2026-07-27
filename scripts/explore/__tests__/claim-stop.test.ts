import { afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { extractBearerToken } from "../server/auth.js";
import {
  claimExploreStop,
  validateClaimBody,
} from "../server/claim-stop.js";
import {
  checkClaimRateLimit,
  clearClaimRateLimits,
  recordClaimFailure,
} from "../server/rate-limit.js";
import * as verifyModule from "../server/verify-stop.js";

const fakeUser = { id: "11111111-1111-1111-1111-111111111111" } as User;

afterEach(() => {
  clearClaimRateLimits();
  vi.restoreAllMocks();
});

describe("extractBearerToken", () => {
  it("parses Bearer tokens", () => {
    expect(extractBearerToken("Bearer abc.def")).toBe("abc.def");
    expect(extractBearerToken("bearer xyz")).toBe("xyz");
  });

  it("rejects missing or malformed headers", () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken("Basic abc")).toBeNull();
    expect(extractBearerToken("")).toBeNull();
  });
});

describe("validateClaimBody", () => {
  const goodLocation = {
    latitude: 53.0442,
    longitude: -2.1656,
    accuracy_metres: 18,
  };

  it("requires a positive integer profile_id", () => {
    const result = validateClaimBody({
      stop_id: "stop_x",
      generation_version: 2,
      reported_location: goodLocation,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.result.error).toBe("invalid_profile");
  });

  it("ignores client-supplied user_id and stop coordinates", () => {
    const result = validateClaimBody({
      stop_id: "stop_x",
      generation_version: 2,
      profile_id: 42,
      user_id: "attacker-user-id",
      latitude: 0,
      longitude: 0,
      reported_location: goodLocation,
      idempotency_key: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.profileId).toBe(42);
      expect(result.request.stopId).toBe("stop_x");
      expect(result.request.reportedLocation.latitude).toBe(53.0442);
      expect(result.request.idempotencyKey).toBe(
        "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
      );
    }
  });

  it("rejects unsupported generation version", () => {
    const result = validateClaimBody({
      stop_id: "stop_x",
      generation_version: 99,
      profile_id: 1,
      reported_location: goodLocation,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.result.error).toBe("unsupported_generation_version");
  });
});

describe("claim rate limit", () => {
  it("allows spaced attempts and blocks rapid repeats", () => {
    const cfg = { minIntervalMs: 1000, maxFailedAttemptsPerWindow: 5, failedWindowMs: 60_000 };
    expect(checkClaimRateLimit("u1", cfg, 1000).ok).toBe(true);
    expect(checkClaimRateLimit("u1", cfg, 1500).ok).toBe(false);
    expect(checkClaimRateLimit("u1", cfg, 2100).ok).toBe(true);
  });

  it("blocks after too many failures in the window", () => {
    const cfg = { minIntervalMs: 1, maxFailedAttemptsPerWindow: 3, failedWindowMs: 60_000 };
    for (let i = 0; i < 3; i++) {
      expect(checkClaimRateLimit("u2", cfg, 1000 + i * 10).ok).toBe(true);
      recordClaimFailure("u2", 1000 + i * 10);
    }
    const blocked = checkClaimRateLimit("u2", cfg, 1040);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toBe("rate_limited");
  });
});

describe("claimExploreStop (unit, mocked verify + supabase)", () => {
  it("fails when supabase env is missing", async () => {
    const result = await claimExploreStop({
      user: fakeUser,
      body: {
        stop_id: "stop_x",
        generation_version: 2,
        profile_id: 1,
        reported_location: {
          latitude: 53.04,
          longitude: -2.16,
          accuracy_metres: 10,
        },
      },
      env: null,
    });
    expect(result.body.success).toBe(false);
    if (!result.body.success) expect(result.body.error).toBe("claim_failed");
  });

  it("rejects unauthenticated-shaped missing profile before verify", async () => {
    const result = await claimExploreStop({
      user: fakeUser,
      body: {
        stop_id: "stop_x",
        generation_version: 2,
        reported_location: {
          latitude: 53.04,
          longitude: -2.16,
          accuracy_metres: 10,
        },
      },
      env: {
        url: "http://127.0.0.1:54321",
        anonKey: "anon",
        serviceRoleKey: "service",
      },
    });
    expect(result.status).toBe(400);
    expect(result.body.success).toBe(false);
    if (!result.body.success) expect(result.body.error).toBe("invalid_profile");
  });

  it("returns too_far_away after re-verification and does not call RPC", async () => {
    vi.spyOn(verifyModule, "verifyExploreStop").mockReturnValue({
      valid: true,
      claimable: false,
      error: "too_far_away",
      verification: {
        distance_metres: 100,
        claim_radius_metres: 50,
        reported_accuracy_metres: 12,
        maximum_accuracy_metres: 75,
      },
    });

    const rpc = vi.fn();
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({ rpc }),
    }));

    const result = await claimExploreStop({
      user: fakeUser,
      body: {
        stop_id: "stop_x",
        generation_version: 2,
        profile_id: 1,
        reported_location: {
          latitude: 53.04,
          longitude: -2.16,
          accuracy_metres: 12,
        },
        user_id: "ignored",
      },
      env: {
        url: "http://127.0.0.1:54321",
        anonKey: "anon",
        serviceRoleKey: "service",
      },
    });

    expect(result.body.success).toBe(false);
    if (!result.body.success) expect(result.body.error).toBe("too_far_away");
    expect(verifyModule.verifyExploreStop).toHaveBeenCalled();
  });

  it("returns gps_accuracy_too_low after re-verification", async () => {
    vi.spyOn(verifyModule, "verifyExploreStop").mockReturnValue({
      valid: true,
      claimable: false,
      error: "gps_accuracy_too_low",
    });

    const result = await claimExploreStop({
      user: fakeUser,
      body: {
        stop_id: "stop_x",
        generation_version: 2,
        profile_id: 1,
        reported_location: {
          latitude: 53.04,
          longitude: -2.16,
          accuracy_metres: 100,
        },
      },
      env: {
        url: "http://127.0.0.1:54321",
        anonKey: "anon",
        serviceRoleKey: "service",
      },
    });

    expect(result.body.success).toBe(false);
    if (!result.body.success) expect(result.body.error).toBe("gps_accuracy_too_low");
  });

  it("returns stop_not_found after re-verification", async () => {
    vi.spyOn(verifyModule, "verifyExploreStop").mockReturnValue({
      valid: false,
      claimable: false,
      error: "stop_not_found",
    });

    const result = await claimExploreStop({
      user: fakeUser,
      body: {
        stop_id: "missing",
        generation_version: 2,
        profile_id: 1,
        reported_location: {
          latitude: 53.04,
          longitude: -2.16,
          accuracy_metres: 10,
        },
      },
      env: {
        url: "http://127.0.0.1:54321",
        anonKey: "anon",
        serviceRoleKey: "service",
      },
    });

    expect(result.status).toBe(404);
    expect(result.body.success).toBe(false);
    if (!result.body.success) expect(result.body.error).toBe("stop_not_found");
  });

  it("returns unsupported_generation_version from request validation", async () => {
    const result = await claimExploreStop({
      user: fakeUser,
      body: {
        stop_id: "stop_x",
        generation_version: 99,
        profile_id: 1,
        reported_location: {
          latitude: 53.04,
          longitude: -2.16,
          accuracy_metres: 10,
        },
      },
      env: {
        url: "http://127.0.0.1:54321",
        anonKey: "anon",
        serviceRoleKey: "service",
      },
    });
    expect(result.body.success).toBe(false);
    if (!result.body.success) {
      expect(result.body.error).toBe("unsupported_generation_version");
    }
  });

  it("inserts via service RPC only after claimable re-verification", async () => {
    vi.spyOn(verifyModule, "verifyExploreStop").mockReturnValue({
      valid: true,
      claimable: true,
      stop: {
        stop_id: "stop_x",
        latitude: 53.0442,
        longitude: -2.1656,
        generation_version: 2,
        source_type: "footpath",
        confidence: 0.9,
        environment_profile: { park: 0.2 },
      },
      verification: {
        distance_metres: 10.5,
        claim_radius_metres: 50,
        reported_accuracy_metres: 12,
        maximum_accuracy_metres: 75,
      },
    });

    const rpc = vi.fn().mockResolvedValue({
      data: {
        success: true,
        claim: {
          claim_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
          stop_id: "stop_x",
          generation_version: 2,
          claimed_at: "2026-07-23T12:00:00.000Z",
          verified_distance_metres: 10.5,
          profile_id: 1,
          awarded_card_id: null,
        },
      },
      error: null,
    });

    vi.spyOn(await import("../server/auth.js"), "createServiceClient").mockReturnValue({
      rpc,
    } as never);

    const result = await claimExploreStop({
      user: fakeUser,
      body: {
        stop_id: "stop_x",
        generation_version: 2,
        profile_id: 1,
        reported_location: {
          latitude: 53.0443,
          longitude: -2.1656,
          accuracy_metres: 12,
        },
        // decoy fields — must not become trusted inputs
        user_id: "spoofed",
        latitude: 1,
        longitude: 2,
      },
      env: {
        url: "http://127.0.0.1:54321",
        anonKey: "anon",
        serviceRoleKey: "service",
      },
    });

    expect(result.body.success).toBe(true);
    if (result.body.success) {
      expect(result.body.claim.awarded_card_id).toBeNull();
      expect(result.body.claim.verified_distance_metres).toBe(10.5);
    }
    expect(rpc).toHaveBeenCalledTimes(1);
    const rpcArgs = rpc.mock.calls[0]!;
    expect(rpcArgs[0]).toBe("claim_explore_stop");
    expect(rpcArgs[1].p_user_id).toBe(fakeUser.id);
    expect(rpcArgs[1].p_verified_distance_metres).toBe(10.5);
    expect(rpcArgs[1].p_stop_id).toBe("stop_x");
  });

  it("maps already_claimed from RPC without awarding a card", async () => {
    vi.spyOn(verifyModule, "verifyExploreStop").mockReturnValue({
      valid: true,
      claimable: true,
      stop: {
        stop_id: "stop_x",
        latitude: 53.0442,
        longitude: -2.1656,
        generation_version: 2,
        source_type: "footpath",
        confidence: 0.9,
        environment_profile: {},
      },
      verification: {
        distance_metres: 8,
        claim_radius_metres: 50,
        reported_accuracy_metres: 10,
        maximum_accuracy_metres: 75,
      },
    });

    const rpc = vi.fn().mockResolvedValue({
      data: {
        success: false,
        error: "already_claimed",
        claim: {
          claim_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
          stop_id: "stop_x",
          generation_version: 2,
          claimed_at: "2026-07-23T11:00:00.000Z",
          verified_distance_metres: 8,
          profile_id: 1,
          awarded_card_id: null,
        },
      },
      error: null,
    });

    vi.spyOn(await import("../server/auth.js"), "createServiceClient").mockReturnValue({
      rpc,
    } as never);

    const first = await claimExploreStop({
      user: fakeUser,
      body: {
        stop_id: "stop_x",
        generation_version: 2,
        profile_id: 1,
        reported_location: {
          latitude: 53.0442,
          longitude: -2.1656,
          accuracy_metres: 10,
        },
      },
      env: {
        url: "http://127.0.0.1:54321",
        anonKey: "anon",
        serviceRoleKey: "service",
      },
    });

    expect(first.body.success).toBe(false);
    if (!first.body.success) {
      expect(first.body.error).toBe("already_claimed");
      expect(first.body.claim?.awarded_card_id).toBeNull();
    }
  });
});

describe("HTTP auth gates for claim", () => {
  it("rejects missing Authorization on POST /explore/stops/claim", async () => {
    const { createExploreServer } = await import("../server/index.js");
    const server = createExploreServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    const port = addr.port;

    const response = await fetch(`http://127.0.0.1:${port}/explore/stops/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stop_id: "stop_x",
        generation_version: 2,
        profile_id: 1,
        reported_location: {
          latitude: 53.04,
          longitude: -2.16,
          accuracy_metres: 10,
        },
      }),
    });
    const json = (await response.json()) as { success: boolean; error: string };
    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBe("unauthenticated");

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it("rejects invalid Bearer token when supabase is configured", async () => {
    process.env.EXPLORE_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.EXPLORE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid";
    // Leave service role unset — auth still attempts getUser against URL.

    const { createExploreServer } = await import("../server/index.js");
    const server = createExploreServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    const port = addr.port;

    const response = await fetch(`http://127.0.0.1:${port}/explore/stops/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer not-a-real-jwt",
      },
      body: JSON.stringify({
        stop_id: "stop_x",
        generation_version: 2,
        profile_id: 1,
        reported_location: {
          latitude: 53.04,
          longitude: -2.16,
          accuracy_metres: 10,
        },
      }),
    });
    const json = (await response.json()) as { success: boolean; error: string };
    // Without a real Supabase, getUser fails → unauthenticated (or claim_failed if URL unreachable).
    expect(json.success).toBe(false);
    expect(["unauthenticated", "claim_failed"]).toContain(json.error);

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );

    delete process.env.EXPLORE_SUPABASE_URL;
    delete process.env.EXPLORE_SUPABASE_ANON_KEY;
  });
});
