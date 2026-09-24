/**
 * OSM provider abstraction — Edge Functions never expose provider URLs to mobile.
 */
import type { Feature, FeatureCollection } from "npm:@types/geojson@7946.0.16";
import { overpassToGeoJson, buildOverpassQueryForBounds } from "./overpass-convert.ts";
import type { BoundingBox } from "./tiles.ts";

export type OsmProviderName = "overpass_compatible";

export type OsmFetchResult = {
  features: Feature[];
  provider: OsmProviderName;
  sourceTimestamp: string | null;
  bytes: number;
};

export type OsmProviderErrorCode =
  | "provider_timeout"
  | "provider_unavailable"
  | "provider_response_too_large"
  | "provider_malformed_response";

export class OsmProviderError extends Error {
  code: OsmProviderErrorCode;
  constructor(code: OsmProviderErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "OsmProviderError";
  }
}

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_BYTES = 2_500_000;
const DEFAULT_RETRIES = 0; // one attempt per endpoint; avoid stacking timeouts inside one Edge call


function providerEndpoints(): string[] {
  const configured = Deno.env.get("EXPLORE_OVERPASS_URL")?.trim();
  if (configured) return [configured];
  return [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
}

export function isOsmProviderConfigured(): boolean {
  return providerEndpoints().length > 0;
}

/**
 * Fetch OSM features for a small bounding box and convert to GeoJSON features.
 * Does not fetch city/country extracts.
 */
export async function fetchOsmFeaturesForBounds(
  bounds: BoundingBox,
  opts?: {
    timeoutMs?: number;
    maxBytes?: number;
    retries?: number;
  }
): Promise<OsmFetchResult> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts?.maxBytes ?? DEFAULT_MAX_BYTES;
  const retries = opts?.retries ?? DEFAULT_RETRIES;
  const query = buildOverpassQueryForBounds(bounds);

  let lastError: Error | null = null;
  const endpoints = providerEndpoints();

  for (let attempt = 0; attempt <= retries; attempt++) {
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            "User-Agent": "HuntlyExploreEdge/10.2 (tile-cache; ODbL attribution)",
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
          lastError = new OsmProviderError(
            "provider_unavailable",
            `OSM provider HTTP ${res.status}`
          );
          continue;
        }

        const buf = await res.arrayBuffer();
        if (buf.byteLength > maxBytes) {
          throw new OsmProviderError(
            "provider_response_too_large",
            `Provider response ${buf.byteLength} bytes exceeds limit ${maxBytes}`
          );
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(new TextDecoder().decode(buf));
        } catch {
          throw new OsmProviderError(
            "provider_malformed_response",
            "Provider response was not valid JSON"
          );
        }

        const fc = overpassToGeoJson(parsed) as FeatureCollection;
        if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
          throw new OsmProviderError(
            "provider_malformed_response",
            "Provider response could not be converted to GeoJSON"
          );
        }

        return {
          features: fc.features,
          provider: "overpass_compatible",
          sourceTimestamp: new Date().toISOString(),
          bytes: buf.byteLength,
        };
      } catch (e) {
        if (e instanceof OsmProviderError) {
          if (e.code === "provider_response_too_large" || e.code === "provider_malformed_response") {
            throw e;
          }
          lastError = e;
          continue;
        }
        const name = e instanceof Error ? e.name : "";
        if (name === "AbortError") {
          lastError = new OsmProviderError("provider_timeout", "OSM provider timed out");
          continue;
        }
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }
  }

  if (lastError instanceof OsmProviderError) throw lastError;
  throw new OsmProviderError(
    "provider_unavailable",
    lastError?.message ?? "OSM provider unavailable"
  );
}
