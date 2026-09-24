/**
 * Regional processing block: extract once → classify/index once → generate many cells.
 * Step 10.4A — avoids per-0.02° osmium + reparse.
 */
import fs from "node:fs";
import type { FeatureCollection } from "geojson";
import { mergeConfig } from "../config.js";
import { generateStops } from "../generate-stops.js";
import { loadAndClassify, type ClassifiedFeature } from "../safety-rules.js";
import type { AcceptedStop } from "../types.js";
import { expandBboxMetres, splitBboxIntoChunkGrid, type CatalogueChunk, type LonLatBBox } from "./chunks.js";
import {
  exportBboxToHuntlyGeoJson,
  resolvePartitionPbfForBbox,
} from "./export-bbox.js";
import { FeatureSpatialIndex, SPATIAL_INDEX_ALGORITHM_VERSION } from "./spatial-index.js";
import { profileAdd, profileTime } from "./profile.js";

export const OPTIMISED_ALGORITHM_VERSION = `national-opt-v1+${SPATIAL_INDEX_ALGORITHM_VERSION}`;

export type RegionalBlockResult = {
  blockId: string;
  cells: Array<{
    chunkId: string;
    accepted: AcceptedStop[];
    candidates: number;
    rejected: number;
  }>;
  sourceFeatures: number;
  classifyMs: number;
  indexMs: number;
  exportMs: number;
  generateMs: number;
  algorithmVersion: string;
};

function pointInCore(lat: number, lon: number, core: LonLatBBox): boolean {
  return (
    lat >= core.minLatitude &&
    lat <= core.maxLatitude &&
    lon >= core.minLongitude &&
    lon <= core.maxLongitude
  );
}

/**
 * Process one padded regional block: single PBF extract, one classify+index,
 * then generateStops for each internal cell against the shared index.
 */
export async function processRegionalBlock(opts: {
  blockId: string;
  blockCore: LonLatBBox;
  cellSpanDegrees: number;
  padMetres: number;
  workingPbf: string;
  revDir: string;
  workDir: string;
  generationVersion: number;
  reuseGeoJsonPath?: string;
  /**
   * Explicit cell list (preferred for national resume).
   * When omitted, cells are derived from blockCore + cellSpanDegrees.
   */
  cells?: CatalogueChunk[];
  /** When set with derived grid, only generate these cell ids. */
  cellIds?: string[];
}): Promise<RegionalBlockResult> {
  fs.mkdirSync(opts.workDir, { recursive: true });
  const tExport0 = Date.now();
  let collection: FeatureCollection;
  let geojsonPath: string;
  let sourceFeatures: number;

  if (opts.reuseGeoJsonPath && fs.existsSync(opts.reuseGeoJsonPath)) {
    geojsonPath = opts.reuseGeoJsonPath;
    collection = JSON.parse(fs.readFileSync(geojsonPath, "utf8")) as FeatureCollection;
    sourceFeatures = collection.features.length;
  } else {
    const sourcePbf = resolvePartitionPbfForBbox(
      opts.revDir,
      opts.blockCore,
      opts.workingPbf
    );
    const exported = await exportBboxToHuntlyGeoJson({
      sourcePbf,
      bbox: opts.blockCore,
      workDir: opts.workDir,
      label: opts.blockId,
      padMetres: opts.padMetres,
    });
    collection = exported.collection;
    geojsonPath = exported.geojsonPath;
    sourceFeatures = exported.featureCount;
  }
  const exportMs = Date.now() - tExport0;
  profileAdd("export_ms", exportMs);

  const tClass0 = performance.now();
  const classified = profileTime("classify_ms", () => loadAndClassify(collection));
  const classifyMs = performance.now() - tClass0;

  const tIdx0 = performance.now();
  const index = new FeatureSpatialIndex(classified);
  const indexMs = performance.now() - tIdx0;

  let cells: CatalogueChunk[] =
    opts.cells ?? splitBboxIntoChunkGrid(opts.blockCore, opts.cellSpanDegrees, 0);
  if (opts.cellIds && opts.cellIds.length > 0) {
    const allow = new Set(opts.cellIds);
    cells = cells.filter((c) => allow.has(c.chunkId));
  }
  const out: RegionalBlockResult["cells"] = [];
  let generateMs = 0;

  for (const cell of cells) {
    const padded = expandBboxMetres(cell.core, opts.padMetres);
    const near = index.queryBBox(
      padded.minLongitude,
      padded.minLatitude,
      padded.maxLongitude,
      padded.maxLatitude
    );
    const sourceIdAllowlist = new Set(
      near.filter((c) => c.role === "source" && c.sourceType).map((c) => c.id)
    );

    const t0 = performance.now();
    const config = mergeConfig({
      sourceGeoJsonPath: geojsonPath,
      minLatitude: cell.core.minLatitude,
      minLongitude: cell.core.minLongitude,
      maxLatitude: cell.core.maxLatitude,
      maxLongitude: cell.core.maxLongitude,
      generationVersion: opts.generationVersion,
    });
    const result = generateStops(collection, config, {
      classified,
      index,
      useSpatialIndex: true,
      sourceIdAllowlist,
    });
    generateMs += performance.now() - t0;

    const accepted = result.accepted.filter((s) =>
      pointInCore(s.latitude, s.longitude, cell.core)
    );
    out.push({
      chunkId: cell.chunkId,
      accepted,
      candidates: result.summary.sourceCandidatesGenerated,
      rejected: result.rejected.length,
    });
  }

  return {
    blockId: opts.blockId,
    cells: out,
    sourceFeatures,
    classifyMs,
    indexMs,
    exportMs,
    generateMs,
    algorithmVersion: OPTIMISED_ALGORITHM_VERSION,
  };
}

export type { ClassifiedFeature };
