/**
 * Stoke catalogue parity: PBF bbox extract vs validated GeoJSON catalogue (Step 10.4).
 *
 * Uses the same tiled generate + global spacing path as `generate-catalogue.ts`
 * so runtime stays tractable and comparison is fair.
 *
 * Usage:
 *   npm run parity:stoke -- --region uk-and-ireland
 *
 * Does not mutate hosted data. Writes a report under output/catalogues/parity/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXPLORE_PACKAGE_ROOT, mergeConfig } from "./config.js";
import {
  applyCatalogueSpacing,
  filterCollectionToBbox,
  loadRegionConfig,
  splitBboxIntoTiles,
  type CatalogueFile,
} from "./generate-catalogue.js";
import { generateStops } from "./generate-stops.js";
import { pointTypeFromSourceType } from "./point-types.js";
import { haversineMeters } from "./safety-rules.js";
import type { AcceptedStop } from "./types.js";
import {
  exportBboxToHuntlyGeoJson,
  findPinnedSourcePbf,
  resolveWorkingPbf,
} from "./national/export-bbox.js";

function parseArgs(argv: string[]) {
  let region = "uk-and-ireland";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
  }
  return { region };
}

function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}

function expandBboxMeters(
  bbox: {
    minLatitude: number;
    minLongitude: number;
    maxLatitude: number;
    maxLongitude: number;
  },
  metres: number
) {
  const midLat = (bbox.minLatitude + bbox.maxLatitude) / 2;
  const dLat = metres / 111_320;
  const dLon = metres / (111_320 * Math.cos((midLat * Math.PI) / 180));
  return {
    minLatitude: bbox.minLatitude - dLat,
    maxLatitude: bbox.maxLatitude + dLat,
    minLongitude: bbox.minLongitude - dLon,
    maxLongitude: bbox.maxLongitude + dLon,
  };
}

function pointInTile(
  lat: number,
  lon: number,
  tile: { minLatitude: number; minLongitude: number; maxLatitude: number; maxLongitude: number }
) {
  return (
    lat >= tile.minLatitude &&
    lat <= tile.maxLatitude &&
    lon >= tile.minLongitude &&
    lon <= tile.maxLongitude
  );
}

function minNearestNeighbour(points: Array<{ latitude: number; longitude: number }>): number | null {
  if (points.length < 2) return null;
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      min = Math.min(min, haversineMeters(points[i]!, points[j]!));
    }
  }
  return Math.round(min * 10) / 10;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const national = loadRegionConfig(args.region) as ReturnType<typeof loadRegionConfig> & {
    source_pbf_dir?: string;
  };
  const stoke = loadRegionConfig("stoke-on-trent");
  const cataloguePath = path.join(EXPLORE_PACKAGE_ROOT, stoke.output_dir, "catalogue.json");
  if (!fs.existsSync(cataloguePath)) {
    throw new Error(`Missing Stoke catalogue: ${cataloguePath}`);
  }
  const expected = JSON.parse(fs.readFileSync(cataloguePath, "utf8")) as CatalogueFile;

  const pinned = findPinnedSourcePbf(
    national.source_pbf_dir ?? "data/osm/geofabrik/britain-and-ireland"
  );
  const workingPbf = resolveWorkingPbf(pinned.revDir, pinned.pbf);
  console.log(`PBF: ${workingPbf}`);
  console.log(`Expected Stoke points: ${expected.point_count}`);

  const workDir = path.join(EXPLORE_PACKAGE_ROOT, "data/osm/work/parity-stoke");
  const bbox = {
    minLatitude: stoke.bounding_box.min_latitude,
    minLongitude: stoke.bounding_box.min_longitude,
    maxLatitude: stoke.bounding_box.max_latitude,
    maxLongitude: stoke.bounding_box.max_longitude,
  };

  const t0 = Date.now();
  const exported = await exportBboxToHuntlyGeoJson({
    sourcePbf: workingPbf,
    bbox,
    workDir,
    label: "stoke-parity",
    padMetres: 400,
  });
  console.log(`Exported features: ${exported.featureCount} in ${Date.now() - t0}ms`);

  const tiles = splitBboxIntoTiles(bbox);
  console.log(`Generating on ${tiles.length} tiles (0.02° + 400 m pad)…`);

  const rejectionCounts: Record<string, number> = {};
  const preSpacing: AcceptedStop[] = [];
  const t1 = Date.now();

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]!;
    const padded = expandBboxMeters(tile, 400);
    const slice = filterCollectionToBbox(exported.collection, padded);
    const config = mergeConfig({
      sourceGeoJsonPath: exported.geojsonPath,
      minLatitude: tile.minLatitude,
      minLongitude: tile.minLongitude,
      maxLatitude: tile.maxLatitude,
      maxLongitude: tile.maxLongitude,
      generationVersion: stoke.generation_version,
    });
    const result = generateStops(slice, config);
    for (const [reason, count] of Object.entries(result.summary.rejectionCountsByReason)) {
      rejectionCounts[reason] = (rejectionCounts[reason] ?? 0) + count;
    }
    for (const s of result.accepted) {
      if (pointInTile(s.latitude, s.longitude, tile)) preSpacing.push(s);
    }
    if ((i + 1) % 10 === 0 || i === tiles.length - 1) {
      console.log(`  tile ${i + 1}/${tiles.length} preSpacing=${preSpacing.length}`);
    }
  }

  const spaced = applyCatalogueSpacing(preSpacing, 150);
  const genMs = Date.now() - t1;

  const actualPoints = spaced
    .map((s) => {
      const type = pointTypeFromSourceType(s.sourceType);
      if (type == null) return null;
      return {
        id: s.stopId,
        latitude: s.latitude,
        longitude: s.longitude,
        type,
        source_type: s.sourceType,
        environment_profile: s.environmentProfile as Record<string, number>,
        confidence: s.confidence,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    latitude: number;
    longitude: number;
    type: number;
    source_type: string;
    environment_profile: Record<string, number>;
    confidence: number;
  }>;

  const expById = new Map(expected.points.map((p) => [p.id, p]));
  const actById = new Map(actualPoints.map((p) => [p.id, p]));

  const onlyExpected: string[] = [];
  const onlyActual: string[] = [];
  const coordMismatch: string[] = [];
  const typeMismatch: string[] = [];
  const sourceMismatch: string[] = [];
  const envMismatch: string[] = [];
  let matched = 0;

  for (const id of expById.keys()) {
    if (!actById.has(id)) onlyExpected.push(id);
  }
  for (const id of actById.keys()) {
    if (!expById.has(id)) onlyActual.push(id);
  }
  for (const [id, exp] of expById) {
    const act = actById.get(id);
    if (!act) continue;
    matched += 1;
    if (round6(act.latitude) !== round6(exp.latitude) || round6(act.longitude) !== round6(exp.longitude)) {
      coordMismatch.push(id);
    }
    if (act.type !== exp.type) typeMismatch.push(id);
    if (act.source_type !== exp.source_type) sourceMismatch.push(id);
    if (JSON.stringify(act.environment_profile) !== JSON.stringify(exp.environment_profile)) {
      envMismatch.push(id);
    }
  }

  const idJaccard =
    matched / Math.max(1, new Set([...expById.keys(), ...actById.keys()]).size);

  const byType = (pts: Array<{ type: number }>) => {
    const m: Record<string, number> = {};
    for (const p of pts) m[String(p.type)] = (m[String(p.type)] ?? 0) + 1;
    return m;
  };
  const bySource = (pts: Array<{ source_type: string }>) => {
    const m: Record<string, number> = {};
    for (const p of pts) m[p.source_type] = (m[p.source_type] ?? 0) + 1;
    return m;
  };

  const minSpacing = minNearestNeighbour(actualPoints);
  const spacingOk = minSpacing == null || minSpacing >= 149.5;

  const countRatio = actualPoints.length / Math.max(1, expected.point_count);
  const hardFail =
    actualPoints.length === 0 ||
    countRatio < 0.5 ||
    countRatio > 2.0 ||
    matched === 0 ||
    !spacingOk;

  const report = {
    ok: !hardFail,
    soft_warnings: idJaccard < 0.85 || onlyExpected.length + onlyActual.length > 0,
    pbf: workingPbf,
    pbf_sha256: pinned.meta.sha256,
    export_features: exported.featureCount,
    generate_ms: genMs,
    tile_count: tiles.length,
    expected_count: expected.point_count,
    actual_count: actualPoints.length,
    pre_spacing_count: preSpacing.length,
    count_ratio: Math.round(countRatio * 1000) / 1000,
    matched_ids: matched,
    id_jaccard: Math.round(idJaccard * 1000) / 1000,
    only_in_expected_sample: onlyExpected.slice(0, 20),
    only_in_actual_sample: onlyActual.slice(0, 20),
    only_in_expected_count: onlyExpected.length,
    only_in_actual_count: onlyActual.length,
    coord_mismatch_count: coordMismatch.length,
    type_mismatch_count: typeMismatch.length,
    source_mismatch_count: sourceMismatch.length,
    env_mismatch_count: envMismatch.length,
    expected_points_by_type: expected.points_by_type,
    actual_points_by_type: byType(actualPoints),
    actual_points_by_source_type: bySource(actualPoints),
    safety_rejection_counts: rejectionCounts,
    minimum_spacing_metres: minSpacing,
    spacing_ok: spacingOk,
    notes: [
      "PBF Geofabrik revision differs from Overpass Stoke extract — some ID drift is expected.",
      "Parity uses the same 0.02° tile + 400 m pad + global 150 m spacing as city generate.",
      "Hard fail if count ratio outside 0.5–2.0, zero matches, or min spacing < 150 m.",
    ],
  };

  const outDir = path.join(EXPLORE_PACKAGE_ROOT, "output/catalogues/parity");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "stoke-pbf-parity.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`Wrote ${outPath}`);
  if (hardFail) process.exit(1);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
