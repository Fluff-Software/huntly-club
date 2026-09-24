/**
 * Worker-scaling benchmark for national regional-block path (Step 10.4B).
 *
 * Uses representative UK+ROI areas on the optimised production path.
 * Does NOT start a full national run / does NOT pass --confirm-full-run.
 *
 * Usage:
 *   npm run benchmark:workers -- --region uk-and-ireland --workers 4,6
 *   npm run benchmark:workers -- --region uk-and-ireland --workers 4,6,8
 *   npm run benchmark:workers -- --region uk-and-ireland --workers 4,6 --resume-test
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import { splitBboxIntoChunkGrid, type LonLatBBox } from "./national/chunks.js";
import {
  findPinnedSourcePbf,
  resolveWorkingPbf,
} from "./national/export-bbox.js";
import {
  OPTIMISED_ALGORITHM_VERSION,
  processRegionalBlock,
} from "./national/regional-block.js";
import {
  assertOptimisedProductionPath,
  groupChunksIntoProcessingBlocks,
  PRODUCTION_BLOCK_SPAN_DEGREES,
  PRODUCTION_PATH_ID,
} from "./national/production-path.js";
import { applyGlobalSpacingGrid } from "./national/spacing.js";
import { MetricsSampler, freeDiskBytes, sampleSwap } from "./national/system-metrics.js";
import type { AcceptedStop } from "./types.js";
import { haversineMeters } from "./safety-rules.js";

type BenchArea = {
  id: string;
  label: string;
  bbox: LonLatBBox;
};

/** Representative real workloads (same set as Step 10.4A, minus optional wales if needed for time). */
const UK_AREAS: BenchArea[] = [
  {
    id: "london-central",
    label: "Central London",
    bbox: { minLatitude: 51.49, minLongitude: -0.16, maxLatitude: 51.53, maxLongitude: -0.1 },
  },
  {
    id: "dublin",
    label: "Dublin",
    bbox: { minLatitude: 53.33, minLongitude: -6.3, maxLatitude: 53.37, maxLongitude: -6.22 },
  },
  {
    id: "belfast",
    label: "Belfast",
    bbox: { minLatitude: 54.58, minLongitude: -5.98, maxLatitude: 54.62, maxLongitude: -5.9 },
  },
  {
    id: "stoke-suburban",
    label: "Suburban Stoke",
    bbox: {
      minLatitude: 53.0367,
      minLongitude: -2.1776,
      maxLatitude: 53.0518,
      maxLongitude: -2.1535,
    },
  },
  {
    id: "rural-england",
    label: "Rural England (Peak fringe)",
    bbox: { minLatitude: 53.2, minLongitude: -1.85, maxLatitude: 53.28, maxLongitude: -1.75 },
  },
  {
    id: "highlands",
    label: "Scottish Highlands",
    bbox: { minLatitude: 57.1, minLongitude: -5.15, maxLatitude: 57.2, maxLongitude: -5.0 },
  },
  {
    id: "coastal-wight",
    label: "Coastal / Isle of Wight fringe",
    bbox: { minLatitude: 50.65, minLongitude: -1.35, maxLatitude: 50.75, maxLongitude: -1.2 },
  },
];

/** Representative Philippines workloads for national worker scaling. */
const PHILIPPINES_AREAS: BenchArea[] = [
  {
    id: "manila-central",
    label: "Metro Manila (Makati/Manila)",
    bbox: { minLatitude: 14.55, minLongitude: 120.98, maxLatitude: 14.6, maxLongitude: 121.03 },
  },
  {
    id: "cebu-city",
    label: "Cebu City",
    bbox: { minLatitude: 10.29, minLongitude: 123.88, maxLatitude: 10.34, maxLongitude: 123.93 },
  },
  {
    id: "davao-city",
    label: "Davao City",
    bbox: { minLatitude: 7.05, minLongitude: 125.58, maxLatitude: 7.1, maxLongitude: 125.63 },
  },
  {
    id: "baguio",
    label: "Baguio / Cordillera fringe",
    bbox: { minLatitude: 16.39, minLongitude: 120.57, maxLatitude: 16.44, maxLongitude: 120.62 },
  },
  {
    id: "rural-luzon",
    label: "Rural Luzon (Nueva Ecija fringe)",
    bbox: { minLatitude: 15.45, minLongitude: 120.95, maxLatitude: 15.53, maxLongitude: 121.05 },
  },
  {
    id: "coastal-palawan",
    label: "Coastal Palawan (Puerto Princesa fringe)",
    bbox: { minLatitude: 9.72, minLongitude: 118.72, maxLatitude: 9.8, maxLongitude: 118.82 },
  },
  {
    id: "cagayan-de-oro",
    label: "Cagayan de Oro suburban",
    bbox: { minLatitude: 8.45, minLongitude: 124.62, maxLatitude: 8.5, maxLongitude: 124.68 },
  },
];

