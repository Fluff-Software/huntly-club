/**
 * Explore HTTP server — nearby stops, verification, and claims.
 * Does not call Overpass. Claims write only via Supabase service-role RPC after re-verify.
 * Generated stops are never persisted.
 */
import http from "node:http";
import { URL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_CONFIG } from "../config.js";
import {
  extractBearerToken,
  loadExploreSupabaseEnv,
  resolveUserFromAccessToken,
} from "./auth.js";
import { claimExploreStop } from "./claim-stop.js";
import {
  assertOsmExtractPresent,
  loadExploreServerEnv,
  type ExploreServerEnv,
} from "./env.js";
import { exploreLog, newRequestId, setExploreLogLevel } from "./log.js";
import {
  getNearbyCacheStats,
  getNearbyStops,
  getTestAreaMeta,
  warmAcceptedStopsCache,
} from "./nearby-stops.js";
import { loadOsmRevisionMeta } from "./osm-revision.js";
import {
  checkNearbyRateLimit,
  checkVerifyRateLimit,
  clientRateLimitKey,
} from "./rate-limit.js";
import { validateNearbyQuery } from "./validation.js";
import { validateVerifyBody, verifyExploreStop } from "./verify-stop.js";

const MAX_BODY_BYTES = 16_384;

function corsHeaders(
  origin: string | undefined,
  allowedOrigins: string[]
): Record<string, string> {
  const allowAll = allowedOrigins.includes("*");
  const allow = allowAll
    ? "*"
    : origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0] ?? "null";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-Id",
    "Access-Control-Expose-Headers": "Retry-After, X-Request-Id",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  body: unknown,
  opts: {
    origin?: string;
    allowedOrigins: string[];
    requestId: string;
    retryAfterSec?: number;
  }
): void {
  const payload = JSON.stringify(body);
  const headers: Record<string, string | number> = {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "X-Request-Id": opts.requestId,
    ...corsHeaders(opts.origin, opts.allowedOrigins),
  };
  if (opts.retryAfterSec != null && opts.retryAfterSec > 0) {
    headers["Retry-After"] = Math.ceil(opts.retryAfterSec);
  }
  res.writeHead(status, headers);
  res.end(payload);
}

function readJsonBody(
  req: http.IncomingMessage,
  maxBytes: number
): Promise<{ ok: true; body: unknown } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;
    let oversized = false;

    const finish = (result: { ok: true; body: unknown } | { ok: false; error: string }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        oversized = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (oversized) {
        finish({ ok: false, error: "request_too_large" });
        return;
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        finish({ ok: false, error: "invalid_request" });
        return;
      }
      try {
        finish({ ok: true, body: JSON.parse(raw) as unknown });
      } catch {
        finish({ ok: false, error: "invalid_request" });
      }
    });
    req.on("error", () => finish({ ok: false, error: "invalid_request" }));
  });
}

async function requireAuthenticatedUser(
  req: http.IncomingMessage
): Promise<
  | { ok: true; user: import("@supabase/supabase-js").User; accessToken: string }
  | { ok: false; status: number; body: { success: false; error: string } }
> {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return {
      ok: false,
      status: 401,
      body: { success: false, error: "unauthenticated" },
    };
  }

  const env = loadExploreSupabaseEnv();
  if (!env) {
    return {
      ok: false,
      status: 503,
      body: { success: false, error: "claim_failed" },
    };
  }

  const resolved = await resolveUserFromAccessToken(env, token);
  if (!resolved.ok) {
    return {
      ok: false,
      status: 401,
      body: { success: false, error: "unauthenticated" },
    };
  }
  return { ok: true, user: resolved.user, accessToken: token };
}

