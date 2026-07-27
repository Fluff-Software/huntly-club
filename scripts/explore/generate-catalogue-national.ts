/**
 * National catalogue generate entrypoint (Step 10.4 / 10.4B).
 *
 * Production path: regional blocks (one extract/classify/index per block) + RBush.
 * Full run is blocked unless --confirm-full-run is passed AFTER parity + benchmarks.
 *
 * Usage (do not start without go/no-go approval):
 *   npm run generate:catalogue:national -- --region uk-and-ireland --workers 6 --resume
 *   npm run generate:catalogue:national -- --region uk-and-ireland --workers 6 --resume --confirm-full-run
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { createReadStream } from "node:fs";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import { loadRegionConfig, type CataloguePoint } from "./generate-catalogue.js";
import { pointTypeFromSourceType } from "./point-types.js";
import {
  splitBboxIntoChunkGrid,
  type CatalogueChunk,
} from "./national/chunks.js";
import {
  createBuildManifest,
  hashConfig,
  loadManifest,
  newCatalogueBuildId,
  resumeEligibleChunkIds,
  saveManifest,
  updateChunkCheckpoint,
  type BuildManifest,
} from "./national/manifest.js";
import { loadCoveragePolygons, pointInCoverage } from "./national/coverage.js";
import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { applyGlobalSpacingGrid } from "./national/spacing.js";
import {
  findPinnedSourcePbf,
  resolveWorkingPbf,
} from "./national/export-bbox.js";
import { OPTIMISED_ALGORITHM_VERSION, processRegionalBlock } from "./national/regional-block.js";
import { SPATIAL_INDEX_ALGORITHM_VERSION } from "./national/spatial-index.js";
import {
  assertOptimisedProductionPath,
  groupChunksIntoProcessingBlocks,
  PRODUCTION_BLOCK_SPAN_DEGREES,
  PRODUCTION_PATH_ID,
  type ProcessingBlock,
} from "./national/production-path.js";
import type { AcceptedStop } from "./types.js";

function prepareCoverageIndex(coverage: FeatureCollection) {
  return coverage.features
    .filter((f) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"))
    .map((f) => {
      const simplified = turf.simplify(f as Feature<Polygon | MultiPolygon>, {
        tolerance: 0.02,
        highQuality: false,
      });
      return {
        feature: simplified as Feature<Polygon | MultiPolygon>,
        bbox: turf.bbox(simplified) as [number, number, number, number],
      };
    });
}

type CoverageIndex = ReturnType<typeof prepareCoverageIndex>;

function chunkIntersectsCoverage(chunk: CatalogueChunk, index: CoverageIndex): boolean {
  const minX = chunk.core.minLongitude;
  const minY = chunk.core.minLatitude;
  const maxX = chunk.core.maxLongitude;
  const maxY = chunk.core.maxLatitude;
  const centre = turf.point([(minX + maxX) / 2, (minY + maxY) / 2]);
  for (const { feature, bbox } of index) {
    if (maxX < bbox[0] || minX > bbox[2] || maxY < bbox[1] || minY > bbox[3]) continue;
    if (turf.booleanPointInPolygon(centre, feature)) return true;
    const poly = turf.bboxPolygon([minX, minY, maxX, maxY]);
    if (turf.booleanIntersects(poly, feature)) return true;
  }
  return false;
}

function parseArgs(argv: string[]) {
  let region = "uk-and-ireland";
  let workers = 4;
  let resume = false;
  let confirmFullRun = false;
  let chunkSpan = 0.02;
  let padMetres = 400;
  let buildId: string | undefined;
  let allowLegacyPerCellOsmium = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
    else if (argv[i] === "--workers" && argv[i + 1]) workers = Number(argv[++i]);
    else if (argv[i] === "--resume") resume = true;
    else if (argv[i] === "--confirm-full-run") confirmFullRun = true;
    else if (argv[i] === "--chunk-span" && argv[i + 1]) chunkSpan = Number(argv[++i]);
    else if (argv[i] === "--pad-metres" && argv[i + 1]) padMetres = Number(argv[++i]);
    else if (argv[i] === "--build-id" && argv[i + 1]) buildId = argv[++i];
    else if (argv[i] === "--allow-legacy-per-cell") allowLegacyPerCellOsmium = true;
  }
  return {
    region,
    workers,
    resume,
    confirmFullRun,
    chunkSpan,
    padMetres,
    buildId,
    allowLegacyPerCellOsmium,
  };
}

function findLatestBuildDir(outputRoot: string): string | null {
  if (!fs.existsSync(outputRoot)) return null;
  const dirs = fs
    .readdirSync(outputRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("build_"))
    .map((d) => d.name)
    .sort()
    .reverse();
  return dirs[0] ? path.join(outputRoot, dirs[0]) : null;
}

type ChunkPointRow = CataloguePoint & { priority_key: string };

function writeChunkNdjson(opts: {
  buildDir: string;
  chunkId: string;
  accepted: AcceptedStop[];
  generationVersion: number;
  sourceRevision: string;
  core: { minLatitude: number; maxLatitude: number; minLongitude: number; maxLongitude: number };
}): { accepted: number; outputPath: string } {
  const outPath = path.join(opts.buildDir, "chunks", `${opts.chunkId}.ndjson`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmp = `${outPath}.${process.pid}.tmp`;
  const lines: string[] = [];
  let accepted = 0;
  for (const s of opts.accepted) {
    const type = pointTypeFromSourceType(s.sourceType);
    if (type == null) continue;
    if (
      s.latitude < opts.core.minLatitude ||
      s.latitude > opts.core.maxLatitude ||
      s.longitude < opts.core.minLongitude ||
      s.longitude > opts.core.maxLongitude
    ) {
      continue;
    }
    const row: ChunkPointRow = {
      id: s.stopId,
      latitude: s.latitude,
      longitude: s.longitude,
      type,
      source_type: s.sourceType,
      generation_version: opts.generationVersion,
      source_revision: opts.sourceRevision,
      source_feature_id: s.sourceFeatureId,
      confidence: s.confidence,
      environment_profile: s.environmentProfile as Record<string, number>,
      priority_key: s.priorityKey,
    };
    lines.push(JSON.stringify(row));
    accepted += 1;
  }
  fs.writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""));
  fs.renameSync(tmp, outPath);
  return { accepted, outputPath: outPath };
}

/**
 * @deprecated Legacy per-cell osmium path. Forbidden on confirmed national runs.
 * Kept only for explicit A/B / diagnostic use outside --confirm-full-run.
 */