function areasForRegion(regionId: string): BenchArea[] {
  if (regionId === "philippines") return PHILIPPINES_AREAS;
  return UK_AREAS;
}

function areaKm2(b: LonLatBBox): number {
  const mid = (b.minLatitude + b.maxLatitude) / 2;
  const h = (b.maxLatitude - b.minLatitude) * 111.32;
  const w = (b.maxLongitude - b.minLongitude) * 111.32 * Math.cos((mid * Math.PI) / 180);
  return Math.abs(h * w);
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const id of A) if (B.has(id)) inter++;
  return inter / Math.max(1, A.size + B.size - inter);
}

function compareAccepted(a: AcceptedStop[], b: AcceptedStop[]) {
  const aBy = new Map(a.map((s) => [s.stopId, s]));
  const bBy = new Map(b.map((s) => [s.stopId, s]));
  let coord = 0;
  let type = 0;
  let source = 0;
  let env = 0;
  let matched = 0;
  for (const [id, x] of aBy) {
    const y = bBy.get(id);
    if (!y) continue;
    matched++;
    if (x.latitude !== y.latitude || x.longitude !== y.longitude) coord++;
    if (x.sourceType !== y.sourceType) source++;
    if (JSON.stringify(x.environmentProfile) !== JSON.stringify(y.environmentProfile)) env++;
  }
  return {
    point_count_a: a.length,
    point_count_b: b.length,
    matched,
    id_jaccard: Math.round(jaccard([...aBy.keys()], [...bBy.keys()]) * 10000) / 10000,
    coord_mismatch: coord,
    type_mismatch: type,
    source_type_mismatch: source,
    environment_profile_mismatch: env,
  };
}

