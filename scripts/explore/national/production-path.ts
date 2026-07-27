/**
 * Production national path helpers (Step 10.4B).
 * Confirmed full runs must use regional blocks + RBush — never per-cell osmium.
 */
import type { CatalogueChunk, LonLatBBox } from "./chunks.js";
import { OPTIMISED_ALGORITHM_VERSION } from "./regional-block.js";
import { SPATIAL_INDEX_ALGORITHM_VERSION } from "./spatial-index.js";

/** Processing block span (~5×5 cells at 0.02°). */
export const PRODUCTION_BLOCK_SPAN_DEGREES = 0.1;

export const PRODUCTION_PATH_ID = "regional-block+rbush-v1";

export type ProcessingBlock = {
  blockId: string;
  core: LonLatBBox;
  chunks: CatalogueChunk[];
};

/**
 * Group cell chunks into larger processing blocks (stable ids from lat/lon floors).
 */
export function groupChunksIntoProcessingBlocks(
  chunks: CatalogueChunk[],
  blockSpanDegrees = PRODUCTION_BLOCK_SPAN_DEGREES
): ProcessingBlock[] {
  if (!(blockSpanDegrees > 0)) throw new Error("blockSpanDegrees must be > 0");
  const map = new Map<string, ProcessingBlock>();
  for (const chunk of chunks) {
    const midLat = (chunk.core.minLatitude + chunk.core.maxLatitude) / 2;
    const midLon = (chunk.core.minLongitude + chunk.core.maxLongitude) / 2;
    const row = Math.floor(midLat / blockSpanDegrees);
    const col = Math.floor(midLon / blockSpanDegrees);
    const blockId = `b_${row}_${col}`;
    let block = map.get(blockId);
    if (!block) {
      block = {
        blockId,
        core: {
          minLatitude: row * blockSpanDegrees,
          maxLatitude: (row + 1) * blockSpanDegrees,
          minLongitude: col * blockSpanDegrees,
          maxLongitude: (col + 1) * blockSpanDegrees,
        },
        chunks: [],
      };
      map.set(blockId, block);
    }
    block.chunks.push(chunk);
    // Expand block core to cover all assigned cell cores (handles edge cells).
    block.core.minLatitude = Math.min(block.core.minLatitude, chunk.core.minLatitude);
    block.core.maxLatitude = Math.max(block.core.maxLatitude, chunk.core.maxLatitude);
    block.core.minLongitude = Math.min(block.core.minLongitude, chunk.core.minLongitude);
    block.core.maxLongitude = Math.max(block.core.maxLongitude, chunk.core.maxLongitude);
  }
  for (const block of map.values()) {
    block.chunks.sort((a, b) => a.chunkId.localeCompare(b.chunkId));
  }
  return [...map.values()].sort((a, b) => a.blockId.localeCompare(b.blockId));
}

export type ProductionPathAssertion = {
  algorithmVersion: string;
  spatialIndex: string;
  pathId: string;
  useRegionalBlocks: true;
  forbidLegacyPerCellOsmium: true;
};

/**
 * Runtime assertion for confirmed national runs.
 * Throws if algorithm/index versions drift or legacy is requested.
 */
export function assertOptimisedProductionPath(opts?: {
  /** Must remain false/undefined for confirmed full runs. */
  allowLegacyPerCellOsmium?: boolean;
}): ProductionPathAssertion {
  if (opts?.allowLegacyPerCellOsmium) {
    throw new Error(
      "Legacy per-cell osmium path is forbidden for national production runs (Step 10.4B)."
    );
  }
  if (!OPTIMISED_ALGORITHM_VERSION.includes(SPATIAL_INDEX_ALGORITHM_VERSION)) {
    throw new Error(
      `Algorithm/index version mismatch: ${OPTIMISED_ALGORITHM_VERSION} vs ${SPATIAL_INDEX_ALGORITHM_VERSION}`
    );
  }
  return {
    algorithmVersion: OPTIMISED_ALGORITHM_VERSION,
    spatialIndex: SPATIAL_INDEX_ALGORITHM_VERSION,
    pathId: PRODUCTION_PATH_ID,
    useRegionalBlocks: true,
    forbidLegacyPerCellOsmium: true,
  };
}
