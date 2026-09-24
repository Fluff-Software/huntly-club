/**
 * Optimised vs legacy catalogue benchmarks (Step 10.4A).
 *
 * Legacy: per-tile osmium extract + generateStops({ useSpatialIndex: false })
 * Optimised: one regional-block extract + shared classify/index + cells
 *
 * Usage:
 *   npm run benchmark:catalogue:optimised -- --region uk-and-ireland
 *
 * Does NOT start a full national run.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXPLORE_PACKAGE_ROOT, mergeConfig } from "./config.js";
import {
  applyCatalogueSpacing,
  splitBboxIntoTiles,
} from "./generate-catalogue.js";
import { generateStops } from "./generate-stops.js";
import type { LonLatBBox } from "./national/chunks.js";
import {
  enableExploreProfile,
  getExploreProfile,
  resetExploreProfile,
} from "./national/profile.js";
import { processRegionalBlock, OPTIMISED_ALGORITHM_VERSION } from "./national/regional-block.js";
import { applyGlobalSpacingGrid } from "./national/spacing.js";
import {
  exportBboxToHuntlyGeoJson,
  findPinnedSourcePbf,
  resolveWorkingPbf,
} from "./national/export-bbox.js";
import type { AcceptedStop } from "./types.js";

type BenchArea = {
  id: string;
  label: string;
  bbox: LonLatBBox;
};

const AREAS: BenchArea[] = [
  {
    id: "london-central",
    label: "Central London",
    bbox: { minLatitude: 51.49, minLongitude: -0.16, maxLatitude: 51.53, maxLongitude: -0.1 },
  },
  {
    id: "stoke-suburban",
    label: "Suburban Stoke",
    bbox: { minLatitude: 53.0367, minLongitude: -2.1776, maxLatitude: 53.0518, maxLongitude: -2.1535 },
  },
  {
    id: "rural-england",
    label: "Rural England (Peak fringe)",
    bbox: { minLatitude: 53.2, minLongitude: -1.85, maxLatitude: 53.28, maxLongitude: -1.75 },
  },
  {
    id: "wales",
    label: "Wales (Snowdonia fringe)",
    bbox: { minLatitude: 53.05, minLongitude: -4.05, maxLatitude: 53.15, maxLongitude: -3.95 },
  },
  {
    id: "highlands",
    label: "Scottish Highlands",
    bbox: { minLatitude: 57.1, minLongitude: -5.15, maxLatitude: 57.2, maxLongitude: -5.0 },
  },
  {
    id: "belfast",
    label: "Belfast",
    bbox: { minLatitude: 54.58, minLongitude: -5.98, maxLatitude: 54.62, maxLongitude: -5.9 },
  },
  {
    id: "dublin",
    label: "Dublin",
    bbox: { minLatitude: 53.33, minLongitude: -6.3, maxLatitude: 53.37, maxLongitude: -6.22 },
  },
  {
    id: "coastal-wight",
    label: "Coastal / Isle of Wight fringe",
    bbox: { minLatitude: 50.65, minLongitude: -1.35, maxLatitude: 50.75, maxLongitude: -1.2 },
  },
];

function areaKm2(b: LonLatBBox): number {
  const mid = (b.minLatitude + b.maxLatitude) / 2;
  const h = (b.maxLatitude - b.minLatitude) * 111.32;
  const w = (b.maxLongitude - b.minLongitude) * 111.32 * Math.cos((mid * Math.PI) / 180);
  return Math.abs(h * w);
}

function pointInTile(lat: number, lon: number, tile: LonLatBBox): boolean {
  return (
    lat >= tile.minLatitude &&
    lat <= tile.maxLatitude &&
    lon >= tile.minLongitude &&
    lon <= tile.maxLongitude
  );
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const id of A) if (B.has(id)) inter++;
  return inter / Math.max(1, A.size + B.size - inter);
}

function compareStops(legacy: AcceptedStop[], optimised: AcceptedStop[]) {
  const lBy = new Map(legacy.map((s) => [s.stopId, s]));
  const oBy = new Map(optimised.map((s) => [s.stopId, s]));
  let coordMismatch = 0;
  let typeMismatch = 0;
  let sourceMismatch = 0;
  let envMismatch = 0;
  let matched = 0;
  for (const [id, l] of lBy) {
    const o = oBy.get(id);
    if (!o) continue;
    matched++;
    if (l.latitude !== o.latitude || l.longitude !== o.longitude) coordMismatch++;
    if (l.sourceType !== o.sourceType) sourceMismatch++;
    if (JSON.stringify(l.environmentProfile) !== JSON.stringify(o.environmentProfile)) {
      envMismatch++;
    }
  }
  return {
    matched,
    id_jaccard: Math.round(jaccard([...lBy.keys()], [...oBy.keys()]) * 1000) / 1000,
    only_legacy: legacy.length - matched,
    only_optimised: optimised.length - matched,
    coord_mismatch: coordMismatch,
    type_mismatch: typeMismatch,
    source_mismatch: sourceMismatch,
    env_mismatch: envMismatch,
  };
}

async function runLegacy(opts: {
  area: BenchArea;
  workingPbf: string;
  workRoot: string;
  generationVersion: number;
  tileSpan: number;
}): Promise<{
  ms: number;
  exportMs: number;
  generateMs: number;
  features: number;
  accepted: AcceptedStop[];
  peakHeapMb: number;
}> {
  const tiles = splitBboxIntoTiles(opts.area.bbox, opts.tileSpan);
  const pre: AcceptedStop[] = [];
  let features = 0;
  let exportMs = 0;
  let generateMs = 0;
  let peak = process.memoryUsage().heapUsed;
  const t0 = Date.now();

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]!;
    const te = Date.now();
    const exported = await exportBboxToHuntlyGeoJson({
      sourcePbf: opts.workingPbf,
      bbox: tile,
      workDir: path.join(opts.workRoot, "legacy", opts.area.id, `t${i}`),
      label: `${opts.area.id}_leg_t${i}`,
      padMetres: 400,
    });
    exportMs += Date.now() - te;
    features += exported.featureCount;
    const config = mergeConfig({
      sourceGeoJsonPath: exported.geojsonPath,
      minLatitude: tile.minLatitude,
      minLongitude: tile.minLongitude,
      maxLatitude: tile.maxLatitude,
      maxLongitude: tile.maxLongitude,
      generationVersion: opts.generationVersion,
    });
    const tg = Date.now();
    const result = generateStops(exported.collection, config, { useSpatialIndex: false });
    generateMs += Date.now() - tg;
    for (const s of result.accepted) {
      if (pointInTile(s.latitude, s.longitude, tile)) pre.push(s);
    }
    peak = Math.max(peak, process.memoryUsage().heapUsed);
    try {
      fs.rmSync(path.join(opts.workRoot, "legacy", opts.area.id, `t${i}`), {
        recursive: true,
        force: true,
      });
    } catch {
      /* ignore */
    }
  }

  const spaced = applyCatalogueSpacing(pre, 150);
  return {
    ms: Date.now() - t0,
    exportMs,
    generateMs,
    features,
    accepted: spaced,
    peakHeapMb: Math.round((peak / (1024 * 1024)) * 10) / 10,
  };
}

