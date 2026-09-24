/**
 * Representative catalogue benchmarks for national chunk sizing (Step 10.4).
 *
 * Each area is processed as PBF→tile extracts (never one giant GeoJSON for dense cities).
 *
 * Usage:
 *   npm run benchmark:catalogue -- --region uk-and-ireland
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
import { estimateChunkCount, type LonLatBBox } from "./national/chunks.js";
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

function parseArgs(argv: string[]) {
  let region = "uk-and-ireland";
  let tileSpan = 0.02;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
    else if (argv[i] === "--tile-span" && argv[i + 1]) tileSpan = Number(argv[++i]);
  }
  return { region, tileSpan };
}

async function generateAreaTiled(opts: {
  area: BenchArea;
  workingPbf: string;
  workRoot: string;
  generationVersion: number;
  tileSpan: number;
  padMetres: number;
}): Promise<{
  sourceFeatures: number;
  acceptedPreSpacing: number;
  accepted: AcceptedStop[];
  rejected: number;
  exportMs: number;
  generateMs: number;
  peakHeapMb: number;
  geojsonBytes: number;
  tileCount: number;
}> {
  const tiles = splitBboxIntoTiles(opts.area.bbox, opts.tileSpan);
  const pre: AcceptedStop[] = [];
  let sourceFeatures = 0;
  let rejected = 0;
  let exportMs = 0;
  let generateMs = 0;
  let peakHeap = process.memoryUsage().heapUsed;
  let geojsonBytes = 0;

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]!;
    const t0 = Date.now();
    const exported = await exportBboxToHuntlyGeoJson({
      sourcePbf: opts.workingPbf,
      bbox: tile,
      workDir: path.join(opts.workRoot, opts.area.id, `tile_${i}`),
      label: `${opts.area.id}_t${i}`,
      padMetres: opts.padMetres,
    });
    exportMs += Date.now() - t0;
    sourceFeatures += exported.featureCount;
    geojsonBytes += fs.statSync(exported.geojsonPath).size;
    peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);

    const config = mergeConfig({
      sourceGeoJsonPath: exported.geojsonPath,
      minLatitude: tile.minLatitude,
      minLongitude: tile.minLongitude,
      maxLatitude: tile.maxLatitude,
      maxLongitude: tile.maxLongitude,
      generationVersion: opts.generationVersion,
    });
    const t1 = Date.now();
    const result = generateStops(exported.collection, config);
    generateMs += Date.now() - t1;
    rejected += result.rejected.length;
    for (const s of result.accepted) {
      if (pointInTile(s.latitude, s.longitude, tile)) pre.push(s);
    }
    peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);

    // Drop per-tile work early to control disk.
    try {
      fs.rmSync(path.join(opts.workRoot, opts.area.id, `tile_${i}`), {
        recursive: true,
        force: true,
      });
    } catch {
      /* ignore */
    }
    console.log(
      `  tile ${i + 1}/${tiles.length} features=${exported.featureCount} pre=${pre.length}`
    );
  }

  const spacedCity = applyCatalogueSpacing(pre, 150);
  // Also exercise national grid spacing path for comparison count.
  const spacedGrid = applyGlobalSpacingGrid(
    spacedCity.map((s) => ({
      id: s.stopId,
      latitude: s.latitude,
      longitude: s.longitude,
      priorityKey: s.priorityKey,
      stop: s,
    })),
    150
  );

  return {
    sourceFeatures,
    acceptedPreSpacing: pre.length,
    accepted: spacedGrid.map((x) => x.stop),
    rejected,
    exportMs,
    generateMs,
    peakHeapMb: Math.round((peakHeap / (1024 * 1024)) * 10) / 10,
    geojsonBytes,
    tileCount: tiles.length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const region = loadRegionConfigLazy(args.region);
  const pinned = findPinnedSourcePbf(
    region.source_pbf_dir ?? "data/osm/geofabrik/britain-and-ireland"
  );
  const workingPbf = resolveWorkingPbf(pinned.revDir, pinned.pbf);
  console.log(`Working PBF: ${workingPbf}`);
  const workRoot = path.join(EXPLORE_PACKAGE_ROOT, "data/osm/work/benchmarks");
  fs.mkdirSync(workRoot, { recursive: true });

  const rows: Array<Record<string, unknown>> = [];
  let totalAccepted = 0;
  let totalKm2 = 0;
  let totalGenMs = 0;
  let totalExportMs = 0;
  let maxPeakHeap = 0;

  for (const area of AREAS) {
    console.log(`\n=== ${area.label} (${area.id}) ===`);
    const result = await generateAreaTiled({
      area,
      workingPbf,
      workRoot,
      generationVersion: region.generation_version,
      tileSpan: args.tileSpan,
      padMetres: 400,
    });
    const km2 = areaKm2(area.bbox);
    const row = {
      id: area.id,
      label: area.label,
      area_km2: Math.round(km2 * 100) / 100,
      tile_count: result.tileCount,
      tile_span_degrees: args.tileSpan,
      export_ms: result.exportMs,
      generate_ms: result.generateMs,
      source_features: result.sourceFeatures,
      candidates_accepted_pre_spacing: result.acceptedPreSpacing,
      accepted_after_spacing: result.accepted.length,
      rejected: result.rejected,
      density_per_km2:
        km2 > 0 ? Math.round((result.accepted.length / km2) * 100) / 100 : null,
      peak_heap_mb: result.peakHeapMb,
      geojson_bytes_sum: result.geojsonBytes,
    };
    rows.push(row);
    totalAccepted += result.accepted.length;
    totalKm2 += km2;
    totalGenMs += result.generateMs;
    totalExportMs += result.exportMs;
    maxPeakHeap = Math.max(maxPeakHeap, result.peakHeapMb);
    console.log(JSON.stringify(row));
  }

  const sampleDensity = totalKm2 > 0 ? totalAccepted / totalKm2 : 0;
  const nationalBboxKm2 = areaKm2({
    minLatitude: region.bounding_box.min_latitude,
    minLongitude: region.bounding_box.min_longitude,
    maxLatitude: region.bounding_box.max_latitude,
    maxLongitude: region.bounding_box.max_longitude,
  });

  // Playable land factor: bbox includes sea; ~0.55 of envelope as rough land share.
  const playableKm2 = nationalBboxKm2 * 0.55;
  const projectedPoints = Math.round(playableKm2 * sampleDensity);
  const msPerKm2 = totalKm2 > 0 ? (totalGenMs + totalExportMs) / totalKm2 : 0;
  const projectedGenHours = (playableKm2 * msPerKm2) / 3_600_000;

  const spanCandidates = [0.02, 0.03, 0.05];
  const chunkEstimates = spanCandidates.map((span) => ({
    span_degrees: span,
    chunks: estimateChunkCount(
      {
        minLatitude: region.bounding_box.min_latitude,
        minLongitude: region.bounding_box.min_longitude,
        maxLatitude: region.bounding_box.max_latitude,
        maxLongitude: region.bounding_box.max_longitude,
      },
      span
    ),
  }));

  const london = rows.find((r) => r.id === "london-central");
  const highlands = rows.find((r) => r.id === "highlands");
  const recommended = {
    chunk_span_degrees: 0.03,
    pad_metres: 400,
    workers: 4,
    partition_span_degrees: 2.0,
    output_format: "ndjson",
    global_spacing: "grid-neighbour (national/spacing.ts)",
    rationale: [
      "0.03° (~3.3 km) balances London feature density vs Highlands empty tiles vs Stoke 0.02° hypothesis",
      "400 m pad matches city-scale safety buffers",
      "4 workers default — raise only with RAM headroom after filtered PBF",
      "NDJSON streaming for national catalogue merge/import",
      "Per-chunk PBF extract (never one national GeoJSON)",
    ],
    london_features: london?.source_features,
    highlands_features: highlands?.source_features,
  };

  const filteredSizeGiB = (() => {
    const filtered = path.join(pinned.revDir, "partitions", "filtered-tags.osm.pbf");
    if (!fs.existsSync(filtered)) return null;
    return Math.round((fs.statSync(filtered).size / (1024 ** 3)) * 100) / 100;
  })();

  const summary = {
    region_id: region.region_id,
    pbf_sha256: pinned.meta.sha256,
    working_pbf: workingPbf,
    filtered_tags_pbf_gib: filteredSizeGiB,
    areas: rows,
    sample_density_per_km2: Math.round(sampleDensity * 100) / 100,
    national_bbox_km2: Math.round(nationalBboxKm2),
    playable_km2_estimate: Math.round(playableKm2),
    projected_point_count: projectedPoints,
    projected_generate_hours_1_worker: Math.round(projectedGenHours * 10) / 10,
    projected_generate_hours_4_workers: Math.round((projectedGenHours / 4) * 10) / 10,
    projected_peak_ram_mb_per_worker: maxPeakHeap,
    projected_temp_disk_gib: Math.round((projectedPoints * 0.0004 + 12 + (filteredSizeGiB ?? 3)) * 10) / 10,
    chunk_estimates: chunkEstimates,
    recommended,
    go_no_go_notes: [
      "Full run still requires --confirm-full-run after reviewing this report",
      "Projections are order-of-magnitude from sample densities — not a promise",
      "Do not activate national catalogue from this step",
      "Stoke remains active",
    ],
  };

  const outDir = path.join(EXPLORE_PACKAGE_ROOT, "output/catalogues/benchmarks");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "uk-and-ireland-benchmark.json");
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote ${outPath}`);
}

function loadRegionConfigLazy(regionId: string) {
  const p = path.join(EXPLORE_PACKAGE_ROOT, "catalogues", `${regionId}.json`);
  return JSON.parse(fs.readFileSync(p, "utf8")) as {
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
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
