/**
 * Preflight for national catalogue builds (Step 10.4).
 * Blocks unsafe full runs; does not start generation.
 *
 * Usage: npm run preflight:catalogue -- --region uk-and-ireland
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import { loadRegionConfig } from "./generate-catalogue.js";
import { estimateChunkCount, type LonLatBBox } from "./national/chunks.js";

function parseArgs(argv: string[]) {
  let region = "uk-and-ireland";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
  }
  return { region };
}

function findLatestPbfMeta(baseDir: string): { dir: string; meta: Record<string, unknown> } | null {
  if (!fs.existsSync(baseDir)) return null;
  const dirs = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "_download")
    .map((d) => d.name)
    .sort()
    .reverse();
  for (const name of dirs) {
    const dir = path.join(baseDir, name);
    const metaPath = path.join(dir, "source-metadata.json");
    const pbf = path.join(dir, "source.osm.pbf");
    if (fs.existsSync(metaPath) && fs.existsSync(pbf)) {
      return { dir, meta: JSON.parse(fs.readFileSync(metaPath, "utf8")) as Record<string, unknown> };
    }
  }
  return null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const region = loadRegionConfig(args.region) as ReturnType<typeof loadRegionConfig> & {
    pipeline?: string;
    source_pbf_dir?: string;
    coverage_policy?: { polygons_path?: string; exclude?: string[] };
    chunking?: { core_span_degrees?: number | null; pad_metres?: number };
    geofabrik?: { download_url: string };
  };

  const issues: string[] = [];
  const warnings: string[] = [];

  console.log(`Preflight: ${region.region_id}`);

  if (region.pipeline !== "pbf") {
    issues.push("Region is not pipeline=pbf");
  }

  const osmium = spawnSync("which", ["osmium"], { encoding: "utf8" });
  if (osmium.status !== 0) {
    issues.push("osmium-tool not installed (brew install osmium-tool)");
  } else {
    console.log("OK osmium present");
  }

  const pbfBase = path.join(
    EXPLORE_PACKAGE_ROOT,
    region.source_pbf_dir ?? "data/osm/geofabrik/britain-and-ireland"
  );
  const pinned = findLatestPbfMeta(pbfBase);
  if (!pinned) {
    issues.push(
      `No pinned PBF under ${pbfBase}. Run: npm run prepare:pbf -- --region ${args.region}`
    );
  } else {
    console.log(`OK pinned PBF: ${pinned.dir}`);
    console.log(`   sha256=${pinned.meta.sha256}`);
    console.log(`   size=${pinned.meta.file_size_bytes}`);
  }

  const polyRel = region.coverage_policy?.polygons_path;
  const polyPath = polyRel
    ? path.join(EXPLORE_PACKAGE_ROOT, polyRel)
    : path.join(EXPLORE_PACKAGE_ROOT, "catalogues/coverage/uk-and-ireland.geojson");
  if (!fs.existsSync(polyPath)) {
    issues.push(
      `Coverage polygon missing: ${polyPath} (required before --confirm-full-run). See catalogues/coverage/README.md`
    );
  } else {
    console.log(`OK coverage polygon: ${polyPath}`);
  }

  try {
    const st = fs.statfsSync(EXPLORE_PACKAGE_ROOT);
    const freeGiB = (Number(st.bavail) * Number(st.bsize)) / 1024 ** 3;
    console.log(`Disk free (cwd volume): ${freeGiB.toFixed(1)} GiB`);
    if (freeGiB < 40) {
      warnings.push(
        `Low disk (${freeGiB.toFixed(1)} GiB). National intermediates may need ≥40 GiB free.`
      );
    }
  } catch {
    warnings.push("Could not measure free disk");
  }

  const span = region.chunking?.core_span_degrees ?? 0.02;
  const bbox: LonLatBBox = {
    minLatitude: region.bounding_box.min_latitude,
    minLongitude: region.bounding_box.min_longitude,
    maxLatitude: region.bounding_box.max_latitude,
    maxLongitude: region.bounding_box.max_longitude,
  };
  const chunks = estimateChunkCount(bbox, span);
  console.log(
    `Chunk estimate @ ${span}°: ${chunks} (hypothesis only — select span after Phase C benchmarks)`
  );
  console.log(
    "Planning point count: ~0.5–1.5M (mixed UK+ROI) — do NOT assume Stoke 9.24/km² nationally."
  );
  console.log(
    "Activation policy: keep stoke-on-trent active until national activation explicitly retires overlapping Stoke coverage."
  );
  console.log(
    "activate_explore_catalogue_version today only retires same region_id — Phase G must retire Stoke when activating uk-and-ireland."
  );

  for (const w of warnings) console.warn(`WARN: ${w}`);
  if (issues.length) {
    console.error("\nPreflight FAILED:");
    for (const i of issues) console.error(` - ${i}`);
    process.exit(1);
  }
  console.log("\nPreflight OK for continued pipeline work (still no auto full-run).");
  console.log("Full generate requires: Phase C benchmarks + --confirm-full-run + coverage polygon.");
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
