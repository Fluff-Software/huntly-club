/**
 * Read-only national catalogue build status (Step 10.4B).
 *
 * Safe to run while generation is active. Does not mutate the build.
 *
 * Usage:
 *   npm run status:catalogue -- --region uk-and-ireland
 *   npm run status:catalogue -- --region uk-and-ireland --build-id build_...
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import { loadRegionConfig } from "./generate-catalogue.js";
import { loadManifest, type BuildManifest } from "./national/manifest.js";
import { findLatestBuildDir } from "./national/resolve-build.js";
import {
  freeDiskBytes,
  sampleMatchingProcesses,
  sampleMemoryPressure,
  sampleSwap,
} from "./national/system-metrics.js";

function dirSizeBytes(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  const walk = (p: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(p, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const fp = path.join(p, e.name);
      try {
        if (e.isDirectory()) walk(fp);
        else total += fs.statSync(fp).size;
      } catch {
        /* ignore */
      }
    }
  };
  walk(dir);
  return total;
}

function parseArgs(argv: string[]) {
  let region = "uk-and-ireland";
  let buildId: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
    else if (argv[i] === "--build-id" && argv[i + 1]) buildId = argv[++i];
  }
  return { region, buildId };
}

function summarise(manifest: BuildManifest, buildDir: string) {
  const chunks = Object.values(manifest.chunks);
  const completed = chunks.filter((c) => c.status === "completed").length;
  const failed = chunks.filter((c) => c.status === "failed").length;
  const running = chunks.filter((c) => c.status === "running").length;
  const pending = chunks.filter((c) => c.status === "pending").length;
  const remaining = failed + running + pending;
  const doneAt = chunks
    .filter((c) => c.status === "completed" && c.finishedAt)
    .map((c) => Date.parse(c.finishedAt!))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const started = Date.parse(manifest.started_at);
  const now = Date.now();
  const elapsedH = Number.isFinite(started) ? (now - started) / 3_600_000 : null;
  let throughputBlocksPerHour: number | null = null;
  let etaHours: number | null = null;
  if (elapsedH && elapsedH > 0 && completed > 0) {
    throughputBlocksPerHour = completed / elapsedH;
    if (remaining > 0) etaHours = remaining / throughputBlocksPerHour;
  }
  // Recent window: last 30 completed
  const recent = doneAt.slice(-30);
  if (recent.length >= 5) {
    const windowH = (recent[recent.length - 1]! - recent[0]!) / 3_600_000;
    if (windowH > 0) {
      const recentRate = (recent.length - 1) / windowH;
      throughputBlocksPerHour = recentRate;
      etaHours = remaining > 0 ? remaining / recentRate : 0;
    }
  }

  const outBytes = dirSizeBytes(buildDir);
  const free = freeDiskBytes(buildDir);
  const swap = sampleSwap();
  const pressure = sampleMemoryPressure();
  const procs = sampleMatchingProcesses("generate-catalogue-national|osmium|tsx");

  return {
    build_dir: buildDir,
    catalogue_build_id: manifest.catalogue_build_id,
    source_revision: manifest.source_revision,
    generator_config_hash: manifest.generator_config_hash,
    total_chunks: manifest.total_chunks,
    completed_blocks: completed,
    remaining_blocks: remaining,
    failed_blocks: failed,
    running_blocks: running,
    pending_blocks: pending,
    throughput_chunks_per_hour:
      throughputBlocksPerHour != null
        ? Math.round(throughputBlocksPerHour * 10) / 10
        : null,
    eta_hours: etaHours != null ? Math.round(etaHours * 10) / 10 : null,
    output_size_mb: Math.round((outBytes / (1024 * 1024)) * 10) / 10,
    free_disk_gb: free != null ? Math.round((free / (1024 ** 3)) * 10) / 10 : null,
    worker_processes: procs.map((p) => ({
      pid: p.pid,
      rss_mb: Math.round((p.rssBytes / (1024 * 1024)) * 10) / 10,
      cpu_pct: p.cpuPercent,
    })),
    memory_swap: {
      swap_used_mb:
        swap.swapUsedBytes != null
          ? Math.round((swap.swapUsedBytes / (1024 * 1024)) * 10) / 10
          : null,
      pages_free: swap.pagesFree,
      memory_pressure: pressure,
    },
    aggregates: manifest.aggregates ?? null,
    validation_status: manifest.validation_status,
    validation_report_present: fs.existsSync(path.join(buildDir, "validation.json")),
    catalogue_ndjson_present: fs.existsSync(path.join(buildDir, "catalogue.ndjson")),
    updated_at: manifest.updated_at,
    read_only: true,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const region = loadRegionConfig(args.region) as ReturnType<typeof loadRegionConfig> & {
    output_dir: string;
  };
  const outputRoot = path.join(EXPLORE_PACKAGE_ROOT, region.output_dir);
  const buildDir = args.buildId
    ? path.join(outputRoot, args.buildId)
    : findLatestBuildDir(outputRoot);

  if (!buildDir || !fs.existsSync(path.join(buildDir, "build-manifest.json"))) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          region: args.region,
          message: "No build manifest found (generation may not have started).",
          output_root: outputRoot,
          read_only: true,
        },
        null,
        2
      )
    );
    return;
  }

  const before = fs.statSync(path.join(buildDir, "build-manifest.json")).mtimeMs;
  const manifest = loadManifest(buildDir);
  const status = summarise(manifest, buildDir);
  const after = fs.statSync(path.join(buildDir, "build-manifest.json")).mtimeMs;
  if (after !== before) {
    // Extremely unlikely race; we never write — report if external writer touched it.
    console.warn("Note: manifest mtime changed during read (generator likely active).");
  }

  console.log(JSON.stringify({ ok: true, ...status }, null, 2));
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

export { summarise, parseArgs };
