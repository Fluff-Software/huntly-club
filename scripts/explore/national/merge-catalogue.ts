/**
 * National merge stage: chunk NDJSON → coverage filter → global 150 m spacing → catalogue.ndjson
 * Resumable / idempotent: skips when catalogue.ndjson already exists unless force=true.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createReadStream } from "node:fs";
import type { CataloguePoint } from "../generate-catalogue.js";
import { loadCoveragePolygons, pointInCoverage } from "./coverage.js";
import { applyGlobalSpacingGrid } from "./spacing.js";
import { loadManifest, saveManifest, type BuildManifest } from "./manifest.js";
import { PRODUCTION_PATH_ID } from "./production-path.js";

export type ChunkPointRow = CataloguePoint & { priority_key?: string };

export type MergeResult = {
  skipped: boolean;
  reason?: string;
  mode?: "from_chunks" | "respace_existing";
  backupPath?: string;
  ndjsonPath: string;
  summaryPath: string;
  pointCount: number;
  uniqueWritten: number;
  duplicateIdsSkipped: number;
  pointsByType: Record<string, number>;
};

export function catalogueNdjsonPath(buildDir: string): string {
  return path.join(buildDir, "catalogue.ndjson");
}

export function catalogueSummaryPath(buildDir: string): string {
  return path.join(buildDir, "catalogue-summary.json");
}

export function mergeAlreadyComplete(buildDir: string): boolean {
  const ndjson = catalogueNdjsonPath(buildDir);
  if (!fs.existsSync(ndjson)) return false;
  const st = fs.statSync(ndjson);
  return st.size > 0;
}

async function loadSpacedInputFromChunks(
  buildDir: string,
  coveragePath: string
): Promise<Array<ChunkPointRow & { priorityKey: string }>> {
  const coverage = loadCoveragePolygons(coveragePath);
  const spacedInput: Array<ChunkPointRow & { priorityKey: string }> = [];
  const chunkDir = path.join(buildDir, "chunks");
  if (!fs.existsSync(chunkDir)) {
    throw new Error(`Missing chunks directory: ${chunkDir}`);
  }
  const files = fs.readdirSync(chunkDir).filter((f) => f.endsWith(".ndjson")).sort();
  for (const file of files) {
    const rl = readline.createInterface({
      input: createReadStream(path.join(chunkDir, file), { encoding: "utf8" }),
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const row = JSON.parse(trimmed) as ChunkPointRow;
      if (!pointInCoverage(row.latitude, row.longitude, coverage)) continue;
      spacedInput.push({
        ...row,
        priorityKey: row.priority_key ?? row.id,
      });
    }
  }
  return spacedInput;
}

async function loadSpacedInputFromCatalogue(
  ndjsonPath: string
): Promise<Array<ChunkPointRow & { priorityKey: string }>> {
  const spacedInput: Array<ChunkPointRow & { priorityKey: string }> = [];
  const rl = readline.createInterface({
    input: createReadStream(ndjsonPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const row = JSON.parse(trimmed) as ChunkPointRow;
    spacedInput.push({
      ...row,
      priorityKey: row.priority_key ?? row.id,
    });
  }
  return spacedInput;
}

async function writeSpacedCatalogue(opts: {
  buildDir: string;
  ndjsonPath: string;
  summaryPath: string;
  spacedInput: Array<ChunkPointRow & { priorityKey: string }>;
  regionId: string;
  generationVersion: number;
  sourceRevision: string;
  mode: "from_chunks" | "respace_existing";
  backupPath?: string;
}): Promise<MergeResult> {
  const manifest = loadManifest(opts.buildDir);
  const spaced = applyGlobalSpacingGrid(opts.spacedInput, 150);
  const tmp = `${opts.ndjsonPath}.${process.pid}.tmp`;
  const out = fs.createWriteStream(tmp);
  const byType: Record<string, number> = {};
  const seenIds = new Set<string>();
  let duplicateIdsSkipped = 0;
  for (const p of spaced) {
    if (seenIds.has(p.id)) {
      duplicateIdsSkipped += 1;
      continue;
    }
    seenIds.add(p.id);
    byType[String(p.type)] = (byType[String(p.type)] ?? 0) + 1;
    const { priorityKey: _pk, priority_key: _pr, ...rest } = p as ChunkPointRow & {
      priorityKey: string;
    };
    out.write(JSON.stringify(rest) + "\n");
  }
  await new Promise<void>((resolve, reject) => {
    out.end(() => resolve());
    out.on("error", reject);
  });
  fs.renameSync(tmp, opts.ndjsonPath);

  const uniqueWritten = seenIds.size;
  const summary = {
    region_id: opts.regionId,
    catalogue_build_id: manifest.catalogue_build_id,
    source_revision: opts.sourceRevision,
    source_sha256: manifest.source_sha256,
    generation_version: opts.generationVersion,
    generated_at: new Date().toISOString(),
    point_count: uniqueWritten,
    spaced_before_id_dedupe: spaced.length,
    duplicate_ids_skipped_at_write: duplicateIdsSkipped,
    points_by_type: byType,
    catalogue_ndjson: opts.ndjsonPath,
    production_path: PRODUCTION_PATH_ID,
    merge_mode: opts.mode,
    spacing_algorithm: "metre-aware-grid-v2",
    count_semantics:
      "point_count = final unique IDs after coverage filter + 150m global spacing",
    note: "Not activated. Stoke remains active until explicit national activation.",
  };
  fs.writeFileSync(opts.summaryPath, JSON.stringify(summary, null, 2));

  manifest.validation_status = "not_started";
  manifest.aggregates = {
    accepted: uniqueWritten,
    candidates: Object.values(manifest.chunks).reduce(
      (a, c) => a + (c.candidateCount ?? 0),
      0
    ),
    rejected: Object.values(manifest.chunks).reduce(
      (a, c) => a + (c.rejectedCount ?? 0),
      0
    ),
  };
  saveManifest(opts.buildDir, manifest);

  return {
    skipped: false,
    mode: opts.mode,
    backupPath: opts.backupPath,
    ndjsonPath: opts.ndjsonPath,
    summaryPath: opts.summaryPath,
    pointCount: uniqueWritten,
    uniqueWritten,
    duplicateIdsSkipped,
    pointsByType: byType,
  };
}

/**
 * Merge chunk outputs into final catalogue.ndjson.
 * Does not overwrite an existing non-empty catalogue.ndjson unless force=true.
 * When force=true and catalogue.ndjson exists, re-spaces that file (metre-aware grid)
 * after backup — avoids re-reading hundreds of thousands of chunk files.
 */