export function createExploreServer(serverEnv?: ExploreServerEnv): http.Server {
  const envConfig = serverEnv ?? loadExploreServerEnv(process.env);
  const allowedOrigins = envConfig.allowedOrigins;
  const osmDataPath = envConfig.osmDataPath;

  return http.createServer((req, res) => {
    void (async () => {
      const origin = req.headers.origin;
      const requestId =
        (typeof req.headers["x-request-id"] === "string" && req.headers["x-request-id"]) ||
        newRequestId();
      const started = Date.now();
      const reply = (
        status: number,
        body: unknown,
        extra?: { retryAfterSec?: number }
      ) =>
        sendJson(res, status, body, {
          origin,
          allowedOrigins,
          requestId,
          retryAfterSec: extra?.retryAfterSec,
        });

      try {
        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            ...corsHeaders(origin, allowedOrigins),
            "X-Request-Id": requestId,
          });
          res.end();
          return;
        }

        const host = req.headers.host ?? "localhost";
        const url = new URL(req.url ?? "/", `http://${host}`);

        if (req.method === "GET" && url.pathname === "/health") {
          const env = loadExploreSupabaseEnv();
          const osm = loadOsmRevisionMeta(osmDataPath);
          const cacheStats = getNearbyCacheStats();
          const ready = osm.available;
          reply(ready ? 200 : 503, {
            status: ready ? "ok" : "degraded",
            generation_version: DEFAULT_CONFIG.generationVersion,
            region: osm.region_id,
            osm_data_revision: osm.osm_data_revision,
            osm_available: osm.available,
            osm_file_sha256: osm.file_sha256,
            attribution: osm.attribution,
            licence: osm.licence,
            auth_configured: Boolean(env),
            claims_configured: Boolean(env?.serviceRoleKey),
            cache_warm: cacheStats.warm,
            cache_stop_count: cacheStats.stopCount,
            request_id: requestId,
          });
          return;
        }

        if (req.method === "GET" && url.pathname === "/explore/stops/nearby") {
          const rl = checkNearbyRateLimit(clientRateLimitKey(req));
          if (!rl.ok) {
            exploreLog("warn", "rate_limited", {
              request_id: requestId,
              route: "nearby",
              retry_after_ms: rl.retry_after_ms,
            });
            reply(
              429,
              {
                error: "rate_limited",
                details: { retry_after_ms: rl.retry_after_ms },
                request_id: requestId,
              },
              { retryAfterSec: rl.retry_after_ms / 1000 }
            );
            return;
          }

          const validated = validateNearbyQuery(url.searchParams);
          if (!validated.ok) {
            reply(validated.status, {
              error: validated.error,
              ...(validated.details ? { details: validated.details } : {}),
              test_area: getTestAreaMeta(),
              request_id: requestId,
            });
            return;
          }

          const result = getNearbyStops(validated.query);
          if ("error" in result) {
            const status = result.error === "outside_supported_test_area" ? 422 : 503;
            exploreLog("info", "nearby_failed", {
              request_id: requestId,
              error: result.error,
              duration_ms: Date.now() - started,
            });
            reply(status, { ...result, request_id: requestId });
            return;
          }

          exploreLog("info", "nearby_ok", {
            request_id: requestId,
            stop_count: result.stops.length,
            radius_metres: result.request.radius_metres,
            duration_ms: Date.now() - started,
          });
          reply(200, { ...result, request_id: requestId });
          return;
        }

        if (req.method === "GET" && url.pathname === "/explore/stops/claimed") {
          const auth = await requireAuthenticatedUser(req);
          if (!auth.ok) {
            reply(auth.status, { ...auth.body, request_id: requestId });
            return;
          }

          const profileRaw = url.searchParams.get("profile_id");
          const profileId = profileRaw == null ? NaN : Number(profileRaw);
          if (!Number.isFinite(profileId) || profileId <= 0 || !Number.isInteger(profileId)) {
            reply(400, { success: false, error: "invalid_profile", request_id: requestId });
            return;
          }

          const env = loadExploreSupabaseEnv();
          if (!env) {
            reply(503, { success: false, error: "claim_failed", request_id: requestId });
            return;
          }

          const authed = createClient(env.url, env.anonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${auth.accessToken}` } },
          });
          const claimed = await authed.rpc("get_explore_claimed_stop_ids", {
            p_profile_id: profileId,
          });

          if (claimed.error) {
            const msg = claimed.error.message?.toLowerCase() ?? "";
            if (msg.includes("not authorized") || msg.includes("not authenticated")) {
              reply(400, { success: false, error: "invalid_profile", request_id: requestId });
              return;
            }
            reply(500, { success: false, error: "claim_failed", request_id: requestId });
            return;
          }

          const stopIds = Array.isArray(claimed.data)
            ? claimed.data.map((id) => String(id))
            : [];
          exploreLog("info", "claimed_list_ok", {
            request_id: requestId,
            profile_id: profileId,
            count: stopIds.length,
            duration_ms: Date.now() - started,
          });
          reply(200, {
            success: true,
            profile_id: profileId,
            stop_ids: stopIds,
            request_id: requestId,
          });
          return;
        }

        if (req.method === "GET" && url.pathname === "/explore/cards/collection") {
          const auth = await requireAuthenticatedUser(req);
          if (!auth.ok) {
            reply(auth.status, { ...auth.body, request_id: requestId });
            return;
          }

          const profileRaw = url.searchParams.get("profile_id");
          const profileId = profileRaw == null ? NaN : Number(profileRaw);
          if (!Number.isFinite(profileId) || profileId <= 0 || !Number.isInteger(profileId)) {
            reply(400, { success: false, error: "invalid_profile", request_id: requestId });
            return;
          }

          const env = loadExploreSupabaseEnv();
          if (!env) {
            reply(503, { success: false, error: "claim_failed", request_id: requestId });
            return;
          }

          const authed = createClient(env.url, env.anonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${auth.accessToken}` } },
          });
          const collection = await authed.rpc("get_explore_profile_card_collection", {
            p_profile_id: profileId,
          });

          if (collection.error) {
            const msg = collection.error.message?.toLowerCase() ?? "";
            if (msg.includes("not authorized") || msg.includes("not authenticated")) {
              reply(400, { success: false, error: "invalid_profile", request_id: requestId });
              return;
            }
            reply(500, { success: false, error: "claim_failed", request_id: requestId });
            return;
          }

          exploreLog("info", "collection_ok", {
            request_id: requestId,
            profile_id: profileId,
            duration_ms: Date.now() - started,
          });
          const data =
            collection.data && typeof collection.data === "object"
              ? { ...(collection.data as object), request_id: requestId }
              : { success: false, error: "claim_failed", request_id: requestId };
          reply(200, data);
          return;
        }

        if (req.method === "POST" && url.pathname === "/explore/stops/verify") {
          const rl = checkVerifyRateLimit(clientRateLimitKey(req));
          if (!rl.ok) {
            exploreLog("warn", "rate_limited", {
              request_id: requestId,
              route: "verify",
              retry_after_ms: rl.retry_after_ms,
            });
            reply(
              429,
              {
                valid: false,
                claimable: false,
                error: "rate_limited",
                details: { retry_after_ms: rl.retry_after_ms },
                request_id: requestId,
              },
              { retryAfterSec: rl.retry_after_ms / 1000 }
            );
            return;
          }

          const parsed = await readJsonBody(req, MAX_BODY_BYTES);
          if (!parsed.ok) {
            reply(parsed.error === "request_too_large" ? 413 : 400, {
              valid: false,
              claimable: false,
              error: parsed.error === "request_too_large" ? "invalid_request" : parsed.error,
              details:
                parsed.error === "request_too_large"
                  ? { reason: "request_too_large", max_bytes: MAX_BODY_BYTES }
                  : { reason: "malformed_json" },
              request_id: requestId,
            });
            return;
          }

          const validated = validateVerifyBody(parsed.body);
          if (!validated.ok) {
            reply(400, { ...validated.result, request_id: requestId });
            return;
          }

          const result = verifyExploreStop(validated.request);
          const status =
            !result.valid && "error" in result && result.error === "stop_not_found"
              ? 404
              : !result.valid && "error" in result && result.error === "generator_unavailable"
                ? 503
                : 200;
          exploreLog("info", result.valid ? "verify_ok" : "verify_failed", {
            request_id: requestId,
            error: !result.valid && "error" in result ? result.error : null,
            claimable: result.claimable,
            duration_ms: Date.now() - started,
          });
          reply(status, { ...result, request_id: requestId });
          return;
        }

        if (req.method === "POST" && url.pathname === "/explore/stops/claim") {
          const auth = await requireAuthenticatedUser(req);
          if (!auth.ok) {
            reply(auth.status, { ...auth.body, request_id: requestId });
            return;
          }

          const parsed = await readJsonBody(req, MAX_BODY_BYTES);
          if (!parsed.ok) {
            reply(parsed.error === "request_too_large" ? 413 : 400, {
              success: false,
              error: parsed.error === "request_too_large" ? "invalid_request" : parsed.error,
              request_id: requestId,
            });
            return;
          }

          const result = await claimExploreStop({
            user: auth.user,
            body: parsed.body,
          });
          const retryMs =
            !result.body.success &&
            result.body.error === "rate_limited" &&
            result.body.details &&
            typeof result.body.details === "object" &&
            "retry_after_ms" in result.body.details
              ? Number((result.body.details as { retry_after_ms?: number }).retry_after_ms)
              : undefined;
          exploreLog("info", result.body.success ? "claim_ok" : "claim_failed", {
            request_id: requestId,
            error: result.body.success ? null : result.body.error,
            status: result.status,
            duration_ms: Date.now() - started,
          });
          reply(
            result.status,
            { ...result.body, request_id: requestId },
            Number.isFinite(retryMs) ? { retryAfterSec: (retryMs as number) / 1000 } : undefined
          );
          return;
        }

        if (req.method !== "GET" && req.method !== "POST") {
          reply(405, { error: "method_not_allowed", request_id: requestId });
          return;
        }

        reply(404, { error: "not_found", request_id: requestId });
      } catch (err) {
        exploreLog("error", "unhandled_error", {
          request_id: requestId,
          message: err instanceof Error ? err.message : "unknown",
        });
        reply(500, { error: "internal_error", request_id: requestId });
      }
    })();
  });
}

