/**
 * Per-tile accepted-stop cache.
 * Edge CPU limits cannot run generateStops over a multi-tile merge in one request.
 * Each OSM tile gets its own stops object; nearby merges + light spacing.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  ACTIVE_OSM_REVISION,
  GENERATION_VERSION,
  GENERATOR_BUFFERS,
  STORAGE_BUCKET,
  buildGeneratorConfig,
} from "./config.ts";
import { generateStops } from "./generate-stops.ts";
import { exploreLog } from "./logging.ts";
import type { CanonicalTile } from "./canonical-tile.ts";
import type { AcceptedStop } from "./types.ts";
import { tileKey, type TileId } from "./tiles.ts";
import { haversineMeters } from "./safety-rules.ts";

export type TileStopsFile = {
  format_version: number;
  generation_version: number;
  revision: string;
  tile_id: string;
  stop_count: number;
  stops: AcceptedStop[];
};

export function tileStopsObjectPath(revision: string, tile: TileId): string {
  return `revisions/${revision}/stops/z${tile.z}/${tile.x}/${tile.y}.json`;
}

export async function downloadTileStops(
  service: SupabaseClient,
  tile: TileId,
  revision: string = ACTIVE_OSM_REVISION
): Promise<{ status: "cached"; stops: AcceptedStop[] } | { status: "missing" }> {
  const path = tileStopsObjectPath(revision, tile);
  const { data, error } = await service.storage.from(STORAGE_BUCKET).download(path);
  if (error || !data) return { status: "missing" };
  try {
    const parsed = JSON.parse(await data.text()) as TileStopsFile;
    if (
      !parsed ||
      parsed.generation_version !== GENERATION_VERSION ||
      !Array.isArray(parsed.stops)
    ) {
      return { status: "missing" };
    }
    return { status: "cached", stops: parsed.stops };
  } catch {
    return { status: "missing" };
  }
}

export async function uploadTileStops(
  service: SupabaseClient,
  tile: TileId,
  stops: AcceptedStop[],
  revision: string = ACTIVE_OSM_REVISION
): Promise<{ ok: true } | { ok: false; error: string }> {
  const body: TileStopsFile = {
    format_version: 1,
    generation_version: GENERATION_VERSION,
    revision,
    tile_id: tileKey(tile),
    stop_count: stops.length,
    stops,
  };
  const path = tileStopsObjectPath(revision, tile);
  const { error } = await service.storage.from(STORAGE_BUCKET).upload(
    path,
    JSON.stringify(body),
    { contentType: "application/json", upsert: true }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Generate + cache accepted stops for one OSM source tile. */
export function generateStopsForTile(tile: CanonicalTile): AcceptedStop[] {
  const config = buildGeneratorConfig({
    minLatitude: tile.bounds.min_latitude,
    minLongitude: tile.bounds.min_longitude,
    maxLatitude: tile.bounds.max_latitude,
    maxLongitude: tile.bounds.max_longitude,
  });
  const result = generateStops(
    { type: "FeatureCollection", features: tile.features },
    config
  );
  return result.accepted;
}

/**
 * Ensure every OSM tile has a companion stops cache.
 * At most one generate+upload per call (Edge CPU budget).
 */
export async function loadOrPrepareTileStops(opts: {
  service: SupabaseClient;
  tiles: CanonicalTile[];
  revision: string;
  requestId: string;
  maxGenerate: number;
}): Promise<
  | { status: "ready"; stops: AcceptedStop[]; cachedCount: number; preparedCount: number }
  | {
      status: "preparing";
      retryAfterSeconds: number;
      cachedCount: number;
      missingCount: number;
    }
> {
  const all: AcceptedStop[] = [];
  let cachedCount = 0;
  let preparedCount = 0;
  const needing: CanonicalTile[] = [];

  for (const tile of opts.tiles) {
    const id: TileId = { z: tile.tile.z, x: tile.tile.x, y: tile.tile.y };
    const existing = await downloadTileStops(opts.service, id, opts.revision);
    if (existing.status === "cached") {
      all.push(...existing.stops);
      cachedCount += 1;
    } else {
      needing.push(tile);
    }
  }

  if (needing.length === 0) {
    return { status: "ready", stops: thinStopsBySpacing(all), cachedCount, preparedCount: 0 };
  }

  const batch = needing.slice(0, Math.max(1, opts.maxGenerate));
  for (const tile of batch) {
    const id: TileId = { z: tile.tile.z, x: tile.tile.x, y: tile.tile.y };
    const stops = generateStopsForTile(tile);
    const uploaded = await uploadTileStops(opts.service, id, stops, opts.revision);
    if (!uploaded.ok) {
      exploreLog("tile_stops_upload_failed", {
        request_id: opts.requestId,
        tile_id: tileKey(id),
        error: uploaded.error,
      });
      return {
        status: "preparing",
        retryAfterSeconds: 8,
        cachedCount,
        missingCount: needing.length,
      };
    }
    exploreLog("tile_stops_prepared", {
      request_id: opts.requestId,
      tile_id: tileKey(id),
      stop_count: stops.length,
      feature_count: tile.feature_count,
    });
    all.push(...stops);
    preparedCount += 1;
  }

  if (needing.length > preparedCount) {
    return {
      status: "preparing",
      retryAfterSeconds: 5,
      cachedCount,
      missingCount: needing.length - preparedCount,
    };
  }

  return {
    status: "ready",
    stops: thinStopsBySpacing(all),
    cachedCount,
    preparedCount,
  };
}

/** Deterministic cross-tile spacing (cheap; stop counts are small). */
export function thinStopsBySpacing(
  stops: AcceptedStop[],
  minMeters: number = GENERATOR_BUFFERS.minimumStopSpacingMeters
): AcceptedStop[] {
  const sorted = [...stops].sort((a, b) => a.stopId.localeCompare(b.stopId));
  const kept: AcceptedStop[] = [];
  for (const stop of sorted) {
    const tooClose = kept.some(
      (k) =>
        haversineMeters(
          { latitude: k.latitude, longitude: k.longitude },
          { latitude: stop.latitude, longitude: stop.longitude }
        ) < minMeters
    );
    if (!tooClose) kept.push(stop);
  }
  return kept;
}