export function assertLegacyPathForbiddenForFullRun(confirmFullRun: boolean): void {
  if (confirmFullRun) {
    throw new Error(
      "Legacy per-cell path cannot be used with --confirm-full-run (Step 10.4B)."
    );
  }
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let idx = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i]!);
    }
  });
  await Promise.all(workers);
}

async function mergeAndFinalize(opts: {
  buildDir: string;
  manifest: BuildManifest;
  coveragePath: string;
  region: ReturnType<typeof loadRegionConfig>;
  sourceRevision: string;
}): Promise<void> {
  const coverage = loadCoveragePolygons(opts.coveragePath);
  const spacedInput: Array<ChunkPointRow & { priorityKey: string }> = [];
  const chunkDir = path.join(opts.buildDir, "chunks");
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
      spacedInput.push({ ...row, priorityKey: row.priority_key });
    }
  }

  const spaced = applyGlobalSpacingGrid(spacedInput, 150);
  const ndjsonPath = path.join(opts.buildDir, "catalogue.ndjson");
  const tmp = `${ndjsonPath}.${process.pid}.tmp`;
  const out = fs.createWriteStream(tmp);
  const byType: Record<string, number> = {};
  const seenIds = new Set<string>();
  for (const p of spaced) {
    if (seenIds.has(p.id)) continue;
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
  fs.renameSync(tmp, ndjsonPath);

  const summary = {
    region_id: opts.region.region_id,
    catalogue_build_id: opts.manifest.catalogue_build_id,
    source_revision: opts.sourceRevision,
    source_sha256: opts.manifest.source_sha256,
    generation_version: opts.region.generation_version,
    generated_at: new Date().toISOString(),
    point_count: spaced.length,
    points_by_type: byType,
    catalogue_ndjson: ndjsonPath,
    production_path: PRODUCTION_PATH_ID,
    note: "Not activated. Stoke remains active until explicit national activation.",
  };
  fs.writeFileSync(path.join(opts.buildDir, "catalogue-summary.json"), JSON.stringify(summary, null, 2));
  opts.manifest.validation_status = "not_started";
  opts.manifest.aggregates = {
    accepted: spaced.length,
    candidates: Object.values(opts.manifest.chunks).reduce((a, c) => a + (c.candidateCount ?? 0), 0),
    rejected: Object.values(opts.manifest.chunks).reduce((a, c) => a + (c.rejectedCount ?? 0), 0),
  };
  saveManifest(opts.buildDir, opts.manifest);
  console.log(`Finalised ${spaced.length} points → ${ndjsonPath}`);
}

