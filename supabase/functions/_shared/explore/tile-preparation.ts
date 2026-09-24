/**
 * On-demand OSM tile acquisition with concurrency protection.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { ACTIVE_OSM_REVISION } from "./config.ts";
import { buildCanonicalTile, type CanonicalTile } from "./canonical-tile.ts";
import { fetchOsmFeaturesForBounds, OsmProviderError } from "./osm-provider.ts";
import { downloadCachedTile, uploadCanonicalTile } from "./storage.ts";
import { tileBounds, tileKey, type TileId } from "./tiles.ts";
import { exploreLog } from "./logging.ts";
import {
  checkRateLimit,
  GLOBAL_TILE_ACQUISITION_LIMIT,
} from "./rate-limit.ts";
import { recordTiming, startTimer, type TimingBucket } from "./timings.ts";

export type TileJobStatus = "preparing" | "ready" | "failed";

export type PrepareTilesResult =
  | {
      status: "ready";
      tiles: CanonicalTile[];
      cachedCount: number;
      preparedCount: number;
      missingCount: number;
      sourceBytes: number;
      timings: TimingBucket;
    }
  | {
      status: "preparing";
      retryAfterSeconds: number;
      cachedCount: number;
      missingCount: number;
      preparingTileIds: string[];
      timings: TimingBucket;
    }
  | {
      status: "error";
      error: string;
      message: string;
      details?: Record<string, unknown>;
      timings: TimingBucket;
    };

const SAME_REQUEST_BUDGET_MS = 20_000; // wall-clock for Overpass wait; CPU work capped via max 1 tile
const WAIT_FOR_PEER_MS = 1_500;
const DEFAULT_RETRY_AFTER = 8;

async function tryAcquireTileJob(
  service: SupabaseClient,
  revision: string,
  tile: TileId
): Promise<"acquired" | "busy" | "ready"> {
  const { data, error } = await service.rpc("explore_acquire_osm_tile_job", {
    p_revision: revision,
    p_tile_id: tileKey(tile),
  });
  if (error) {
    exploreLog("tile_job_acquire_error", { message: error.message, tile_id: tileKey(tile) });
    return "acquired"; // fall through to attempt prepare
  }
  const status = String((data as { status?: string } | null)?.status ?? "acquired");
  if (status === "ready") return "ready";
  if (status === "busy" || status === "preparing") return "busy";
  return "acquired";
}

async function completeTileJob(
  service: SupabaseClient,
  revision: string,
  tile: TileId,
  ok: boolean,
  lastError?: string
): Promise<void> {
  await service.rpc("explore_complete_osm_tile_job", {
    p_revision: revision,
    p_tile_id: tileKey(tile),
    p_ok: ok,
    p_last_error: lastError ?? null,
  });
}

async function prepareOneTile(
  service: SupabaseClient,
  tile: TileId,
  revision: string,
  timings: TimingBucket,
  requestId: string
): Promise<
  | { status: "ready"; tile: CanonicalTile; bytes: number }
  | { status: "preparing" }
  | { status: "error"; error: string; message: string }
> {
  const acquire = await tryAcquireTileJob(service, revision, tile);
  if (acquire === "ready") {
    const cached = await downloadCachedTile(service, tile, revision);
    if (cached.status === "cached") {
      return { status: "ready", tile: cached.tile, bytes: cached.bytes };
    }
  }
  if (acquire === "busy") {
    // Brief wait then re-check storage.
    await new Promise((r) => setTimeout(r, WAIT_FOR_PEER_MS));
    const cached = await downloadCachedTile(service, tile, revision);
    if (cached.status === "cached") {
      return { status: "ready", tile: cached.tile, bytes: cached.bytes };
    }
    return { status: "preparing" };
  }

  try {
    const bounds = tileBounds(tile);
    const fetchTimer = startTimer();
    const fetched = await fetchOsmFeaturesForBounds(bounds);
    recordTiming(timings, "provider_fetch_ms", fetchTimer.elapsedMs());

    const convertTimer = startTimer();
    const canonical = buildCanonicalTile({
      tile,
      revision,
      features: fetched.features,
      sourceProvider: fetched.provider,
      sourceTimestamp: fetched.sourceTimestamp,
    });
    recordTiming(timings, "tile_conversion_ms", convertTimer.elapsedMs());

    const uploadTimer = startTimer();
    const uploaded = await uploadCanonicalTile(service, canonical, revision);
    recordTiming(timings, "tile_upload_ms", uploadTimer.elapsedMs());
    if (!uploaded.ok) {
      await completeTileJob(service, revision, tile, false, uploaded.error);
      return { status: "error", error: "tile_upload_failed", message: uploaded.error };
    }

    await completeTileJob(service, revision, tile, true);
    exploreLog("tile_prepared", {
      request_id: requestId,
      tile_id: tileKey(tile),
      feature_count: canonical.feature_count,
      source_bytes: fetched.bytes,
    });
    return { status: "ready", tile: canonical, bytes: fetched.bytes };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const code = e instanceof OsmProviderError ? e.code : "tile_prepare_failed";
    await completeTileJob(service, revision, tile, false, message);
    exploreLog("tile_prepare_failed", {
      request_id: requestId,
      tile_id: tileKey(tile),
      error: code,
    });
    return { status: "error", error: code, message };
  }
}

/**
 * Load required tiles from Storage; prepare missing ones when within budget.
 */
