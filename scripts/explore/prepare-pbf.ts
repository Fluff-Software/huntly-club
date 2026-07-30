/**
 * Acquire / pin Geofabrik PBF for national catalogue builds (Step 10.4).
 * Never called from Edge or mobile. Does not use Overpass.
 *
 * Usage:
 *   npm run prepare:pbf -- --region uk-and-ireland
 *   npm run prepare:pbf -- --region uk-and-ireland --path /abs/source.osm.pbf
 *   npm run prepare:pbf -- --region uk-and-ireland --dry-run
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import { loadRegionConfig } from "./generate-catalogue.js";

type GeofabrikConfig = {
  dataset: string;
  download_url: string;
  page_url?: string;
};

type NationalRegion = ReturnType<typeof loadRegionConfig> & {
  pipeline?: string;
  geofabrik?: GeofabrikConfig;
  source_pbf_dir?: string;
};

type SourceMetadata = {
  region_id: string;
  dataset: string;
  source_url: string;
  page_url?: string;
  local_path: string;
  file_size_bytes: number;
  sha256: string;
  downloaded_at: string;
  download_duration_ms: number | null;
  attribution: string;
  licence: string;
  distributor: string;
  notes: string;
};

function parseArgs(argv: string[]) {
  let region = "uk-and-ireland";
  let localPath: string | undefined;
  let dryRun = false;
  let force = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
    else if (argv[i] === "--path" && argv[i + 1]) localPath = argv[++i];
    else if (argv[i] === "--dry-run") dryRun = true;
    else if (argv[i] === "--force") force = true;
  }
  return { region, localPath, dryRun, force };
}

function sha256File(filePath: string): string {
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(1024 * 1024);
  let n: number;
  while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
    hash.update(buf.subarray(0, n));
  }
  fs.closeSync(fd);
  return hash.digest("hex");
}

function revisionDirName(sha256: string, when = new Date()): string {
  const day = when.toISOString().slice(0, 10);
  return `${day}_${sha256.slice(0, 12)}`;
}

function downloadWithCurl(url: string, dest: string): number {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const partial = `${dest}.partial`;
  const started = Date.now();
  // Resume partial downloads when practical (-C -).
  const r = spawnSync(
    "curl",
    ["-L", "--fail", "--retry", "3", "-C", "-", "-o", partial, url],
    { stdio: "inherit" }
  );
  if (r.status !== 0) {
    throw new Error(`curl download failed (exit ${r.status})`);
  }
  fs.renameSync(partial, dest);
  return Date.now() - started;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const region = loadRegionConfig(args.region) as NationalRegion;
  if (region.pipeline !== "pbf" || !region.geofabrik) {
    throw new Error(
      `Region ${args.region} is not a PBF pipeline region (set pipeline=pbf + geofabrik in catalogues/${args.region}.json)`
    );
  }

  const baseDir = path.isAbsolute(region.source_pbf_dir ?? "")
    ? region.source_pbf_dir!
    : path.join(EXPLORE_PACKAGE_ROOT, region.source_pbf_dir ?? "data/osm/geofabrik/britain-and-ireland");

  console.log(`Region: ${region.region_id}`);
  console.log(`Dataset: ${region.geofabrik.dataset}`);
  console.log(`URL: ${region.geofabrik.download_url}`);
  console.log(
    "Attribution: © OpenStreetMap contributors (ODbL). Geofabrik distributes extracts; it does not own OSM data."
  );

  if (args.dryRun) {
    console.log("Dry run — no download.");
    console.log(`Would store under: ${baseDir}/<revision>/`);
    return;
  }

  let sourcePath: string;
  let downloadMs: number | null = null;

  if (args.localPath) {
    sourcePath = path.resolve(args.localPath);
    if (!fs.existsSync(sourcePath)) throw new Error(`PBF not found: ${sourcePath}`);
  } else {
    const stagingName = `${region.geofabrik.dataset}-latest.osm.pbf`;
    const staging = path.join(baseDir, "_download", stagingName);
    if (fs.existsSync(staging) && !args.force) {
      console.log(`Using existing download staging file: ${staging}`);
      console.log("Pass --force to re-download.");
      sourcePath = staging;
    } else {
      console.log("Downloading Geofabrik extract (large — may take a while)…");
      downloadMs = downloadWithCurl(region.geofabrik.download_url, staging);
      sourcePath = staging;
    }
  }

  const size = fs.statSync(sourcePath).size;
  if (size < 100_000_000) {
    throw new Error(
      `PBF suspiciously small (${size} bytes). Aborting — check download / path.`
    );
  }
  console.log(`File size: ${(size / (1024 ** 3)).toFixed(2)} GiB`);
  console.log("Computing SHA-256…");
  const sha = sha256File(sourcePath);
  console.log(`SHA-256: ${sha}`);

  const rev = revisionDirName(sha);
  const destDir = path.join(baseDir, rev);
  const destPbf = path.join(destDir, "source.osm.pbf");
  const metaPath = path.join(destDir, "source-metadata.json");

  if (fs.existsSync(destPbf) && !args.force) {
    const existing = JSON.parse(fs.readFileSync(metaPath, "utf8")) as SourceMetadata;
    if (existing.sha256 === sha) {
      console.log(`Same revision already pinned at ${destDir}`);
      console.log("Catalogue builds must pin this revision (do not auto-refresh mid-run).");
      return;
    }
  }

  fs.mkdirSync(destDir, { recursive: true });
  if (path.resolve(sourcePath) !== path.resolve(destPbf)) {
    fs.copyFileSync(sourcePath, destPbf);
  }

  const meta: SourceMetadata = {
    region_id: region.region_id,
    dataset: region.geofabrik.dataset,
    source_url: region.geofabrik.download_url,
    page_url: region.geofabrik.page_url,
    local_path: destPbf,
    file_size_bytes: size,
    sha256: sha,
    downloaded_at: new Date().toISOString(),
    download_duration_ms: downloadMs,
    attribution: region.attribution,
    licence: region.licence,
    distributor: "Geofabrik GmbH",
    notes:
      "Pinned source for one catalogue build. Do not replace during an in-progress generate. ODbL — © OpenStreetMap contributors.",
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`Pinned: ${destDir}`);
  console.log(`Metadata: ${metaPath}`);
  console.log(
    `Next: npm run check:pbf-tools && npm run extract:coverage -- --region ${region.region_id}`
  );
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