async function processProductionBlock(opts: {
  block: ProcessingBlock;
  workingPbf: string;
  revDir: string;
  workRoot: string;
  buildDir: string;
  region: ReturnType<typeof loadRegionConfig>;
  sourceRevision: string;
  configHash: string;
  padMetres: number;
  chunkSpan: number;
}): Promise<{ exportMs: number; blockMs: number; cellsCompleted: number }> {
  const t0 = Date.now();
  const startedAt = new Date().toISOString();
  for (const chunk of opts.block.chunks) {
    updateChunkCheckpoint(opts.buildDir, {
      chunkId: chunk.chunkId,
      status: "running",
      startedAt,
      configHash: opts.configHash,
    });
  }

  const workDir = path.join(opts.workRoot, opts.block.blockId);
  try {
    const result = await processRegionalBlock({
      blockId: opts.block.blockId,
      blockCore: opts.block.core,
      cellSpanDegrees: opts.chunkSpan,
      padMetres: opts.padMetres,
      workingPbf: opts.workingPbf,
      revDir: opts.revDir,
      workDir,
      generationVersion: opts.region.generation_version,
      cells: opts.block.chunks,
    });

    const byId = new Map(opts.block.chunks.map((c) => [c.chunkId, c]));
    let cellsCompleted = 0;
    for (const cell of result.cells) {
      const chunk = byId.get(cell.chunkId);
      if (!chunk) {
        throw new Error(`Unexpected cell id from regional block: ${cell.chunkId}`);
      }
      const written = writeChunkNdjson({
        buildDir: opts.buildDir,
        chunkId: cell.chunkId,
        accepted: cell.accepted,
        generationVersion: opts.region.generation_version,
        sourceRevision: opts.sourceRevision,
        core: chunk.core,
      });
      updateChunkCheckpoint(opts.buildDir, {
        chunkId: cell.chunkId,
        status: "completed",
        acceptedCount: written.accepted,
        candidateCount: cell.candidates,
        rejectedCount: cell.rejected,
        finishedAt: new Date().toISOString(),
        outputPath: written.outputPath,
        configHash: opts.configHash,
      });
      cellsCompleted += 1;
    }

    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }

    return {
      exportMs: result.exportMs,
      blockMs: Date.now() - t0,
      cellsCompleted,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    for (const chunk of opts.block.chunks) {
      updateChunkCheckpoint(opts.buildDir, {
        chunkId: chunk.chunkId,
        status: "failed",
        error: msg,
        finishedAt: new Date().toISOString(),
        configHash: opts.configHash,
      });
    }
    throw e;
  }
}

