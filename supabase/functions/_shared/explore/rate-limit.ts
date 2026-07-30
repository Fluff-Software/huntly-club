/**
 * Database-backed rate limiting for Explore Edge Functions.
 * Stores user ID + route category + time bucket only — no coordinates.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type RateLimitCategory =
  | "nearby"
  | "verify"
  | "claim"
  | "tile_acquisition";

export type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

export const DEFAULT_RATE_LIMITS: Record<RateLimitCategory, RateLimitConfig> = {
  nearby: { limit: 60, windowSeconds: 60 },
  verify: { limit: 30, windowSeconds: 60 },
  claim: { limit: 20, windowSeconds: 60 },
  // First-area warm-up needs many retries; keep this higher than a single stampede.
  tile_acquisition: { limit: 40, windowSeconds: 60 },
};

export const GLOBAL_TILE_ACQUISITION_LIMIT: RateLimitConfig = {
  limit: 120,
  windowSeconds: 60,
};

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retry_after_seconds: number };

function bucketStart(windowSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const start = now - (now % windowSeconds);
  return new Date(start * 1000).toISOString();
}

export async function checkRateLimit(
  service: SupabaseClient,
  opts: {
    subjectId: string;
    category: RateLimitCategory;
    config?: RateLimitConfig;
  }
): Promise<RateLimitResult> {
  const config = opts.config ?? DEFAULT_RATE_LIMITS[opts.category];
  const windowStart = bucketStart(config.windowSeconds);

  const { data, error } = await service.rpc("explore_check_rate_limit", {
    p_subject_id: opts.subjectId,
    p_category: opts.category,
    p_window_start: windowStart,
    p_limit: config.limit,
    p_window_seconds: config.windowSeconds,
  });

  if (error) {
    // Fail open for availability but log via caller — still return ok with warning remaining.
    console.error(JSON.stringify({ event: "rate_limit_rpc_error", message: error.message }));
    return { ok: true, remaining: config.limit };
  }

  const row = data as { allowed?: boolean; remaining?: number; retry_after_seconds?: number } | null;
  if (!row || row.allowed === false) {
    return {
      ok: false,
      retry_after_seconds: Number(row?.retry_after_seconds ?? config.windowSeconds),
    };
  }
  return { ok: true, remaining: Number(row.remaining ?? 0) };
}