export async function loadOrPrepareTiles(opts: {
  service: SupabaseClient;
  tiles: TileId[];
  revision?: string;
  requestId: string;
  allowAcquisition: boolean;
  maxMissingTiles: number;
  userId?: string;
}): Promise<PrepareTilesResult> {
  const revision = opts.revision ?? ACTIVE_OSM_REVISION;
  const timings: TimingBucket = {};
  const ready: CanonicalTile[] = [];
  const missing: TileId[] = [];
  let cachedCount = 0;
  let sourceBytes = 0;

  const lookupTimer = startTimer();
  for (const tile of opts.tiles) {
    const result = await downloadCachedTile(opts.service, tile, revision);
    if (result.status === "cached") {
      ready.push(result.tile);
      cachedCount += 1;
      sourceBytes += result.bytes;
    } else if (result.status === "invalid") {
      exploreLog("cached_tile_invalid", {
        request_id: opts.requestId,
        tile_id: tileKey(tile),
        error: result.error,
      });
      return {
        status: "error",
        error: "cached_tile_invalid",
        message: `Cached tile ${tileKey(tile)} failed validation.`,
        details: { tile_id: tileKey(tile), reason: result.error },
        timings,
      };
    } else {
      missing.push(tile);
    }
  }
  recordTiming(timings, "storage_lookup_ms", lookupTimer.elapsedMs());

  if (missing.length === 0) {
    return {
      status: "ready",
      tiles: ready,
      cachedCount,
      preparedCount: 0,
      missingCount: 0,
      sourceBytes,
      timings,
    };
  }

  if (!opts.allowAcquisition) {
    return {
      status: "preparing",
      retryAfterSeconds: DEFAULT_RETRY_AFTER,
      cachedCount,
      missingCount: missing.length,
      preparingTileIds: missing.map(tileKey),
      timings,
    };
  }

  if (opts.userId) {
    const userAcq = await checkRateLimit(opts.service, {
      subjectId: opts.userId,
      category: "tile_acquisition",
    });
    const globalAcq = await checkRateLimit(opts.service, {
      subjectId: "global",
      category: "tile_acquisition",
      config: GLOBAL_TILE_ACQUISITION_LIMIT,
    });
    if (!userAcq.ok || !globalAcq.ok) {
      // Soft: ask client to wait — do not hard-fail first-area warm-up.
      return {
        status: "preparing",
        retryAfterSeconds: !userAcq.ok
          ? userAcq.retry_after_seconds
          : globalAcq.ok
            ? DEFAULT_RETRY_AFTER
            : globalAcq.retry_after_seconds,
        cachedCount,
        missingCount: missing.length,
        preparingTileIds: missing.map(tileKey),
        timings,
      };
    }
  }

  // Prepare a batch of missing tiles; if more remain (or budget runs out), ask client to retry.
  const batch = missing.slice(0, opts.maxMissingTiles);
  let preparedCount = 0;
  const preparingIds: string[] = [];
  const budgetStart = performance.now();

  for (const tile of batch) {
    if (performance.now() - budgetStart > SAME_REQUEST_BUDGET_MS) {
      preparingIds.push(...batch.slice(batch.indexOf(tile)).map(tileKey));
      for (const rest of batch.slice(batch.indexOf(tile))) {
        await tryAcquireTileJob(opts.service, revision, rest);
      }
      break;
    }

    const prepared = await prepareOneTile(
      opts.service,
      tile,
      revision,
      timings,
      opts.requestId
    );
    if (prepared.status === "ready") {
      ready.push(prepared.tile);
      preparedCount += 1;
      sourceBytes += prepared.bytes;
    } else if (prepared.status === "preparing") {
      preparingIds.push(tileKey(tile));
    } else {
      // Provider timeout / unavailable → ask client to retry rather than hard-fail the area.
      if (
        prepared.error === "provider_timeout" ||
        prepared.error === "provider_unavailable"
      ) {
        return {
          status: "preparing",
          retryAfterSeconds: DEFAULT_RETRY_AFTER,
          cachedCount,
          missingCount: missing.length,
          preparingTileIds: missing.map(tileKey),
          timings,
        };
      }
      return {
        status: "error",
        error: prepared.error,
        message: prepared.message,
        timings,
      };
    }
  }

  const stillMissing = missing.length > preparedCount || preparingIds.length > 0;
  if (stillMissing || ready.length < opts.tiles.length) {
    return {
      status: "preparing",
      retryAfterSeconds: DEFAULT_RETRY_AFTER,
      cachedCount,
      missingCount: missing.length,
      preparingTileIds: preparingIds.length ? preparingIds : missing.map(tileKey),
      timings,
    };
  }

  return {
    status: "ready",
    tiles: ready,
    cachedCount,
    preparedCount,
    missingCount: missing.length,
    sourceBytes,
    timings,
  };
}