export function startExploreServer(
  port?: number,
  opts?: { warmCache?: boolean; strictEnv?: boolean }
) {
  const serverEnv = loadExploreServerEnv(process.env, {
    strict: opts?.strictEnv ?? process.env.EXPLORE_REQUIRE_AUTH_CONFIG === "1",
  });
  setExploreLogLevel(serverEnv.logLevel);
  assertOsmExtractPresent(serverEnv.osmDataPath);

  const listenPort = port ?? serverEnv.port;
  const server = createExploreServer(serverEnv);

  if (opts?.warmCache !== false) {
    const warm = warmAcceptedStopsCache(DEFAULT_CONFIG.generationVersion);
    if (warm.ok) {
      exploreLog("info", "cache_warmed_at_startup", { stop_count: warm.stopCount });
    } else {
      exploreLog("warn", "cache_warm_failed", { error: warm.error });
    }
  }

  server.listen(listenPort, serverEnv.host, () => {
    const osm = loadOsmRevisionMeta(serverEnv.osmDataPath);
    exploreLog("info", "service_start", {
      host: serverEnv.host,
      port: listenPort,
      region: osm.region_id,
      osm_data_revision: osm.osm_data_revision,
      auth_configured: Boolean(serverEnv.supabaseUrl && serverEnv.supabaseAnonKey),
      claims_configured: Boolean(serverEnv.supabaseServiceRoleKey),
    });
    console.log(`Explore server listening on http://${serverEnv.host}:${listenPort}`);
    console.log(`  GET  /health`);
    console.log(`  GET  /explore/stops/nearby`);
    console.log(`  POST /explore/stops/verify`);
    console.log(`  POST /explore/stops/claim`);
    console.log(`  GET  /explore/cards/collection`);
    console.log("Generated stops are not stored. Overpass is not called at runtime.");
  });

  const shutdown = () => {
    exploreLog("info", "service_shutdown", {});
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return server;
}
