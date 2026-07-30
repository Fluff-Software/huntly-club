/**
 * National PBF → filtered intermediate + resumable bbox partitions (Step 10.4).
 *
 * Stage A: one tags-filter pass on the national PBF → filtered.osm.pbf
 * Stage B: osmium extract per regional partition (not per tiny generate chunk)
 *
 * Usage:
 *   npm run extract:partitions -- --region uk-and-ireland
 *   npm run extract:partitions -- --region uk-and-ireland --resume
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import { loadRegionConfig } from "./generate-catalogue.js";
import { splitBboxIntoChunkGrid, type LonLatBBox } from "./national/chunks.js";

/** ~2° regional partitions — far fewer files than 0.02° generate chunks. */
const PARTITION_SPAN_DEGREES = 2.0;

function parseArgs(argv: string[]) {
  let region = "uk-and-ireland";
  let resume = false;
  let force = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
    else if (argv[i] === "--resume") resume = true;
    else if (argv[i] === "--force") force = true;
  }
  return { region, resume, force };
}

function findPinned(baseDir: string): { pbf: string; meta: Record<string, unknown>; revDir: string } {
  const dirs = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "_download")
    .map((d) => d.name)
    .sort()
    .reverse();
  for (const name of dirs) {
    const revDir = path.join(baseDir, name);
    const pbf = path.join(revDir, "source.osm.pbf");
    const metaPath = path.join(revDir, "source-metadata.json");
    if (fs.existsSync(pbf) && fs.existsSync(metaPath)) {
      return {
        pbf,
        meta: JSON.parse(fs.readFileSync(metaPath, "utf8")) as Record<string, unknown>,
        revDir,
      };
    }
  }
  throw new Error(`No pinned PBF under ${baseDir}`);
}

function runOsmium(args: string[], label: string) {
  console.log(`  osmium ${args[0]} …`);
  const r = spawnSync("osmium", args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${label} failed (exit ${r.status})`);
}

type PartitionManifest = {
  region_id: string;
  source_sha256: string;
  source_pbf: string;
  filtered_pbf: string;
  partition_span_degrees: number;
  created_at: string;
  updated_at: string;
  partitions: Record<
    string,
    {
      id: string;
      status: "pending" | "completed" | "failed";
      bbox: LonLatBBox;
      path?: string;
      error?: string;
      finished_at?: string;
    }
  >;
};

function main() {
  const args = parseArgs(process.argv.slice(2));
  const region = loadRegionConfig(args.region) as ReturnType<typeof loadRegionConfig> & {
    source_pbf_dir?: string;
  };
  const pbfBase = path.join(
    EXPLORE_PACKAGE_ROOT,
    region.source_pbf_dir ?? "data/osm/geofabrik/britain-and-ireland"
  );
  const pinned = findPinned(pbfBase);
  const workRoot = path.join(pinned.revDir, "partitions");
  fs.mkdirSync(workRoot, { recursive: true });

  const filterFile = path.join(EXPLORE_PACKAGE_ROOT, "national/osmium-tags.filter");
  const filteredPbf = path.join(workRoot, "filtered-tags.osm.pbf");
  const manifestPath = path.join(workRoot, "partition-manifest.json");

  console.log(`Source: ${pinned.pbf}`);
  console.log(`SHA-256: ${pinned.meta.sha256}`);

  const doneMarker = path.join(workRoot, "filtered-tags.done");
  const stageAReady =
    fs.existsSync(filteredPbf) &&
    fs.existsSync(doneMarker) &&
    fs.statSync(filteredPbf).size > 0;
  if (!stageAReady || args.force) {
    console.log("Stage A: tags-filter (single national scan)…");
    if (fs.existsSync(doneMarker)) fs.unlinkSync(doneMarker);
    if (fs.existsSync(filteredPbf)) fs.unlinkSync(filteredPbf);
    runOsmium(
      [
        "tags-filter",
        "--expressions",
        filterFile,
        "-o",
        filteredPbf,
        "--overwrite",
        pinned.pbf,
      ],
      "tags-filter"
    );
    fs.writeFileSync(
      doneMarker,
      JSON.stringify({ finished_at: new Date().toISOString(), source_sha256: pinned.meta.sha256 })
    );
  } else {
    console.log(`Stage A: reuse ${filteredPbf}`);
  }

  const bbox: LonLatBBox = {
    minLatitude: region.bounding_box.min_latitude,
    minLongitude: region.bounding_box.min_longitude,
    maxLatitude: region.bounding_box.max_latitude,
    maxLongitude: region.bounding_box.max_longitude,
  };
  const grid = splitBboxIntoChunkGrid(bbox, PARTITION_SPAN_DEGREES, 0);

  let manifest: PartitionManifest;
  if (args.resume && fs.existsSync(manifestPath) && !args.force) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as PartitionManifest;
    if (manifest.source_sha256 !== pinned.meta.sha256) {
      throw new Error("Partition manifest source SHA mismatch — refuse resume (use --force)");
    }
  } else {
    manifest = {
      region_id: region.region_id,
      source_sha256: String(pinned.meta.sha256),
      source_pbf: pinned.pbf,
      filtered_pbf: filteredPbf,
      partition_span_degrees: PARTITION_SPAN_DEGREES,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      partitions: {},
    };
    for (const c of grid) {
      manifest.partitions[c.chunkId] = {
        id: c.chunkId,
        status: "pending",
        bbox: c.core,
      };
    }
  }

  const pending = Object.values(manifest.partitions).filter(
    (p) => p.status !== "completed" || args.force
  );
  console.log(`Stage B: ${pending.length} partition extract(s) (span=${PARTITION_SPAN_DEGREES}°)…`);

  for (const part of pending) {
    const out = path.join(workRoot, `${part.id}.osm.pbf`);
    const b = part.bbox;
    // osmium extract bbox: left,bottom,right,top (lon/lat)
    const box = `${b.minLongitude},${b.minLatitude},${b.maxLongitude},${b.maxLatitude}`;
    try {
      runOsmium(
        [
          "extract",
          "-b",
          box,
          "-s",
          "complete_ways",
          "-o",
          out,
          "--overwrite",
          filteredPbf,
        ],
        `extract ${part.id}`
      );
      part.status = "completed";
      part.path = out;
      part.finished_at = new Date().toISOString();
      delete part.error;
    } catch (e) {
      part.status = "failed";
      part.error = e instanceof Error ? e.message : String(e);
      console.error(`Partition ${part.id} failed: ${part.error}`);
    }
    manifest.updated_at = new Date().toISOString();
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  const done = Object.values(manifest.partitions).filter((p) => p.status === "completed").length;
  const failed = Object.values(manifest.partitions).filter((p) => p.status === "failed").length;
  console.log(`Partitions complete=${done} failed=${failed} manifest=${manifestPath}`);
  if (failed > 0) process.exit(1);
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
