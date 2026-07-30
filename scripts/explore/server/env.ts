/**
 * Explore server environment loading and fail-fast validation.
 * Never logs secret values.
 */
import fs from "node:fs";
import path from "node:path";
import { EXPLORE_PACKAGE_ROOT, LOCAL_OSM_GEOJSON_PATH } from "../config.js";

const PACKAGE_ROOT = EXPLORE_PACKAGE_ROOT;

export type ExploreServerEnv = {
  port: number;
  host: string;
  allowedOrigins: string[];
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  supabaseServiceRoleKey: string | null;
  osmDataPath: string;
  logLevel: "debug" | "info" | "warn" | "error";
  requireAuthConfig: boolean;
};

function parseOrigins(raw: string | undefined): string[] {
  const value = (raw ?? "*").trim();
  if (!value || value === "*") return ["*"];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseLogLevel(raw: string | undefined): ExploreServerEnv["logLevel"] {
  const v = (raw ?? "info").trim().toLowerCase();
  if (v === "debug" || v === "info" || v === "warn" || v === "error") return v;
  return "info";
}

export function resolveOsmDataPath(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.EXPLORE_OSM_DATA_PATH?.trim();
  if (override) return path.isAbsolute(override) ? override : path.join(PACKAGE_ROOT, override);
  return LOCAL_OSM_GEOJSON_PATH;
}

/**
 * Load server config. Does not throw unless `strict` and required hosted fields missing.
 */
export function loadExploreServerEnv(
  env: NodeJS.ProcessEnv = process.env,
  opts?: { strict?: boolean }
): ExploreServerEnv {
  const portRaw = env.PORT || env.EXPLORE_SERVER_PORT || "4310";
  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT / EXPLORE_SERVER_PORT: ${portRaw}`);
  }

  const supabaseUrl =
    env.EXPLORE_SUPABASE_URL?.trim() || env.SUPABASE_URL?.trim() || null;
  const supabaseAnonKey =
    env.EXPLORE_SUPABASE_ANON_KEY?.trim() || env.SUPABASE_ANON_KEY?.trim() || null;
  const supabaseServiceRoleKey =
    env.EXPLORE_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null;

  const osmDataPath = resolveOsmDataPath(env);
  const requireAuthConfig = (env.EXPLORE_REQUIRE_AUTH_CONFIG ?? "").trim() === "1";

  const config: ExploreServerEnv = {
    port,
    host: (env.EXPLORE_SERVER_HOST ?? "0.0.0.0").trim() || "0.0.0.0",
    allowedOrigins: parseOrigins(env.EXPLORE_ALLOWED_ORIGINS ?? env.EXPLORE_ALLOWED_ORIGIN),
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    osmDataPath,
    logLevel: parseLogLevel(env.EXPLORE_LOG_LEVEL),
    requireAuthConfig,
  };

  if (opts?.strict || requireAuthConfig) {
    const missing: string[] = [];
    if (!config.supabaseUrl) missing.push("EXPLORE_SUPABASE_URL");
    if (!config.supabaseAnonKey) missing.push("EXPLORE_SUPABASE_ANON_KEY");
    if (!config.supabaseServiceRoleKey) missing.push("EXPLORE_SUPABASE_SERVICE_ROLE_KEY");
    if (!fs.existsSync(config.osmDataPath)) {
      missing.push(`OSM extract at EXPLORE_OSM_DATA_PATH (${config.osmDataPath})`);
    }
    if (missing.length > 0) {
      throw new Error(
        `Explore server misconfigured. Missing or invalid: ${missing.join(", ")}. ` +
          `Secrets must come from the host environment — never bake them into the image.`
      );
    }
  }

  return config;
}

export function assertOsmExtractPresent(osmDataPath: string): void {
  if (!fs.existsSync(osmDataPath)) {
    throw new Error(
      `Prepared OSM extract not found at ${osmDataPath}. ` +
        `Run \`npm run prepare:osm\` before docker build, or set EXPLORE_OSM_DATA_PATH.`
    );
  }
}