export async function mergeNationalCatalogue(opts: {
  buildDir: string;
  coveragePath: string;
  regionId: string;
  generationVersion: number;
  sourceRevision: string;
  force?: boolean;
}): Promise<MergeResult> {
  const ndjsonPath = catalogueNdjsonPath(opts.buildDir);
  const summaryPath = catalogueSummaryPath(opts.buildDir);

  if (!opts.force && mergeAlreadyComplete(opts.buildDir)) {
    let pointCount = 0;
    if (fs.existsSync(summaryPath)) {
      try {
        const s = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {
          point_count?: number;
        };
        pointCount = s.point_count ?? 0;
      } catch {
        /* ignore */
      }
    }
    return {
      skipped: true,
      reason: "catalogue.ndjson already present — merge skipped (use --force-merge to rebuild)",
      ndjsonPath,
      summaryPath,
      pointCount,
      uniqueWritten: pointCount,
      duplicateIdsSkipped: 0,
      pointsByType: {},
    };
  }

  let backupPath: string | undefined;
  if (opts.force && mergeAlreadyComplete(opts.buildDir)) {
    backupPath = `${ndjsonPath}.bak-before-spacing-fix-${Date.now()}`;
    fs.copyFileSync(ndjsonPath, backupPath);
    console.log(`Backed up previous catalogue.ndjson → ${backupPath}`);

    // Prefer the largest prior backup (original pre-thinning catalogue) as respace source.
    const dir = path.dirname(ndjsonPath);
    const base = path.basename(ndjsonPath);
    let sourcePath = backupPath;
    let sourceSize = fs.statSync(backupPath).size;
    for (const name of fs.readdirSync(dir)) {
      if (!name.startsWith(`${base}.bak-before-spacing-fix-`)) continue;
      const p = path.join(dir, name);
      const sz = fs.statSync(p).size;
      if (sz > sourceSize) {
        sourcePath = p;
        sourceSize = sz;
      }
    }
    console.log(
      `Re-spacing from ${path.basename(sourcePath)} (${Math.round(sourceSize / 1e6)} MB) with metre-aware 150 m grid…`
    );
    const spacedInput = await loadSpacedInputFromCatalogue(sourcePath);
    return writeSpacedCatalogue({
      buildDir: opts.buildDir,
      ndjsonPath,
      summaryPath,
      spacedInput,
      regionId: opts.regionId,
      generationVersion: opts.generationVersion,
      sourceRevision: opts.sourceRevision,
      mode: "respace_existing",
      backupPath,
    });
  }

  console.log("Merging from chunk NDJSON (coverage filter + 150 m spacing)…");
  const spacedInput = await loadSpacedInputFromChunks(opts.buildDir, opts.coveragePath);
  return writeSpacedCatalogue({
    buildDir: opts.buildDir,
    ndjsonPath,
    summaryPath,
    spacedInput,
    regionId: opts.regionId,
    generationVersion: opts.generationVersion,
    sourceRevision: opts.sourceRevision,
    mode: "from_chunks",
    backupPath,
  });
}

export type { BuildManifest };
