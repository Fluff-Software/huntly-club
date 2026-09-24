/**
 * Simple in-memory rate limiters (process-local; reset on restart).
 * Multi-instance deployments need a shared limiter (e.g. Redis) later.
 */

export type RateLimitConfig = {
  minIntervalMs: number;
  maxFailedAttemptsPerWindow: number;
  failedWindowMs: number;
};

export const DEFAULT_CLAIM_RATE_LIMIT: RateLimitConfig = {
  minIntervalMs: 3_000,
  maxFailedAttemptsPerWindow: 20,
  failedWindowMs: 60_000,
};

export function claimRateLimitFromEnv(
  env: NodeJS.ProcessEnv = process.env
): RateLimitConfig {
  const minIntervalMs = Number(env.EXPLORE_CLAIM_MIN_INTERVAL_MS);
  const maxFailedAttemptsPerWindow = Number(env.EXPLORE_CLAIM_MAX_FAILED_PER_WINDOW);
  const failedWindowMs = Number(env.EXPLORE_CLAIM_FAILED_WINDOW_MS);
  return {
    minIntervalMs:
      Number.isFinite(minIntervalMs) && minIntervalMs > 0
        ? minIntervalMs
        : DEFAULT_CLAIM_RATE_LIMIT.minIntervalMs,
    maxFailedAttemptsPerWindow:
      Number.isFinite(maxFailedAttemptsPerWindow) && maxFailedAttemptsPerWindow > 0
        ? maxFailedAttemptsPerWindow
        : DEFAULT_CLAIM_RATE_LIMIT.maxFailedAttemptsPerWindow,
    failedWindowMs:
      Number.isFinite(failedWindowMs) && failedWindowMs > 0
        ? failedWindowMs
        : DEFAULT_CLAIM_RATE_LIMIT.failedWindowMs,
  };
}

type Bucket = {
  lastAttemptAt: number;
  failedAt: number[];
};

const claimBuckets = new Map<string, Bucket>();

/** Sliding window: max N hits per windowMs for nearby / verify. */
type WindowBucket = { hits: number[] };
const nearbyBuckets = new Map<string, WindowBucket>();
const verifyBuckets = new Map<string, WindowBucket>();

export function clearClaimRateLimits(): void {
  claimBuckets.clear();
  nearbyBuckets.clear();
  verifyBuckets.clear();
}

function windowLimitFromEnv(
  maxKey: string,
  windowKey: string,
  defaultMax: number,
  defaultWindowMs: number,
  env: NodeJS.ProcessEnv = process.env
): { max: number; windowMs: number } {
  const max = Number(env[maxKey]);
  const windowMs = Number(env[windowKey]);
  return {
    max: Number.isFinite(max) && max > 0 ? max : defaultMax,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : defaultWindowMs,
  };
}

function checkWindowLimit(
  map: Map<string, WindowBucket>,
  key: string,
  max: number,
  windowMs: number,
  now = Date.now()
): { ok: true } | { ok: false; error: "rate_limited"; retry_after_ms: number } {
  const bucket = map.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= max) {
    const oldest = bucket.hits[0] ?? now;
    return {
      ok: false,
      error: "rate_limited",
      retry_after_ms: Math.max(0, windowMs - (now - oldest)),
    };
  }
  bucket.hits.push(now);
  map.set(key, bucket);
  return { ok: true };
}

/** Nearby: default 60 requests / minute per IP (or user key). */
export function checkNearbyRateLimit(
  key: string,
  env: NodeJS.ProcessEnv = process.env,
  now = Date.now()
): { ok: true } | { ok: false; error: "rate_limited"; retry_after_ms: number } {
  const { max, windowMs } = windowLimitFromEnv(
    "EXPLORE_NEARBY_MAX_PER_WINDOW",
    "EXPLORE_NEARBY_WINDOW_MS",
    60,
    60_000,
    env
  );
  return checkWindowLimit(nearbyBuckets, key, max, windowMs, now);
}

/** Verify: default 30 requests / minute per IP (or user key). */
export function checkVerifyRateLimit(
  key: string,
  env: NodeJS.ProcessEnv = process.env,
  now = Date.now()
): { ok: true } | { ok: false; error: "rate_limited"; retry_after_ms: number } {
  const { max, windowMs } = windowLimitFromEnv(
    "EXPLORE_VERIFY_MAX_PER_WINDOW",
    "EXPLORE_VERIFY_WINDOW_MS",
    30,
    60_000,
    env
  );
  return checkWindowLimit(verifyBuckets, key, max, windowMs, now);
}

export function checkClaimRateLimit(
  userId: string,
  config: RateLimitConfig = DEFAULT_CLAIM_RATE_LIMIT,
  now = Date.now()
): { ok: true } | { ok: false; error: "rate_limited"; retry_after_ms: number } {
  const bucket = claimBuckets.get(userId) ?? { lastAttemptAt: 0, failedAt: [] };
  bucket.failedAt = bucket.failedAt.filter((t) => now - t < config.failedWindowMs);

  if (bucket.failedAt.length >= config.maxFailedAttemptsPerWindow) {
    const oldest = bucket.failedAt[0] ?? now;
    return {
      ok: false,
      error: "rate_limited",
      retry_after_ms: Math.max(0, config.failedWindowMs - (now - oldest)),
    };
  }

  const since = now - bucket.lastAttemptAt;
  if (bucket.lastAttemptAt > 0 && since < config.minIntervalMs) {
    return {
      ok: false,
      error: "rate_limited",
      retry_after_ms: config.minIntervalMs - since,
    };
  }

  bucket.lastAttemptAt = now;
  claimBuckets.set(userId, bucket);
  return { ok: true };
}

export function recordClaimFailure(userId: string, now = Date.now()): void {
  const bucket = claimBuckets.get(userId) ?? { lastAttemptAt: now, failedAt: [] };
  bucket.failedAt.push(now);
  claimBuckets.set(userId, bucket);
}

export function clientRateLimitKey(req: {
  headers: { [key: string]: string | string[] | undefined };
}): string {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0]!.trim();
  if (Array.isArray(xf) && xf[0]) return String(xf[0]).split(",")[0]!.trim();
  return "unknown";
}