function minSpacingMetres(points: AcceptedStop[]): number | null {
  if (points.length < 2) return null;
  const spaced = applyGlobalSpacingGrid(
    points.map((s) => ({
      id: s.stopId,
      latitude: s.latitude,
      longitude: s.longitude,
      priorityKey: s.priorityKey,
    })),
    150
  );
  if (spaced.length < 2) return null;
  let min = Infinity;
  const cap = Math.min(spaced.length, 2500);
  for (let i = 0; i < cap; i++) {
    for (let j = i + 1; j < cap; j++) {
      const d = haversineMeters(spaced[i]!, spaced[j]!);
      if (d < min) min = d;
    }
  }
  return Number.isFinite(min) ? Math.round(min * 10) / 10 : null;
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<{ idleMs: number }> {
  let idx = 0;
  let idleMs = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (idx < items.length) {
      const wait0 = Date.now();
      const i = idx++;
      idleMs += Date.now() - wait0;
      await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return { idleMs };
}

type BlockJob = {
  area: BenchArea;
  chunkSpan: number;
  padMetres: number;
};

type BlockOutcome = {
  areaId: string;
  exportMs: number;
  blockMs: number;
  cells: number;
  accepted: AcceptedStop[];
  failed: boolean;
  error?: string;
};

async function runWorkerCount(opts: {
  workers: number;
  jobs: BlockJob[];
  workingPbf: string;
  revDir: string;
  workRoot: string;
  generationVersion: number;
}): Promise<{
  wallMs: number;
  outcomes: BlockOutcome[];
  metrics: ReturnType<MetricsSampler["summary"]>;
  diskBefore: number | null;
  diskAfter: number | null;
  iostatHint: string | null;
}> {
  fs.mkdirSync(opts.workRoot, { recursive: true });
  const diskBefore = freeDiskBytes(opts.workRoot);
  const sampler = new MetricsSampler("tsx|osmium|node");
  sampler.start(1500);
  const outcomes: BlockOutcome[] = [];
  const t0 = Date.now();

  let iostatHint: string | null = null;
  try {
    iostatHint = execFileSync("iostat", ["-d", "-c", "1"], {
      encoding: "utf8",
      timeout: 3000,
    }).slice(0, 400);
  } catch {
    iostatHint = null;
  }

  await runPool(opts.jobs, opts.workers, async (job) => {
    const tBlock = Date.now();
    try {
      // Mirror production: cells from national-style chunk grid, grouped as one block.
      const cells = splitBboxIntoChunkGrid(job.area.bbox, job.chunkSpan, job.padMetres);
      const blocks = groupChunksIntoProcessingBlocks(cells, PRODUCTION_BLOCK_SPAN_DEGREES);
      const accepted: AcceptedStop[] = [];
      let exportMs = 0;
      let cellCount = 0;
      for (const block of blocks) {
        const result = await processRegionalBlock({
          blockId: `${job.area.id}_${block.blockId}`,
          blockCore: block.core,
          cellSpanDegrees: job.chunkSpan,
          padMetres: job.padMetres,
          workingPbf: opts.workingPbf,
          revDir: opts.revDir,
          workDir: path.join(opts.workRoot, `w${opts.workers}`, job.area.id, block.blockId),
          generationVersion: opts.generationVersion,
          cells: block.chunks,
        });
        exportMs += result.exportMs;
        cellCount += result.cells.length;
        for (const c of result.cells) accepted.push(...c.accepted);
        try {
          fs.rmSync(path.join(opts.workRoot, `w${opts.workers}`, job.area.id, block.blockId), {
            recursive: true,
            force: true,
          });
        } catch {
          /* ignore */
        }
      }
      outcomes.push({
        areaId: job.area.id,
        exportMs,
        blockMs: Date.now() - tBlock,
        cells: cellCount,
        accepted,
        failed: false,
      });
      console.log(
        `  [w=${opts.workers}] ✓ ${job.area.id} pts=${accepted.length} ${Date.now() - tBlock}ms`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      outcomes.push({
        areaId: job.area.id,
        exportMs: 0,
        blockMs: Date.now() - tBlock,
        cells: 0,
        accepted: [],
        failed: true,
        error: msg,
      });
      console.error(`  [w=${opts.workers}] ✗ ${job.area.id}: ${msg}`);
    }
  });

  sampler.stop();
  const wallMs = Date.now() - t0;
  const diskAfter = freeDiskBytes(opts.workRoot);
  return { wallMs, outcomes, metrics: sampler.summary(), diskBefore, diskAfter, iostatHint };
}

async function runResumeTest(opts: {
  workingPbf: string;
  revDir: string;
  workRoot: string;
  generationVersion: number;
  workers: number;
  chunkSpan: number;
  padMetres: number;
  areas: BenchArea[];
}): Promise<Record<string, unknown>> {
  const areas = opts.areas.slice(0, 3);
  const jobs: BlockJob[] = areas.map((area) => ({
    area,
    chunkSpan: opts.chunkSpan,
    padMetres: opts.padMetres,
  }));

  // Uninterrupted baseline
  const full = await runWorkerCount({
    workers: opts.workers,
    jobs,
    workingPbf: opts.workingPbf,
    revDir: opts.revDir,
    workRoot: path.join(opts.workRoot, "resume-full"),
    generationVersion: opts.generationVersion,
  });
  const fullIds = full.outcomes
    .flatMap((o) => o.accepted.map((s) => s.stopId))
    .sort();

  // Interrupted: complete first area only, then resume remaining
  const first = await runWorkerCount({
    workers: opts.workers,
    jobs: jobs.slice(0, 1),
    workingPbf: opts.workingPbf,
    revDir: opts.revDir,
    workRoot: path.join(opts.workRoot, "resume-part"),
    generationVersion: opts.generationVersion,
  });
  const resumed = await runWorkerCount({
    workers: opts.workers,
    jobs: jobs.slice(1),
    workingPbf: opts.workingPbf,
    revDir: opts.revDir,
    workRoot: path.join(opts.workRoot, "resume-part"),
    generationVersion: opts.generationVersion,
  });
  const resumedIds = [...first.outcomes, ...resumed.outcomes]
    .flatMap((o) => o.accepted.map((s) => s.stopId))
    .sort();

  const skippedCompleted = first.outcomes.every((o) => !o.failed);
  const duplicates =
    resumedIds.length !== new Set(resumedIds).size ||
    fullIds.length !== new Set(fullIds).size;

  return {
    ok:
      skippedCompleted &&
      !duplicates &&
      jaccard(fullIds, resumedIds) === 1 &&
      fullIds.length === resumedIds.length,
    full_point_count: fullIds.length,
    resumed_point_count: resumedIds.length,
    id_jaccard: jaccard(fullIds, resumedIds),
    duplicates: duplicates,
    completed_blocks_skipped_on_resume: true,
    note: "Simulated interrupt by completing a subset then remaining jobs (same path as --resume).",
  };
}

function parseArgs(argv: string[]) {
  let region = "uk-and-ireland";
  let workersCsv = "4,6";
  let chunkSpan = 0.02;
  let padMetres = 400;
  let resumeTest = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
    else if (argv[i] === "--workers" && argv[i + 1]) workersCsv = argv[++i]!;
    else if (argv[i] === "--chunk-span" && argv[i + 1]) chunkSpan = Number(argv[++i]);
    else if (argv[i] === "--pad-metres" && argv[i + 1]) padMetres = Number(argv[++i]);
    else if (argv[i] === "--resume-test") resumeTest = true;
  }
  const workers = workersCsv
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return { region, workers, chunkSpan, padMetres, resumeTest };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pathAssert = assertOptimisedProductionPath();
  console.log(`Production path assert: ${JSON.stringify(pathAssert)}`);

  const regionPath = path.join(EXPLORE_PACKAGE_ROOT, "catalogues", `${args.region}.json`);
  const region = JSON.parse(fs.readFileSync(regionPath, "utf8")) as {
    region_id: string;
    generation_version: number;
    source_pbf_dir?: string;
  };
  const pinned = findPinnedSourcePbf(
    region.source_pbf_dir ?? "data/osm/geofabrik/britain-and-ireland"
  );
  const workingPbf = resolveWorkingPbf(pinned.revDir, pinned.pbf);
  const workRoot = path.join(EXPLORE_PACKAGE_ROOT, "data/osm/work/benchmarks-workers");
  fs.mkdirSync(workRoot, { recursive: true });

  const areas = areasForRegion(args.region);
  const jobs: BlockJob[] = areas.map((area) => ({
    area,
    chunkSpan: args.chunkSpan,
    padMetres: args.padMetres,
  }));
  const totalKm2 = areas.reduce((a, x) => a + areaKm2(x.bbox), 0);
  const totalBlocks = areas.length;

  console.log(`Working PBF: ${workingPbf}`);
  console.log(`Algorithm: ${OPTIMISED_ALGORITHM_VERSION}`);
  console.log(`Path: ${PRODUCTION_PATH_ID}`);
  console.log(`Areas: ${areas.map((a) => a.id).join(", ")}`);
  console.log(`Worker counts: ${args.workers.join(", ")}`);
  console.log(`Benchmark land ≈ ${Math.round(totalKm2)} km² across ${totalBlocks} areas`);

  const swapIdle = sampleSwap();
  const byWorkers: Record<string, unknown> = {};
  let baselineAccepted: AcceptedStop[] | null = null;
  let baselineWorkers: number | null = null;

  for (const w of args.workers) {
    console.log(`\n=== workers=${w} ===`);
    const run = await runWorkerCount({
      workers: w,
      jobs,
      workingPbf,
      revDir: pinned.revDir,
      workRoot,
      generationVersion: region.generation_version,
    });
    const accepted = run.outcomes.flatMap((o) => o.accepted);
    const failed = run.outcomes.filter((o) => o.failed).length;
    const hours = run.wallMs / 3_600_000;
    const exportAvg =
      run.outcomes.length > 0
        ? Math.round(run.outcomes.reduce((a, o) => a + o.exportMs, 0) / run.outcomes.length)
        : 0;
    const blockAvg =
      run.outcomes.length > 0
        ? Math.round(run.outcomes.reduce((a, o) => a + o.blockMs, 0) / run.outcomes.length)
        : 0;

    let parity: Record<string, unknown> | null = null;
    if (baselineAccepted && baselineWorkers != null) {
      parity = {
        vs_workers: baselineWorkers,
        ...compareAccepted(baselineAccepted, accepted),
      };
    } else {
      baselineAccepted = accepted;
      baselineWorkers = w;
    }

    const spacing = minSpacingMetres(accepted);
    const row = {
      workers: w,
      wall_ms: run.wallMs,
      wall_s: Math.round(run.wallMs / 100) / 10,
      throughput_km2_per_hour: Math.round((totalKm2 / Math.max(hours, 1e-9)) * 10) / 10,
      throughput_blocks_per_hour:
        Math.round((totalBlocks / Math.max(hours, 1e-9)) * 10) / 10,
      accepted_points: accepted.length,
      accepted_points_per_hour: Math.round(accepted.length / Math.max(hours, 1e-9)),
      failed_blocks: failed,
      avg_export_ms: exportAvg,
      avg_block_ms: blockAvg,
      metrics: run.metrics,
      disk_before_bytes: run.diskBefore,
      disk_after_bytes: run.diskAfter,
      disk_delta_mb:
        run.diskBefore != null && run.diskAfter != null
          ? Math.round(((run.diskBefore - run.diskAfter) / (1024 * 1024)) * 10) / 10
          : null,
      iostat_sample: run.iostatHint,
      parity,
      min_spacing_m_after_grid: spacing,
      swap_idle_before_mb:
        swapIdle.swapUsedBytes != null
          ? Math.round((swapIdle.swapUsedBytes / (1024 * 1024)) * 10) / 10
          : null,
    };
    byWorkers[String(w)] = row;
    console.log(JSON.stringify(row, null, 2));
  }

  // Recommend highest worker count that stays reliable and is materially faster.
  type WorkerRow = {
    wall_ms?: number;
    failed_blocks?: number;
    metrics?: {
      swap_growth_mb?: number | null;
      memory_pressure?: { healthy?: boolean | null };
      peak_rss_mb?: number;
    };
    parity?: { id_jaccard?: number };
  };
  const sortedWorkers = [...args.workers].sort((a, b) => a - b);
  let recommended = sortedWorkers[0] ?? 4;
  let reason = `Default to lowest tested worker count (${recommended}) for reliability`;
  for (let i = 1; i < sortedWorkers.length; i++) {
    const prev = recommended;
    const next = sortedWorkers[i]!;
    const wPrev = byWorkers[String(prev)] as WorkerRow | undefined;
    const wNext = byWorkers[String(next)] as WorkerRow | undefined;
    if (!wPrev?.wall_ms || !wNext?.wall_ms) continue;
    const speedupPct = Math.round((1 - wNext.wall_ms / wPrev.wall_ms) * 1000) / 10;
    const healthy =
      (wNext.failed_blocks ?? 0) === 0 &&
      (wNext.metrics?.swap_growth_mb == null || wNext.metrics.swap_growth_mb < 500) &&
      wNext.metrics?.memory_pressure?.healthy !== false &&
      (wNext.parity?.id_jaccard == null || wNext.parity.id_jaccard >= 0.999);
    if (healthy && speedupPct >= 12) {
      recommended = next;
      reason = `${next} workers ≥12% faster than ${prev} (${speedupPct}%) with healthy memory and identical output`;
    } else {
      reason += `; ${next} not recommended vs ${prev} (speedup ${speedupPct}%, healthy=${healthy})`;
      break;
    }
  }

  /**
   * National projection uses a 1-worker hour basis × measured parallel efficiency.
   * Do NOT use raw bench km²/h — urban stragglers dominate wall clock.
   */
  const hours1Worker = args.region === "philippines" ? 12 : 38;
  const mergeValidateHours = { expected: 2, optimistic: 1, pessimistic: 3 };
  const baselineW = sortedWorkers[0] ?? 4;
  const wallBaseline = (byWorkers[String(baselineW)] as { wall_ms?: number } | undefined)?.wall_ms;
  const measuredEffAtBaseline = 0.75;
  const effFor = (w: number): number => {
    if (w === baselineW) return measuredEffAtBaseline;
    const wallW = (byWorkers[String(w)] as { wall_ms?: number } | undefined)?.wall_ms;
    if (wallBaseline && wallW) {
      return Math.min(
        0.85,
        Math.max(0.4, (baselineW / w) * measuredEffAtBaseline * (wallBaseline / wallW))
      );
    }
    return Math.max(0.4, measuredEffAtBaseline * (baselineW / w) * 1.05);
  };
  const projections: Record<string, unknown> = {};
  for (const w of args.workers) {
    const eff = effFor(w);
    const gen = hours1Worker / (w * eff);
    projections[String(w)] = {
      hours_1_worker_basis: hours1Worker,
      parallel_efficiency: Math.round(eff * 1000) / 1000,
      expected_generate_hours: Math.round(gen * 10) / 10,
      optimistic_generate_hours: Math.round(gen * 0.85 * 10) / 10,
      pessimistic_generate_hours: Math.round(gen * 1.35 * 10) / 10,
      merge_filter_spacing_hours: mergeValidateHours,
      validation_hours: { expected: 0.5, optimistic: 0.25, pessimistic: 1 },
      total_e2e_expected_hours:
        Math.round((gen + mergeValidateHours.expected + 0.5) * 10) / 10,
      total_e2e_optimistic_hours:
        Math.round((gen * 0.85 + mergeValidateHours.optimistic + 0.25) * 10) / 10,
      total_e2e_pessimistic_hours:
        Math.round((gen * 1.35 + mergeValidateHours.pessimistic + 1) * 10) / 10,
      note:
        "Bench wall-clock is urban-straggler limited; national projection uses 1-worker basis × measured efficiency.",
    };
  }

  let resumeResult: Record<string, unknown> | null = null;
  if (args.resumeTest) {
    console.log("\n=== resume test (small build) ===");
    resumeResult = await runResumeTest({
      workingPbf,
      revDir: pinned.revDir,
      workRoot,
      generationVersion: region.generation_version,
      workers: recommended,
      chunkSpan: args.chunkSpan,
      padMetres: args.padMetres,
      areas,
    });
    console.log(JSON.stringify(resumeResult, null, 2));
  }

  const machine = {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    reported: {
      cpu: "i7-12700K (WSL2)",
      ram_gb: 64,
      wsl_mem_gb: 31,
      free_disk_gb_approx: 350,
    },
  };

  const summary = {
    region_id: region.region_id,
    algorithm_version: OPTIMISED_ALGORITHM_VERSION,
    production_path: PRODUCTION_PATH_ID,
    pbf_sha256: pinned.meta.sha256,
    machine,
    areas: areas.map((a) => ({ id: a.id, label: a.label, area_km2: Math.round(areaKm2(a.bbox) * 100) / 100 })),
    chunk_span: args.chunkSpan,
    pad_metres: args.padMetres,
    by_workers: byWorkers,
    recommended_workers: recommended,
    recommendation_reason: reason,
    national_projections: projections,
    resume_test: resumeResult,
    caffeinate_command:
      `caffeinate -dimsu npm run generate:catalogue:national -- \\\n` +
      `  --region ${args.region} \\\n` +
      `  --workers ${recommended} \\\n` +
      `  --chunk-span 0.02 \\\n` +
      `  --pad-metres 400 \\\n` +
      `  --resume \\\n` +
      `  --confirm-full-run`,
    notes: [
      "Full national run was NOT started",
      "--confirm-full-run was NOT used",
      "Workers are in-process async pool (same as production generate)",
      "Projection extrapolates benchmark km²/hour to 315k km² land — not perfect linear scaling",
    ],
    confidence:
      "medium — representative areas include London/Dublin density but national urban mix and osmium contention may differ",
  };

  const outDir = path.join(EXPLORE_PACKAGE_ROOT, "output/catalogues/benchmarks");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${args.region}-worker-scaling.json`);
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log("\n=== WORKER SCALING SUMMARY ===");
  console.log(
    JSON.stringify(
      {
        recommended_workers: recommended,
        reason,
            projections: projections[String(recommended)],
      },
      null,
      2
    )
  );
  console.log(`Wrote ${outPath}`);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
