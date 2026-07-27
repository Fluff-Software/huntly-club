import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  ACTIVE_OSM_REVISION,
  GENERATION_VERSION,
  STORAGE_BUCKET,
  TILE_SCHEME,
  TILE_ZOOM,
} from "../_shared/explore/config.ts";
import { loadExploreEnv, createServiceClient } from "../_shared/explore/auth.ts";
import { CORS_HEADERS, jsonResponse, withCors } from "../_shared/explore/errors.ts";
import { isOsmProviderConfigured } from "../_shared/explore/osm-provider.ts";
import { probeStorageBucket } from "../_shared/explore/storage.ts";
import { tileSchemeMeta } from "../_shared/explore/tiles.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const env = loadExploreEnv();
  const authConfigured = Boolean(env?.anonKey && env?.supabaseUrl);
  const claimsConfigured = Boolean(env?.serviceRoleKey);
  let storageOk = false;
  let storageError: string | undefined;
  let rateLimitConfigured = false;

  if (env) {
    const service = createServiceClient(env);
    const probe = await probeStorageBucket(service);
    storageOk = probe.ok;
    storageError = probe.error;
    const { error } = await service.rpc("explore_check_rate_limit", {
      p_subject_id: "health-probe",
      p_category: "nearby",
      p_window_start: new Date(0).toISOString(),
      p_limit: 1,
      p_window_seconds: 60,
    });
    rateLimitConfigured = !error || !error.message?.includes("Could not find the function");
  }

  const body = {
    status: env && storageOk ? "ok" : "degraded",
    generation_version: GENERATION_VERSION,
    osm_revision: ACTIVE_OSM_REVISION,
    tile_scheme: TILE_SCHEME,
    tile_zoom: TILE_ZOOM,
    tile_scheme_meta: tileSchemeMeta(),
    storage_bucket: STORAGE_BUCKET,
    storage_accessible: storageOk,
    ...(storageError ? { storage_error: storageError } : {}),
    provider_configured: isOsmProviderConfigured(),
    auth_configured: authConfigured,
    claims_configured: claimsConfigured,
    rate_limit_rpc_configured: rateLimitConfigured,
    timestamp: new Date().toISOString(),
  };

  const status = body.status === "ok" ? 200 : 503;
  return withCors(jsonResponse(body, status));
});