async function runFullGenerate(args: ReturnType<typeof parseArgs>): Promise<void> {
  const pathAssert = assertOptimisedProductionPath({
    allowLegacyPerCellOsmium: args.allowLegacyPerCellOsmium,
  });
  console.log(
    `Production path: ${pathAssert.pathId} (${pathAssert.algorithmVersion})`
  );

  const region = loadRegionConfig(args.region) as ReturnType<typeof loadRegionConfig> & {
    pipeline?: string;
    coverage_policy?: { polygons_path?: string };
    source_pbf_dir?: string;
  };
  const pinned = findPinnedSourcePbf(
    region.source_pbf_dir ?? "data/osm/geofabrik/britain-and-ireland"
  );
  const workingPbf = resolveWorkingPbf(pinned.revDir, pinned.pbf);
  const coveragePath = path.join(
    EXPLORE_PACKAGE_ROOT,
    region.coverage_policy?.polygons_path ?? "catalogues/coverage/uk-and-ireland.geojson"
  );
  const outputRoot = path.join(EXPLORE_PACKAGE_ROOT, region.output_dir);
  fs.mkdirSync(outputRoot, { recursive: true });

  const configHash = hashConfig({
    generation_version: region.generation_version,
    chunk_span: args.chunkSpan,
    pad_metres: args.padMetres,
    source_sha256: pinned.meta.sha256,
    coverage: region.coverage_policy?.polygons_path,
    algorithm_version: OPTIMISED_ALGORITHM_VERSION,
    spatial_index: SPATIAL_INDEX_ALGORITHM_VERSION,
    production_path: PRODUCTION_PATH_ID,
    block_span: PRODUCTION_BLOCK_SPAN_DEGREES,
  });

  let buildDir: string;
  let manifest: BuildManifest;
  const sourceRevision = path.basename(pinned.revDir);

  if (args.resume) {
    const latest = args.buildId
      ? path.join(outputRoot, args.buildId)
      : findLatestBuildDir(outputRoot);
    if (!latest || !fs.existsSync(path.join(latest, "build-manifest.json"))) {
      throw new Error("--resume requested but no existing build manifest found");
    }
    buildDir = latest;
    manifest = loadManifest(buildDir);
    if (manifest.generator_config_hash !== configHash) {
      throw new Error(
        `Config hash mismatch (manifest=${manifest.generator_config_hash} now=${configHash}). Start a new build without --resume.`
      );
    }
  } else {
    const catalogueBuildId = args.buildId ?? newCatalogueBuildId();
    buildDir = path.join(outputRoot, catalogueBuildId);
    const coverage = loadCoveragePolygons(coveragePath);
    const coverageIndex = prepareCoverageIndex(coverage);
    const chunks = splitBboxIntoChunkGrid(
      {
        minLatitude: region.bounding_box.min_latitude,
        minLongitude: region.bounding_box.min_longitude,
        maxLatitude: region.bounding_box.max_latitude,
        maxLongitude: region.bounding_box.max_longitude,
      },
      args.chunkSpan,
      args.padMetres
    ).filter((c) => chunkIntersectsCoverage(c, coverageIndex));
    console.log(
      `Coverage filter: ${chunks.length} land-intersecting chunks (sea/empty skipped)`
    );
    manifest = createBuildManifest({
      regionId: region.region_id,
      catalogueBuildId,
      sourceRevision,
      sourceSha256: String(pinned.meta.sha256),
      generationVersion: region.generation_version,
      chunkSpanDegrees: args.chunkSpan,
      padMetres: args.padMetres,
      chunkIds: chunks.map((c) => c.chunkId),
      generatorConfigHash: configHash,
    });
    fs.mkdirSync(path.join(buildDir, "chunks"), { recursive: true });
    saveManifest(buildDir, manifest);
  }

  const coverageForSkip = prepareCoverageIndex(loadCoveragePolygons(coveragePath));
  const allChunks = splitBboxIntoChunkGrid(
    {
      minLatitude: region.bounding_box.min_latitude,
      minLongitude: region.bounding_box.min_longitude,
      maxLatitude: region.bounding_box.max_latitude,
      maxLongitude: region.bounding_box.max_longitude,
    },
    args.chunkSpan,
    args.padMetres
  ).filter((c) => chunkIntersectsCoverage(c, coverageForSkip));
  const byId = new Map(allChunks.map((c) => [c.chunkId, c]));
  const pendingIds = resumeEligibleChunkIds(manifest);
  const pending = pendingIds.map((id) => byId.get(id)).filter(Boolean) as CatalogueChunk[];
  const blocks = groupChunksIntoProcessingBlocks(pending, PRODUCTION_BLOCK_SPAN_DEGREES);

  console.log(`Build dir: ${buildDir}`);
  console.log(`Working PBF: ${workingPbf}`);
  console.log(`Chunks pending: ${pending.length} / ${manifest.total_chunks}`);
  console.log(`Processing blocks pending: ${blocks.length}`);
  console.log(`Workers: ${args.workers}`);

  const workRoot = path.join(
    EXPLORE_PACKAGE_ROOT,
    "data/osm/work/national-blocks",
    manifest.catalogue_build_id
  );
  fs.mkdirSync(workRoot, { recursive: true });

  let exportMsSum = 0;
  let blockMsSum = 0;
  let blocksDone = 0;

  await runPool(blocks, args.workers, async (block) => {
    try {
      const stats = await processProductionBlock({
        block,
        workingPbf,
        revDir: pinned.revDir,
        workRoot,
        buildDir,
        region,
        sourceRevision,
        configHash,
        padMetres: args.padMetres,
        chunkSpan: args.chunkSpan,
      });
      exportMsSum += stats.exportMs;
      blockMsSum += stats.blockMs;
      blocksDone += 1;
      console.log(
        `✓ ${block.blockId} cells=${stats.cellsCompleted} export=${stats.exportMs}ms total=${stats.blockMs}ms`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`✗ ${block.blockId}: ${msg}`);
    }
  });

  const failed = Object.values(loadManifest(buildDir).chunks).filter((c) => c.status === "failed");
  if (failed.length) {
    throw new Error(`${failed.length} chunk(s) failed — fix and re-run with --resume`);
  }

  console.log(
    `Block stats: completed=${blocksDone} avg_export_ms=${
      blocksDone ? Math.round(exportMsSum / blocksDone) : 0
    } avg_block_ms=${blocksDone ? Math.round(blockMsSum / blocksDone) : 0}`
  );

  await mergeAndFinalize({
    buildDir,
    manifest: loadManifest(buildDir),
    coveragePath,
    region,
    sourceRevision,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const region = loadRegionConfig(args.region) as ReturnType<typeof loadRegionConfig> & {
    pipeline?: string;
    coverage_policy?: { polygons_path?: string };
  };

  if (region.pipeline !== "pbf") {
    throw new Error("This entrypoint is only for pipeline=pbf regions");
  }

  if (args.confirmFullRun && args.allowLegacyPerCellOsmium) {
    assertLegacyPathForbiddenForFullRun(true);
  }

  const coveragePath = path.join(
    EXPLORE_PACKAGE_ROOT,
    region.coverage_policy?.polygons_path ?? "catalogues/coverage/uk-and-ireland.geojson"
  );
  const parityPath = path.join(
    EXPLORE_PACKAGE_ROOT,
    "output/catalogues/parity/stoke-pbf-parity.json"
  );
  const benchPath = path.join(
    EXPLORE_PACKAGE_ROOT,
    "output/catalogues/benchmarks/uk-and-ireland-benchmark.json"
  );
  const optBenchPath = path.join(
    EXPLORE_PACKAGE_ROOT,
    "output/catalogues/benchmarks/uk-and-ireland-optimised-benchmark.json"
  );

  const gates: string[] = [];
  if (!fs.existsSync(coveragePath)) gates.push(`missing coverage polygon: ${coveragePath}`);
  if (!fs.existsSync(parityPath)) gates.push(`missing Stoke parity report: ${parityPath}`);
  else {
    const parity = JSON.parse(fs.readFileSync(parityPath, "utf8")) as { ok?: boolean };
    if (!parity.ok) gates.push("Stoke parity hard-failed — do not full-run");
  }
  if (!fs.existsSync(benchPath)) gates.push(`missing benchmark report: ${benchPath}`);
  if (!fs.existsSync(optBenchPath)) {
    gates.push(`missing optimised benchmark report: ${optBenchPath}`);
  } else {
    const opt = JSON.parse(fs.readFileSync(optBenchPath, "utf8")) as {
      acceptance_gate?: string;
    };
    if (opt.acceptance_gate === "fail") {
      gates.push("Optimised projection >72h (acceptance_gate=fail) — do not full-run");
    }
  }

  const chunks = splitBboxIntoChunkGrid(
    {
      minLatitude: region.bounding_box.min_latitude,
      minLongitude: region.bounding_box.min_longitude,
      maxLatitude: region.bounding_box.max_latitude,
      maxLongitude: region.bounding_box.max_longitude,
    },
    args.chunkSpan,
    args.padMetres
  ).length;

  console.log("National generate");
  console.log(`  region=${args.region}`);
  console.log(`  workers=${args.workers} resume=${args.resume}`);
  console.log(`  chunkSpan=${args.chunkSpan}° pad=${args.padMetres}m chunks≈${chunks}`);
  console.log(`  production_path=${PRODUCTION_PATH_ID}`);
  console.log(`  confirmFullRun=${args.confirmFullRun}`);

  if (gates.length) {
    console.error("Gates not satisfied:");
    for (const g of gates) console.error(` - ${g}`);
    process.exit(1);
  }

  const startCmd =
    `npm run generate:catalogue:national -- --region ${args.region} ` +
    `--workers ${args.workers} --chunk-span ${args.chunkSpan} --pad-metres ${args.padMetres} ` +
    `--resume --confirm-full-run`;

  if (!args.confirmFullRun) {
    console.log(
      "\nFull national generation is implemented and gated.\n" +
        "No chunk work started (missing --confirm-full-run).\n\n" +
        "After reviewing the go/no-go report, start with:\n\n" +
        `  ${startCmd}\n`
    );
    return;
  }

  console.log("\n--confirm-full-run accepted. Starting resumable national generation…\n");
  await runFullGenerate(args);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

export {
  parseArgs,
  runFullGenerate,
  processProductionBlock,
  writeChunkNdjson,
  groupChunksIntoProcessingBlocks,
  assertOptimisedProductionPath,
};