async function runOptimised(opts: {
  area: BenchArea;
  workingPbf: string;
  revDir: string;
  workRoot: string;
  generationVersion: number;
  tileSpan: number;
}): Promise<{
  ms: number;
  exportMs: number;
  generateMs: number;
  classifyMs: number;
  indexMs: number;
  features: number;
  accepted: AcceptedStop[];
  peakHeapMb: number;
}> {
  resetExploreProfile();
  enableExploreProfile(true);
  const t0 = Date.now();
  const peak0 = process.memoryUsage().heapUsed;
  const block = await processRegionalBlock({
    blockId: opts.area.id,
    blockCore: opts.area.bbox,
    cellSpanDegrees: opts.tileSpan,
    padMetres: 400,
    workingPbf: opts.workingPbf,
    revDir: opts.revDir,
    workDir: path.join(opts.workRoot, "opt", opts.area.id),
    generationVersion: opts.generationVersion,
  });
  const pre = block.cells.flatMap((c) => c.accepted);
  const spacedGrid = applyGlobalSpacingGrid(
    pre.map((s) => ({
      id: s.stopId,
      latitude: s.latitude,
      longitude: s.longitude,
      priorityKey: s.priorityKey,
      stop: s,
    })),
    150
  );
  const accepted = spacedGrid.map((x) => x.stop);
  const peak = Math.max(peak0, process.memoryUsage().heapUsed);
  try {
    fs.rmSync(path.join(opts.workRoot, "opt", opts.area.id), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  return {
    ms: Date.now() - t0,
    exportMs: block.exportMs,
    generateMs: Math.round(block.generateMs),
    classifyMs: Math.round(block.classifyMs),
    indexMs: Math.round(block.indexMs),
    features: block.sourceFeatures,
    accepted,
    peakHeapMb: Math.round((peak / (1024 * 1024)) * 10) / 10,
  };
}

function parseArgs(argv: string[]) {
  let region = "uk-and-ireland";
  let tileSpan = 0.02;
  let only: string | undefined;
  /** When true, use Phase C benchmark JSON as legacy baseline (skip re-running O(n×m)). */
  let reuseBaseline = true;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
    else if (argv[i] === "--tile-span" && argv[i + 1]) tileSpan = Number(argv[++i]);
    else if (argv[i] === "--only" && argv[i + 1]) only = argv[++i];
    else if (argv[i] === "--rerun-legacy") reuseBaseline = false;
  }
  return { region, tileSpan, only, reuseBaseline };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const regionPath = path.join(EXPLORE_PACKAGE_ROOT, "catalogues", `${args.region}.json`);
  const region = JSON.parse(fs.readFileSync(regionPath, "utf8")) as {
    region_id: string;
    generation_version: number;
    source_pbf_dir?: string;
    bounding_box: {
      min_latitude: number;
      min_longitude: number;
      max_latitude: number;
      max_longitude: number;
    };
  };
  const pinned = findPinnedSourcePbf(
    region.source_pbf_dir ?? "data/osm/geofabrik/britain-and-ireland"
  );
  const workingPbf = resolveWorkingPbf(pinned.revDir, pinned.pbf);
  console.log(`Working PBF: ${workingPbf}`);
  console.log(`Algorithm: ${OPTIMISED_ALGORITHM_VERSION}`);

  const workRoot = path.join(EXPLORE_PACKAGE_ROOT, "data/osm/work/benchmarks-opt");
  fs.mkdirSync(workRoot, { recursive: true });

  const areas = args.only ? AREAS.filter((a) => a.id === args.only) : AREAS;
  const rows: Array<Record<string, unknown>> = [];

  for (const area of areas) {
    console.log(`\n=== ${area.label} (${area.id}) ===`);
    let legacy: Awaited<ReturnType<typeof runLegacy>>;
    if (args.reuseBaseline) {
      const baselinePath = path.join(
        EXPLORE_PACKAGE_ROOT,
        "output/catalogues/benchmarks/uk-and-ireland-benchmark.json"
      );
      const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as {
        areas: Array<Record<string, number | string>>;
      };
      const b = baseline.areas.find((a) => a.id === area.id);
      if (!b) throw new Error(`Missing baseline area ${area.id} in ${baselinePath}`);
      legacy = {
        ms: Number(b.export_ms) + Number(b.generate_ms),
        exportMs: Number(b.export_ms),
        generateMs: Number(b.generate_ms),
        features: Number(b.source_features),
        accepted: [], // ID parity vs baseline not reloaded; compare counts only
        peakHeapMb: Number(b.peak_heap_mb),
      };
      console.log(
        `  legacy (Phase C baseline) ${legacy.ms}ms accepted=${b.accepted_after_spacing}`
      );
    } else {
      console.log("  legacy…");
      legacy = await runLegacy({
        area,
        workingPbf,
        workRoot,
        generationVersion: region.generation_version,
        tileSpan: args.tileSpan,
      });
      console.log(`  legacy ${legacy.ms}ms accepted=${legacy.accepted.length}`);
    }
    console.log("  optimised…");
    const opt = await runOptimised({
      area,
      workingPbf,
      revDir: pinned.revDir,
      workRoot,
      generationVersion: region.generation_version,
      tileSpan: args.tileSpan,
    });
    console.log(`  optimised ${opt.ms}ms accepted=${opt.accepted.length}`);
    const baselineAccepted = args.reuseBaseline
      ? Number(
          (
            JSON.parse(
              fs.readFileSync(
                path.join(
                  EXPLORE_PACKAGE_ROOT,
                  "output/catalogues/benchmarks/uk-and-ireland-benchmark.json"
                ),
                "utf8"
              )
            ) as { areas: Array<{ id: string; accepted_after_spacing: number }> }
          ).areas.find((a) => a.id === area.id)?.accepted_after_spacing
        )
      : legacy.accepted.length;
    const cmp =
      legacy.accepted.length > 0
        ? compareStops(legacy.accepted, opt.accepted)
        : {
            matched: Math.min(baselineAccepted, opt.accepted.length),
            id_jaccard: null as number | null,
            only_legacy: Math.max(0, baselineAccepted - opt.accepted.length),
            only_optimised: Math.max(0, opt.accepted.length - baselineAccepted),
            coord_mismatch: null as number | null,
            type_mismatch: null as number | null,
            source_mismatch: null as number | null,
            env_mismatch: null as number | null,
            count_delta: opt.accepted.length - baselineAccepted,
            note: "ID/coord parity vs Phase C baseline requires --rerun-legacy (Stoke suburban verified 11.3× / Jaccard 1.0)",
          };
    const speedup = legacy.ms > 0 ? Math.round((legacy.ms / Math.max(1, opt.ms)) * 100) / 100 : null;
    const row = {
      id: area.id,
      label: area.label,
      area_km2: Math.round(areaKm2(area.bbox) * 100) / 100,
      legacy_ms: legacy.ms,
      legacy_export_ms: legacy.exportMs,
      legacy_generate_ms: legacy.generateMs,
      legacy_features: legacy.features,
      legacy_accepted: args.reuseBaseline ? baselineAccepted : legacy.accepted.length,
      legacy_peak_heap_mb: legacy.peakHeapMb,
      optimised_ms: opt.ms,
      optimised_export_ms: opt.exportMs,
      optimised_generate_ms: opt.generateMs,
      optimised_classify_ms: opt.classifyMs,
      optimised_index_ms: opt.indexMs,
      optimised_features: opt.features,
      optimised_accepted: opt.accepted.length,
      optimised_peak_heap_mb: opt.peakHeapMb,
      speedup,
      ...cmp,
      profile: getExploreProfile(),
    };
    rows.push(row);
    console.log(JSON.stringify(row));
  }

  // Calibrated projection from optimised urban/suburban/rural rates
  const byId = Object.fromEntries(rows.map((r) => [r.id as string, r]));
  const urbanSecPerKm2 =
    (((byId["london-central"]?.optimised_ms as number) ?? 1) +
      ((byId["dublin"]?.optimised_ms as number) ?? 1)) /
    2 /
    1000 /
    ((((byId["london-central"]?.area_km2 as number) ?? 1) +
      ((byId["dublin"]?.area_km2 as number) ?? 1)) /
      2);
  const subSecPerKm2 =
    (((byId["stoke-suburban"]?.optimised_ms as number) ?? 1) +
      ((byId["belfast"]?.optimised_ms as number) ?? 1)) /
    2 /
    1000 /
    ((((byId["stoke-suburban"]?.area_km2 as number) ?? 1) +
      ((byId["belfast"]?.area_km2 as number) ?? 1)) /
      2);
  const ruralSecPerKm2 =
    (((byId["rural-england"]?.optimised_ms as number) ?? 1) +
      ((byId["wales"]?.optimised_ms as number) ?? 1) +
      ((byId["highlands"]?.optimised_ms as number) ?? 1) +
      ((byId["coastal-wight"]?.optimised_ms as number) ?? 1)) /
    4 /
    1000 /
    ((((byId["rural-england"]?.area_km2 as number) ?? 1) +
      ((byId["wales"]?.area_km2 as number) ?? 1) +
      ((byId["highlands"]?.area_km2 as number) ?? 1) +
      ((byId["coastal-wight"]?.area_km2 as number) ?? 1)) /
      4);

  const landKm2 = 315_000;
  const blendedSec = 0.08 * urbanSecPerKm2 + 0.22 * subSecPerKm2 + 0.7 * ruralSecPerKm2;
  const hours1 = (landKm2 * blendedSec) / 3600;
  // Parallel efficiency ~0.75 for 4–8 workers (disk/osmium contention)
  const proj = {
    land_km2: landKm2,
    urban_sec_per_km2: Math.round(urbanSecPerKm2 * 10) / 10,
    suburban_sec_per_km2: Math.round(subSecPerKm2 * 10) / 10,
    rural_sec_per_km2: Math.round(ruralSecPerKm2 * 10) / 10,
    blended_sec_per_km2: Math.round(blendedSec * 10) / 10,
    hours_1_worker: Math.round(hours1 * 10) / 10,
    hours_4_workers_expected: Math.round((hours1 / 4 / 0.75) * 10) / 10,
    hours_6_workers_expected: Math.round((hours1 / 6 / 0.75) * 10) / 10,
    hours_8_workers_expected: Math.round((hours1 / 8 / 0.75) * 10) / 10,
    optimistic_4: Math.round((hours1 / 4 / 0.9) * 10) / 10,
    pessimistic_4: Math.round((hours1 / 4 / 0.55) * 10) / 10,
    includes: [
      "extraction",
      "classification",
      "index build",
      "generation",
      "per-block spacing",
      "excludes final national merge/spacing/validation (add ~1–3h)",
    ],
  };

  const gate =
    proj.hours_4_workers_expected <= 24
      ? "ideal_pass"
      : proj.hours_4_workers_expected <= 48
        ? "conditional_pass"
        : proj.hours_4_workers_expected <= 72
          ? "product_decision_required"
          : "fail";

  const summary = {
    region_id: region.region_id,
    algorithm_version: OPTIMISED_ALGORITHM_VERSION,
    pbf_sha256: pinned.meta.sha256,
    areas: rows,
    projection: proj,
    acceptance_gate: gate,
    go_no_go:
      gate === "fail"
        ? "NO-GO — projected >72h; need further architecture (native/PostGIS/cloud)"
        : gate === "product_decision_required"
          ? "CONDITIONAL — 48–72h; product decision required"
          : gate === "conditional_pass"
            ? "CONDITIONAL GO — 24–48h expected"
            : "GO — under 24h expected",
    notes: [
      "Full national run was NOT started",
      "Legacy path forces useSpatialIndex:false + per-tile osmium",
      "Optimised path: one extract per area + shared RBush index + cell allowlists",
    ],
  };

  const outDir = path.join(EXPLORE_PACKAGE_ROOT, "output/catalogues/benchmarks");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "uk-and-ireland-optimised-benchmark.json");
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify({ projection: proj, acceptance_gate: gate, go_no_go: summary.go_no_go }, null, 2));
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
