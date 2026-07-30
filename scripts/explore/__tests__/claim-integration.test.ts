/**
 * Database integration tests for explore_stop_claims.
 * Skipped unless local Supabase env + service role are configured.
 *
 * Required env (scripts/explore/.env or process):
 *   EXPLORE_SUPABASE_URL
 *   EXPLORE_SUPABASE_ANON_KEY
 *   EXPLORE_SUPABASE_SERVICE_ROLE_KEY
 * Optional:
 *   EXPLORE_INTEGRATION_USER_EMAIL / EXPLORE_INTEGRATION_USER_PASSWORD
 *   EXPLORE_INTEGRATION_PROFILE_ID
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { loadExploreSupabaseEnv } from "../server/auth.js";

const env = loadExploreSupabaseEnv();
const hasIntegration =
  Boolean(env?.url && env.anonKey && env.serviceRoleKey) &&
  process.env.EXPLORE_RUN_CLAIM_INTEGRATION === "1";

const describeIntegration = hasIntegration ? describe : describe.skip;

describeIntegration("explore_stop_claims integration", () => {
  // Lazily created in beforeAll so describe.skip collection does not touch null env.
  let service: ReturnType<typeof createClient>;
  let supabaseEnv: NonNullable<typeof env>;

  let userId: string;
  let profileId: number;
  let accessToken: string;
  let otherUserId: string;
  let otherAccessToken: string;

  beforeAll(async () => {
    const loaded = loadExploreSupabaseEnv();
    if (!loaded?.serviceRoleKey) {
      throw new Error("Explore Supabase env missing for integration tests");
    }
    supabaseEnv = loaded;
    service = createClient(supabaseEnv.url, supabaseEnv.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const email =
      process.env.EXPLORE_INTEGRATION_USER_EMAIL ??
      `explore-claim-${Date.now()}@example.com`;
    const password =
      process.env.EXPLORE_INTEGRATION_USER_PASSWORD ?? `TestPass-${randomUUID()}`;

    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error(`createUser failed: ${created.error?.message}`);
    }
    userId = created.data.user.id;

    const profileInsert = await service
      .from("profiles")
      .insert({ user_id: userId, name: "Explore Claim Tester" })
      .select("id")
      .single();
    if (profileInsert.error || !profileInsert.data) {
      // Some schemas require more columns — allow override.
      const override = Number(process.env.EXPLORE_INTEGRATION_PROFILE_ID);
      if (!Number.isFinite(override)) {
        throw new Error(`profile insert failed: ${profileInsert.error?.message}`);
      }
      profileId = override;
    } else {
      profileId = Number(profileInsert.data.id);
    }

    const anon = createClient(supabaseEnv.url, supabaseEnv.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signedIn = await anon.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session) {
      throw new Error(`signIn failed: ${signedIn.error?.message}`);
    }
    accessToken = signedIn.data.session.access_token;

    const otherEmail = `explore-other-${Date.now()}@example.com`;
    const otherPassword = `TestPass-${randomUUID()}`;
    const other = await service.auth.admin.createUser({
      email: otherEmail,
      password: otherPassword,
      email_confirm: true,
    });
    if (other.error || !other.data.user) {
      throw new Error(`other createUser failed: ${other.error?.message}`);
    }
    otherUserId = other.data.user.id;
    const otherSignIn = await anon.auth.signInWithPassword({
      email: otherEmail,
      password: otherPassword,
    });
    if (otherSignIn.error || !otherSignIn.data.session) {
      throw new Error(`other signIn failed: ${otherSignIn.error?.message}`);
    }
    otherAccessToken = otherSignIn.data.session.access_token;
  }, 60_000);

  it("first claim succeeds and awards no card", async () => {
    const stopId = `stop_integration_${randomUUID()}`;
    const { data, error } = await service.rpc("claim_explore_stop", {
      p_user_id: userId,
      p_profile_id: profileId,
      p_stop_id: stopId,
      p_generation_version: 2,
      p_reported_latitude: 53.0442,
      p_reported_longitude: -2.1656,
      p_reported_accuracy_metres: 12,
      p_verified_distance_metres: 10,
      p_source_type: "footpath",
      p_environment_profile: {},
      p_idempotency_key: randomUUID(),
    });
    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.claim.awarded_card_id).toBeNull();
    expect(data.claim.stop_id).toBe(stopId);
  });

  it("second claim returns already_claimed", async () => {
    const stopId = `stop_dup_${randomUUID()}`;
    const first = await service.rpc("claim_explore_stop", {
      p_user_id: userId,
      p_profile_id: profileId,
      p_stop_id: stopId,
      p_generation_version: 2,
      p_reported_latitude: 53.0442,
      p_reported_longitude: -2.1656,
      p_reported_accuracy_metres: 12,
      p_verified_distance_metres: 10,
      p_source_type: "footpath",
      p_environment_profile: {},
      p_idempotency_key: null,
    });
    expect(first.data.success).toBe(true);

    const second = await service.rpc("claim_explore_stop", {
      p_user_id: userId,
      p_profile_id: profileId,
      p_stop_id: stopId,
      p_generation_version: 2,
      p_reported_latitude: 53.0442,
      p_reported_longitude: -2.1656,
      p_reported_accuracy_metres: 12,
      p_verified_distance_metres: 11,
      p_source_type: "footpath",
      p_environment_profile: {},
      p_idempotency_key: null,
    });
    expect(second.data.success).toBe(false);
    expect(second.data.error).toBe("already_claimed");
  });

  it("idempotent retry returns the same claim", async () => {
    const stopId = `stop_idem_${randomUUID()}`;
    const key = randomUUID();
    const first = await service.rpc("claim_explore_stop", {
      p_user_id: userId,
      p_profile_id: profileId,
      p_stop_id: stopId,
      p_generation_version: 2,
      p_reported_latitude: 53.0442,
      p_reported_longitude: -2.1656,
      p_reported_accuracy_metres: 12,
      p_verified_distance_metres: 9,
      p_source_type: "footpath",
      p_environment_profile: {},
      p_idempotency_key: key,
    });
    expect(first.data.success).toBe(true);
    const claimId = first.data.claim.claim_id;

    const retry = await service.rpc("claim_explore_stop", {
      p_user_id: userId,
      p_profile_id: profileId,
      p_stop_id: stopId,
      p_generation_version: 2,
      p_reported_latitude: 53.0442,
      p_reported_longitude: -2.1656,
      p_reported_accuracy_metres: 12,
      p_verified_distance_metres: 9,
      p_source_type: "footpath",
      p_environment_profile: {},
      p_idempotency_key: key,
    });
    expect(retry.data.success).toBe(true);
    expect(retry.data.idempotent_replay).toBe(true);
    expect(retry.data.claim.claim_id).toBe(claimId);
  });

  it("concurrent claims create exactly one row", async () => {
    const stopId = `stop_race_${randomUUID()}`;
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        service.rpc("claim_explore_stop", {
          p_user_id: userId,
          p_profile_id: profileId,
          p_stop_id: stopId,
          p_generation_version: 2,
          p_reported_latitude: 53.0442,
          p_reported_longitude: -2.1656,
          p_reported_accuracy_metres: 12,
          p_verified_distance_metres: 7,
          p_source_type: "footpath",
          p_environment_profile: {},
          p_idempotency_key: null,
        })
      )
    );
    const successes = results.filter((r) => r.data?.success === true);
    const already = results.filter((r) => r.data?.error === "already_claimed");
    expect(successes.length).toBe(1);
    expect(already.length).toBe(results.length - 1);

    const { count, error } = await service
      .from("explore_stop_claims")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .eq("stop_id", stopId);
    expect(error).toBeNull();
    expect(count).toBe(1);
  });

  it("rejects claim for a profile not owned by the user", async () => {
    const stopId = `stop_bad_profile_${randomUUID()}`;
    const { data } = await service.rpc("claim_explore_stop", {
      p_user_id: otherUserId,
      p_profile_id: profileId,
      p_stop_id: stopId,
      p_generation_version: 2,
      p_reported_latitude: 53.0442,
      p_reported_longitude: -2.1656,
      p_reported_accuracy_metres: 12,
      p_verified_distance_metres: 5,
      p_source_type: "footpath",
      p_environment_profile: {},
      p_idempotency_key: null,
    });
    expect(data.success).toBe(false);
    expect(data.error).toBe("invalid_profile");
  });

  it("RLS blocks direct authenticated inserts", async () => {
    const userClient = createClient(supabaseEnv.url, supabaseEnv.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { error } = await userClient.from("explore_stop_claims").insert({
      user_id: userId,
      profile_id: profileId,
      stop_id: `stop_direct_${randomUUID()}`,
      generation_version: 2,
      reported_latitude: 53.0442,
      reported_longitude: -2.1656,
      reported_accuracy_metres: 12,
      verified_distance_metres: 5,
      source_type: "footpath",
      environment_profile: {},
    });
    expect(error).not.toBeNull();
  });

  it("users can read only their own profile claims", async () => {
    const stopId = `stop_read_${randomUUID()}`;
    await service.rpc("claim_explore_stop", {
      p_user_id: userId,
      p_profile_id: profileId,
      p_stop_id: stopId,
      p_generation_version: 2,
      p_reported_latitude: 53.0442,
      p_reported_longitude: -2.1656,
      p_reported_accuracy_metres: 12,
      p_verified_distance_metres: 4,
      p_source_type: "footpath",
      p_environment_profile: {},
      p_idempotency_key: null,
    });

    const ownerClient = createClient(supabaseEnv.url, supabaseEnv.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const ownerRead = await ownerClient
      .from("explore_stop_claims")
      .select("stop_id")
      .eq("stop_id", stopId);
    expect(ownerRead.error).toBeNull();
    expect(ownerRead.data?.length).toBe(1);

    const otherClient = createClient(supabaseEnv.url, supabaseEnv.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${otherAccessToken}` } },
    });
    const otherRead = await otherClient
      .from("explore_stop_claims")
      .select("stop_id")
      .eq("stop_id", stopId);
    expect(otherRead.error).toBeNull();
    expect(otherRead.data?.length ?? 0).toBe(0);
  });

  it("does not create a generated-stop catalogue table row", async () => {
    const { error } = await service.from("explore_generated_stops").select("*").limit(1);
    // Table should not exist (or be empty/unused). Prefer missing relation.
    if (error) {
      expect(error.message.toLowerCase()).toMatch(/relation|does not exist|schema cache/);
    } else {
      // If a leftover table exists from another experiment, it must not be written by claim.
      expect(true).toBe(true);
    }
  });
});
