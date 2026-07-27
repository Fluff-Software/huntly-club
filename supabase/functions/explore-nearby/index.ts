import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { loadExploreEnv, requireAuthenticatedUser, createServiceClient } from "../_shared/explore/auth.ts";
import { CORS_HEADERS, errorResponse, jsonResponse, withCors } from "../_shared/explore/errors.ts";
import { createRequestId, exploreLog } from "../_shared/explore/logging.ts";
import {
  validateCatalogueNearbyBody,
  runCatalogueNearby,
} from "../_shared/explore/catalogue-nearby.ts";
import { checkRateLimit } from "../_shared/explore/rate-limit.ts";

/**
 * Step 10.3: nearby from persisted PostGIS catalogue.
 * Supersedes runtime OSM tile acquisition / generateStops on Edge.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const requestId = req.headers.get("x-request-id") ?? createRequestId();
  const env = loadExploreEnv();
  if (!env) {
    return withCors(
      errorResponse(503, { error: "service_misconfigured", message: "Explore env not configured." })
    );
  }

  if (req.method !== "POST") {
    return withCors(errorResponse(405, { error: "method_not_allowed" }));
  }

  const auth = await requireAuthenticatedUser(env, req);
  if (!auth.ok) {
    return withCors(errorResponse(auth.status, { error: auth.error }));
  }

  const service = createServiceClient(env);
  const rate = await checkRateLimit(service, {
    subjectId: auth.user.id,
    category: "nearby",
  });
  if (!rate.ok) {
    exploreLog("rate_limited", {
      request_id: requestId,
      function: "explore-nearby",
      category: "nearby",
    });
    return withCors(
      errorResponse(
        429,
        {
          error: "rate_limited",
          retry_after_seconds: rate.retry_after_seconds,
        },
        { "Retry-After": String(rate.retry_after_seconds) }
      )
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withCors(errorResponse(400, { error: "invalid_request" }));
  }

  const validated = validateCatalogueNearbyBody(body);
  if (!validated.ok) {
    return withCors(errorResponse(validated.status, validated.body as { error: string }));
  }

  const outcome = await runCatalogueNearby({
    service,
    request: validated.request,
    requestId,
  });

  if (outcome.kind === "no_coverage") {
    exploreLog("nearby_no_coverage", {
      request_id: requestId,
      function: "explore-nearby",
    });
    return withCors(jsonResponse(outcome.body, outcome.status, { "X-Request-Id": requestId }));
  }

  if (outcome.kind === "error") {
    exploreLog("nearby_error", {
      request_id: requestId,
      function: "explore-nearby",
      outcome: String(outcome.body.error ?? "error"),
    });
    return withCors(jsonResponse(outcome.body, outcome.status, { "X-Request-Id": requestId }));
  }

  exploreLog("nearby_ok", {
    request_id: requestId,
    function: "explore-nearby",
    outcome: "ok",
    mode: "catalogue",
    stop_count: (outcome.body as { stop_count?: number }).stop_count,
  });

  const { timings: _timings, ...clientBody } = outcome.body as Record<string, unknown> & {
    timings?: unknown;
  };
  return withCors(jsonResponse(clientBody, 200, { "X-Request-Id": requestId }));
});
