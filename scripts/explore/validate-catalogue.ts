/**
 * Validate a generated Explore catalogue before import.
 *
 * Usage:
 *   npm run validate:catalogue -- --region stoke-on-trent
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXPLORE_PACKAGE_ROOT } from "./config.js";
import {
  loadRegionConfig,
  type CatalogueFile,
  type CataloguePoint,
} from "./generate-catalogue.js";
import { sourceTypeFromPointType } from "./point-types.js";
import { haversineMeters } from "./safety-rules.js";

function parseArgs(argv: string[]) {
  let region = "stoke-on-trent";
  let file: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
    else if (argv[i] === "--file" && argv[i + 1]) file = argv[++i];
  }
  return { region, file };
}

function pointInsideBbox(
  p: CataloguePoint,
  bbox: CatalogueFile["bounding_box"],
  slackDegrees = 0.002
): boolean {
  return (
    p.latitude >= bbox.min_latitude - slackDegrees &&
    p.latitude <= bbox.max_latitude + slackDegrees &&
    p.longitude >= bbox.min_longitude - slackDegrees &&
    p.longitude <= bbox.max_longitude + slackDegrees
  );
}

export type ValidationReport = {
  ok: boolean;
  region_id: string;
  point_count: number;
  errors: string[];
  warnings: string[];
  duplicate_ids: number;
  outside_coverage: number;
  invalid_types: number;
  min_nearest_m: number | null;
  mean_nearest_m: number | null;
  median_nearest_m: number | null;
  below_spacing_150m: number;
  points_by_type: Record<string, number>;
};

export function validateCatalogue(catalogue: CatalogueFile): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  let duplicateIds = 0;
  let outside = 0;
  let invalidTypes = 0;
  const byType: Record<string, number> = {};

  for (const p of catalogue.points) {
    if (seen.has(p.id)) duplicateIds += 1;
    seen.add(p.id);

    if (
      !Number.isFinite(p.latitude) ||
      !Number.isFinite(p.longitude) ||
      p.latitude < -90 ||
      p.latitude > 90 ||
      p.longitude < -180 ||
      p.longitude > 180
    ) {
      errors.push(`invalid_coords:${p.id}`);
    }
    if (!pointInsideBbox(p, catalogue.bounding_box)) outside += 1;
    if (sourceTypeFromPointType(p.type) == null) {
      invalidTypes += 1;
      errors.push(`invalid_type:${p.id}:${p.type}`);
    }
    if (p.generation_version !== catalogue.generation_version) {
      errors.push(`generation_mismatch:${p.id}`);
    }
    byType[String(p.type)] = (byType[String(p.type)] ?? 0) + 1;
  }

  if (duplicateIds > 0) errors.push(`duplicate_ids:${duplicateIds}`);
  if (outside > 0) warnings.push(`outside_coverage_slack:${outside}`);
  if (catalogue.point_count !== catalogue.points.length) {
    errors.push("point_count_mismatch");
  }

  // Nearest-neighbour spacing (O(n²) ok for Stoke-scale catalogues)
  const nearest: number[] = [];
  let belowSpacing = 0;
  for (let i = 0; i < catalogue.points.length; i++) {
    const a = catalogue.points[i]!;
    let best = Infinity;
    for (let j = 0; j < catalogue.points.length; j++) {
      if (i === j) continue;
      const b = catalogue.points[j]!;
      const d = haversineMeters(
        { latitude: a.latitude, longitude: a.longitude },
        { latitude: b.latitude, longitude: b.longitude }
      );
      if (d < best) best = d;
    }
    if (Number.isFinite(best)) {
      nearest.push(best);
      if (best < 150) belowSpacing += 1;
    }
  }
  nearest.sort((a, b) => a - b);
  const mean =
    nearest.length === 0 ? null : nearest.reduce((s, x) => s + x, 0) / nearest.length;
  const median =
    nearest.length === 0
      ? null
      : nearest.length % 2 === 1
        ? nearest[(nearest.length - 1) / 2]!
        : (nearest[nearest.length / 2 - 1]! + nearest[nearest.length / 2]!) / 2;

  if (belowSpacing > 0) {
    warnings.push(`below_150m_spacing:${belowSpacing}`);
  }

  return {
    ok: errors.length === 0,
    region_id: catalogue.region_id,
    point_count: catalogue.points.length,
    errors,
    warnings,
    duplicate_ids: duplicateIds,
    outside_coverage: outside,
    invalid_types: invalidTypes,
    min_nearest_m: nearest[0] ?? null,
    mean_nearest_m: mean == null ? null : Math.round(mean * 10) / 10,
    median_nearest_m: median == null ? null : Math.round(median * 10) / 10,
    below_spacing_150m: belowSpacing,
    points_by_type: byType,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const region = loadRegionConfig(args.region);
  const cataloguePath =
    args.file ??
    path.join(
      EXPLORE_PACKAGE_ROOT,
      region.output_dir,
      "catalogue.json"
    );
  if (!fs.existsSync(cataloguePath)) {
    console.error(`Catalogue not found: ${cataloguePath}. Run generate:catalogue first.`);
    process.exit(1);
  }
  const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8")) as CatalogueFile;
  const report = validateCatalogue(catalogue);
  const outPath = path.join(path.dirname(cataloguePath), "validation.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`Wrote ${outPath}`);
  process.exit(report.ok ? 0 : 1);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) main();
