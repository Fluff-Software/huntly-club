import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { loadExploreEnv, requireAuthenticatedUser, createServiceClient } from "../_shared/explore/auth.ts";
import { CORS_HEADERS, errorResponse, jsonResponse, withCors } from "../_shared/explore/errors.ts";
import { createRequestId, exploreLog } from "../_shared/explore/logging.ts";
import { checkRateLimit } from "../_shared/explore/rate-limit.ts";
import { validateVerifyBody, runVerify } from "../_shared/explore/verify.ts";

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
    category: "verify",
  });
  if (!rate.ok) {
    return withCors(
      errorResponse(
        429,
        { error: "rate_limited", retry_after_seconds: rate.retry_after_seconds },
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

  const validated = validateVerifyBody(body);
  if (!validated.ok) {
    return withCors(jsonResponse(validated.result, 400, { "X-Request-Id": requestId }));
  }

  const acquisitionRate = await checkRateLimit(service, {
    subjectId: auth.user.id,
    category: "tile_acquisition",
  });

  const result = await runVerify({
    service,
    request: validated.request,
    requestId,
    allowAcquisition: acquisitionRate.ok,
    userId: auth.user.id,
  });

  exploreLog("verify_result", {
    request_id: requestId,
    function: "explore-verify",
    outcome: String(result.body.error ?? (result.body.claimable ? "claimable" : "ok")),
  });

  return withCors(jsonResponse(result.body, result.status, { "X-Request-Id": requestId }));
});
