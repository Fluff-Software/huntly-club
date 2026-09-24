/**
 * Export a bbox from pinned/filtered PBF to Huntly GeoJSON via osmium (streaming tools).
 * Used by parity + benchmarks — never loads the full national PBF into Node.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createReadStream } from "node:fs";
import type { Feature, FeatureCollection } from "geojson";
import { EXPLORE_PACKAGE_ROOT } from "../config.js";
import { osmiumFeatureToHuntly } from "./osmium-to-huntly.js";
import type { LonLatBBox } from "./chunks.js";

export function findPinnedSourcePbf(regionPbfDir: string): {
  pbf: string;
  revDir: string;
  meta: Record<string, unknown>;
} {
  const base = path.isAbsolute(regionPbfDir)
    ? regionPbfDir
    : path.join(EXPLORE_PACKAGE_ROOT, regionPbfDir);
  const dirs = fs
    .readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "_download")
    .map((d) => d.name)
    .sort()
    .reverse();
  for (const name of dirs) {
    const revDir = path.join(base, name);
    const pbf = path.join(revDir, "source.osm.pbf");
    const metaPath = path.join(revDir, "source-metadata.json");
    if (fs.existsSync(pbf) && fs.existsSync(metaPath)) {
      return {
        pbf,
        revDir,
        meta: JSON.parse(fs.readFileSync(metaPath, "utf8")) as Record<string, unknown>,
      };
    }
  }
  throw new Error(`No pinned PBF under ${base}`);
}

function runOsmium(args: string[]) {
  const r = spawnSync("osmium", args, { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`osmium failed: ${r.stderr || r.stdout || r.status}`);
  }
  return r;
}

/**
 * Prefer filtered-tags.osm.pbf if Stage A completed with a done marker.
 */
export function resolveWorkingPbf(revDir: string, sourcePbf: string): string {
  const filtered = path.join(revDir, "partitions", "filtered-tags.osm.pbf");
  const done = path.join(revDir, "partitions", "filtered-tags.done");
  if (fs.existsSync(filtered) && fs.existsSync(done)) return filtered;
  return sourcePbf;
}

/**
 * Prefer the smallest completed 2° partition that fully contains the padded bbox.
 * Falls back to the working (filtered/source) PBF.
 */
export function resolvePartitionPbfForBbox(
  revDir: string,
  bbox: LonLatBBox,
  fallbackPbf: string
): string {
  const manifestPath = path.join(revDir, "partitions", "partition-manifest.json");
  if (!fs.existsSync(manifestPath)) return fallbackPbf;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    partitions: Record<
      string,
      {
        status: string;
        path?: string;
        bbox: LonLatBBox;
      }
    >;
  };
  let best: { path: string; area: number } | null = null;
  for (const part of Object.values(manifest.partitions)) {
    if (part.status !== "completed" || !part.path || !fs.existsSync(part.path)) continue;
    const b = part.bbox;
    const contains =
      bbox.minLatitude >= b.minLatitude &&
      bbox.maxLatitude <= b.maxLatitude &&
      bbox.minLongitude >= b.minLongitude &&
      bbox.maxLongitude <= b.maxLongitude;
    if (!contains) continue;
    const area =
      Math.max(0.0001, b.maxLatitude - b.minLatitude) *
      Math.max(0.0001, b.maxLongitude - b.minLongitude);
    if (!best || area < best.area) best = { path: part.path, area };
  }
  return best?.path ?? fallbackPbf;
}

export async function exportBboxToHuntlyGeoJson(opts: {
  sourcePbf: string;
  bbox: LonLatBBox;
  workDir: string;
  label: string;
  padMetres?: number;
}): Promise<{ geojsonPath: string; featureCount: number; collection: FeatureCollection }> {
  fs.mkdirSync(opts.workDir, { recursive: true });
  const pad = opts.padMetres ?? 400;
  const midLat = (opts.bbox.minLatitude + opts.bbox.maxLatitude) / 2;
  const dLat = pad / 111_320;
  const dLon = pad / (111_320 * Math.cos((midLat * Math.PI) / 180));
  const left = opts.bbox.minLongitude - dLon;
  const bottom = opts.bbox.minLatitude - dLat;
  const right = opts.bbox.maxLongitude + dLon;
  const top = opts.bbox.maxLatitude + dLat;
  const box = `${left},${bottom},${right},${top}`;

  const extractPbf = path.join(opts.workDir, `${opts.label}.extract.osm.pbf`);
  const filteredExtract = path.join(opts.workDir, `${opts.label}.filtered.osm.pbf`);
  const seqPath = path.join(opts.workDir, `${opts.label}.geojsonseq`);
  const geojsonPath = path.join(opts.workDir, `${opts.label}.huntly.geojson`);

  runOsmium([
    "extract",
    "-b",
    box,
    "-s",
    "complete_ways",
    "-o",
    extractPbf,
    "--overwrite",
    opts.sourcePbf,
  ]);

  // Shrink dense urban extracts before Node mapping (same allowlist as Stage A).
  const filterFile = path.join(EXPLORE_PACKAGE_ROOT, "national/osmium-tags.filter");
  const exportInput = fs.existsSync(filterFile) ? filteredExtract : extractPbf;
  if (exportInput === filteredExtract) {
    runOsmium([
      "tags-filter",
      "--expressions",
      filterFile,
      "-o",
      filteredExtract,
      "--overwrite",
      extractPbf,
    ]);
  }

  // GeoJSONSeq + OSM type/id attributes (needed for stable stop IDs).
  // Avoid loading a giant FeatureCollection JSON into Node.
  runOsmium([
    "export",
    "-f",
    "geojsonseq",
    "-a",
    "type,id",
    "-o",
    seqPath,
    "--overwrite",
    exportInput,
  ]);

  const features: Feature[] = [];
  const rl = readline.createInterface({
    input: createReadStream(seqPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    // RFC 8142 GeoJSON Text Sequences may prefix each record with RS (0x1E).
    let trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.charCodeAt(0) === 0x1e) trimmed = trimmed.slice(1).trim();
    if (!trimmed.startsWith("{")) continue;
    const feat = JSON.parse(trimmed) as Feature;
    const mapped = osmiumFeatureToHuntly(feat);
    if (mapped) features.push(mapped);
  }

  features.sort((a, b) => {
    const aid = String((a.properties as { id?: string }).id ?? "");
    const bid = String((b.properties as { id?: string }).id ?? "");
    return aid.localeCompare(bid);
  });

  const collection: FeatureCollection = { type: "FeatureCollection", features };
  fs.writeFileSync(geojsonPath, JSON.stringify(collection));
  return { geojsonPath, featureCount: features.length, collection };
}
