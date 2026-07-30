/**
 * Explore API transport configuration (Step 10.2).
 * Production / preview use Supabase Edge Functions by default.
 * Local Node server remains available for side-by-side DEV tests only.
 */
export type ExploreTransport = "edge" | "local";

export type ExploreApiKind = "edge" | "local" | "missing";

export type ExploreApiConfig = {
  transport: ExploreTransport;
  url: string | null;
  kind: ExploreApiKind;
  /** Short label for DEV UI */
  label: string;
};

const LOCAL_HOST_RE =
  /^(https?:\/\/)?(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?/i;

/** DEV-only override: "edge" | "local". Ignored in production builds. */
let devTransportOverride: ExploreTransport | null = null;

function appVariant(): string {
  return (process.env.APP_VARIANT ?? "production").toLowerCase();
}

export function getExploreApiBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_EXPLORE_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/**
 * Resolve which transport the app should use.
 * - production / preview: always Edge (Supabase Functions)
 * - development / __DEV__: Edge by default; optional local Node via URL or DEV override
 */
export function resolveExploreTransport(): ExploreTransport {
  const variant = appVariant();
  const isProdLike = variant === "preview" || variant === "production";
  if (isProdLike) return "edge";

  if (__DEV__ && devTransportOverride) {
    return devTransportOverride;
  }

  const explicit = process.env.EXPO_PUBLIC_EXPLORE_TRANSPORT?.trim().toLowerCase();
  if (explicit === "local" || explicit === "edge") {
    return explicit;
  }

  const url = getExploreApiBaseUrl();
  if (url && LOCAL_HOST_RE.test(url)) return "local";
  // Default MVP hosting: Supabase Edge Functions
  return "edge";
}

export function setDevExploreTransport(transport: ExploreTransport | null): void {
  if (!__DEV__) return;
  devTransportOverride = transport;
}

export function getDevExploreTransportOverride(): ExploreTransport | null {
  return devTransportOverride;
}

export function resolveExploreApiConfig(): ExploreApiConfig {
  const transport = resolveExploreTransport();
  if (transport === "edge") {
    return {
      transport: "edge",
      url: null,
      kind: "edge",
      label: "Supabase Edge Explore",
    };
  }

  const url = getExploreApiBaseUrl();
  if (!url) {
    return {
      transport: "local",
      url: null,
      kind: "missing",
      label: "Local Explore API URL not configured",
    };
  }
  return {
    transport: "local",
    url,
    kind: "local",
    label: "Local Explore API",
  };
}

/**
 * Preview/production must not depend on a localhost Node URL.
 * Edge mode does not require EXPO_PUBLIC_EXPLORE_API_URL.
 */
export function assertExploreApiUrlSafeForBuild(): void {
  const variant = appVariant();
  const isProdLike = variant === "preview" || variant === "production";
  if (!isProdLike) return;

  const url = getExploreApiBaseUrl();
  if (url && LOCAL_HOST_RE.test(url)) {
    throw new Error(
      `EXPO_PUBLIC_EXPLORE_API_URL must not be localhost for ${variant} builds (got ${url}). ` +
        `Production Explore uses Supabase Edge Functions.`
    );
  }
}
