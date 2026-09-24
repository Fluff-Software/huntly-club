/**
 * Offline Explore catalogue generation (Step 10.3).
 * Never called from Edge / user-facing nearby.
 *
 * Large regions are generated in spatial tiles so safety checks stay tractable
 * (full-city linear scans over tens of thousands of OSM features are too slow).
 *
 * Usage:
 *   npm run generate:catalogue -- --region stoke-on-trent
 *   npm run generate:catalogue -- --region stoke-on-trent --fixture
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXPLORE_PACKAGE_ROOT, mergeConfig, SYNTHETIC_FIXTURE_PATH } from "./config.js";
import { generateStops } from "./generate-stops.js";
import { pointTypeFromSourceType } from "./point-types.js";
import { haversineMeters } from "./safety-rules.js";
import type { AcceptedStop } from "./types.js";
import type { Feature, FeatureCollection as GjFC, Position } from "geojson";

/** ~2.2 km tiles — similar scale to the original Sneyd extract. */
const CATALOGUE_TILE_SPAN_DEGREES = 0.02;
/** Extra OSM context around each tile (hazards / environment). */
const CATALOGUE_TILE_PAD_METERS = 400;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type CatalogueRegionConfig = {
  region_id: string;
  name: string;
  notes?: string;
  bounding_box: {
    min_latitude: number;
    min_longitude: number;
    max_latitude: number;
    max_longitude: number;
  };
  source_geojson: string;
  source_revision: string;
  generation_version: number;
  output_dir: string;
  attribution: string;
  licence: string;
  attribution_url?: string;
};

export type CataloguePoint = {
  id: string;
  latitude: number;
  longitude: number;
  type: number;
  source_type: string;
  generation_version: number;
  source_revision: string;
  source_feature_id: string;
  confidence: number;
  environment_profile: Record<string, number>;
};

export type CatalogueFile = {
  region_id: string;
  name: string;
  source_revision: string;
  generation_version: number;
  generated_at: string;
  attribution: string;
  licence: string;
  bounding_box: CatalogueRegionConfig["bounding_box"];
  coverage_km2: number;
  point_count: number;
  points_by_type: Record<string, number>;
  points: CataloguePoint[];
};

function parseArgs(argv: string[]) {
  let region = "stoke-on-trent";
  let fixture = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i]!;
    else if (argv[i] === "--fixture") fixture = true;
  }
  return { region, fixture };
}

export function loadRegionConfig(regionId: string): CatalogueRegionConfig {
  const p = path.join(EXPLORE_PACKAGE_ROOT, "catalogues", `${regionId}.json`);
  if (!fs.existsSync(p)) {
    throw new Error(`Region config not found: ${p}`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as CatalogueRegionConfig;
}

export function bboxAreaKm2(bbox: CatalogueRegionConfig["bounding_box"]): number {
  const midLat = (bbox.min_latitude + bbox.max_latitude) / 2;
  const heightM = haversineMeters(
    { latitude: bbox.min_latitude, longitude: bbox.min_longitude },
    { latitude: bbox.max_latitude, longitude: bbox.min_longitude }
  );
  const widthM = haversineMeters(
    { latitude: midLat, longitude: bbox.min_longitude },
    { latitude: midLat, longitude: bbox.max_longitude }
  );
  return (heightM * widthM) / 1_000_000;
}

type LonLatBBox = {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
};

function expandBboxMeters(bbox: LonLatBBox, metres: number): LonLatBBox {
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

export function splitBboxIntoTiles(
  bbox: LonLatBBox,
  spanDegrees = CATALOGUE_TILE_SPAN_DEGREES
): LonLatBBox[] {
  const latSteps = Math.max(1, Math.ceil((bbox.maxLatitude - bbox.minLatitude) / spanDegrees));
  const lonSteps = Math.max(1, Math.ceil((bbox.maxLongitude - bbox.minLongitude) / spanDegrees));
  const dLat = (bbox.maxLatitude - bbox.minLatitude) / latSteps;
  const dLon = (bbox.maxLongitude - bbox.minLongitude) / lonSteps;
  const tiles: LonLatBBox[] = [];
  for (let i = 0; i < latSteps; i++) {
    for (let j = 0; j < lonSteps; j++) {
      tiles.push({
        minLatitude: bbox.minLatitude + i * dLat,
        maxLatitude: i === latSteps - 1 ? bbox.maxLatitude : bbox.minLatitude + (i + 1) * dLat,
        minLongitude: bbox.minLongitude + j * dLon,
        maxLongitude: j === lonSteps - 1 ? bbox.maxLongitude : bbox.minLongitude + (j + 1) * dLon,
      });
    }
  }
  return tiles;
}

function walkCoords(coords: Position | Position[] | Position[][] | Position[][][], visit: (c: Position) => void) {
  if (typeof coords[0] === "number") {
    visit(coords as Position);
    return;
  }
  for (const c of coords as Array<Position | Position[] | Position[][]>) {
    walkCoords(c, visit);
  }
}

export function featureEnvelope(feature: Feature): LonLatBBox | null {
  const g = feature.geometry;
  if (!g || g.type === "GeometryCollection") return null;
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  walkCoords(g.coordinates as Position | Position[] | Position[][] | Position[][][], (c) => {
    const lon = c[0]!;
    const lat = c[1]!;
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  });
  if (!Number.isFinite(minLon)) return null;
  return {
    minLatitude: minLat,
    minLongitude: minLon,
    maxLatitude: maxLat,
    maxLongitude: maxLon,
  };
}

function bboxesOverlap(a: LonLatBBox, b: LonLatBBox): boolean {
  return !(
    a.maxLatitude < b.minLatitude ||
    a.minLatitude > b.maxLatitude ||
    a.maxLongitude < b.minLongitude ||
    a.minLongitude > b.maxLongitude
  );
}

export function filterCollectionToBbox(collection: GjFC, bbox: LonLatBBox): GjFC {
  return {
    type: "FeatureCollection",
    features: collection.features.filter((f) => {
      const env = featureEnvelope(f);
      return env != null && bboxesOverlap(env, bbox);
    }),
  };
}

function pointInLonLatBbox(lat: number, lon: number, bbox: LonLatBBox): boolean {
  return (
    lat >= bbox.minLatitude &&
    lat <= bbox.maxLatitude &&
    lon >= bbox.minLongitude &&
    lon <= bbox.maxLongitude
  );
}

/** Deterministic global min-spacing after tiled generation. */
export function applyCatalogueSpacing(
  stops: AcceptedStop[],
  minimumStopSpacingMeters: number
): AcceptedStop[] {
  const ranked = [...stops].sort((a, b) => {
    if (a.priorityKey !== b.priorityKey) return a.priorityKey < b.priorityKey ? -1 : 1;
    return a.stopId < b.stopId ? -1 : a.stopId > b.stopId ? 1 : 0;
  });
  const kept: AcceptedStop[] = [];
  for (const stop of ranked) {
    const tooClose = kept.some(
      (k) => haversineMeters(stop, k) < minimumStopSpacingMeters
    );
    if (!tooClose) kept.push(stop);
  }
  kept.sort((a, b) => (a.stopId < b.stopId ? -1 : a.stopId > b.stopId ? 1 : 0));
  return kept;
}

export function acceptedToCataloguePoint(
  stop: AcceptedStop,
  sourceRevision: string
): CataloguePoint | null {
  const type = pointTypeFromSourceType(stop.sourceType);
  if (type == null) return null;
  return {
    id: stop.stopId,
    latitude: stop.latitude,
    longitude: stop.longitude,
    type,
    source_type: stop.sourceType,
    generation_version: stop.generationVersion,
    source_revision: sourceRevision,
    source_feature_id: stop.sourceFeatureId,
    confidence: stop.confidence,
    environment_profile: stop.environmentProfile as Record<string, number>,
  };
}

export function buildCatalogueFromAccepted(
  region: CatalogueRegionConfig,
  accepted: AcceptedStop[]
): CatalogueFile {
  const points: CataloguePoint[] = [];
  const byType: Record<string, number> = {};
  const seen = new Set<string>();

  for (const stop of accepted) {
    const pt = acceptedToCataloguePoint(stop, region.source_revision);
    if (!pt) continue;
    if (seen.has(pt.id)) continue;
    seen.add(pt.id);
    points.push(pt);
    const key = String(pt.type);
    byType[key] = (byType[key] ?? 0) + 1;
  }

  points.sort((a, b) => a.id.localeCompare(b.id));

  return {
    region_id: region.region_id,
    name: region.name,
    source_revision: region.source_revision,
    generation_version: region.generation_version,
    generated_at: new Date().toISOString(),
    attribution: region.attribution,
    licence: region.licence,
    bounding_box: region.bounding_box,
    coverage_km2: Math.round(bboxAreaKm2(region.bounding_box) * 1000) / 1000,
    point_count: points.length,
    points_by_type: byType,
    points,
  };
}

export function generateCatalogueForRegion(
  region: CatalogueRegionConfig,
  opts?: { fixture?: boolean; onTileProgress?: (done: number, total: number) => void }
): { catalogue: CatalogueFile; candidateAccepted: number; rejected: number } {
  const sourcePath = opts?.fixture
    ? SYNTHETIC_FIXTURE_PATH
    : path.isAbsolute(region.source_geojson)
      ? region.source_geojson
      : path.join(EXPLORE_PACKAGE_ROOT, region.source_geojson);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(
      `OSM source not found: ${sourcePath}. Run npm run prepare:osm or pass --fixture.`
    );
  }

  const collection = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as GjFC;
  const regionBbox: LonLatBBox = {
    minLatitude: region.bounding_box.min_latitude,
    minLongitude: region.bounding_box.min_longitude,
    maxLatitude: region.bounding_box.max_latitude,
    maxLongitude: region.bounding_box.max_longitude,
  };

  const tiles = splitBboxIntoTiles(regionBbox);
  const baseConfig = mergeConfig({
    sourceGeoJsonPath: sourcePath,
    minLatitude: regionBbox.minLatitude,
    minLongitude: regionBbox.minLongitude,
    maxLatitude: regionBbox.maxLatitude,
    maxLongitude: regionBbox.maxLongitude,
    generationVersion: region.generation_version,
  });

  const tileAccepted: AcceptedStop[] = [];
  let rejected = 0;

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]!;
    opts?.onTileProgress?.(i + 1, tiles.length);
    const padded = expandBboxMeters(tile, CATALOGUE_TILE_PAD_METERS);
    const slice = filterCollectionToBbox(collection, padded);
    const tileConfig = mergeConfig({
      ...baseConfig,
      minLatitude: tile.minLatitude,
      minLongitude: tile.minLongitude,
      maxLatitude: tile.maxLatitude,
      maxLongitude: tile.maxLongitude,
    });
    const result = generateStops(slice, tileConfig);
    rejected += result.rejected.length;
    for (const stop of result.accepted) {
      if (pointInLonLatBbox(stop.latitude, stop.longitude, tile)) {
        tileAccepted.push(stop);
      }
    }
  }

  // Deduplicate identical stopIds (rare; overlapping feature processing).
  const byId = new Map<string, AcceptedStop>();
  for (const stop of tileAccepted) {
    if (!byId.has(stop.stopId)) byId.set(stop.stopId, stop);
  }

  const spaced = applyCatalogueSpacing(
    [...byId.values()],
    baseConfig.minimumStopSpacingMeters
  );
  const catalogue = buildCatalogueFromAccepted(region, spaced);
  return {
    catalogue,
    candidateAccepted: spaced.length,
    rejected,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const region = loadRegionConfig(args.region) as CatalogueRegionConfig & {
    pipeline?: string;
  };
  if (region.pipeline === "pbf") {
    throw new Error(
      `Region ${region.region_id} uses the Step 10.4 PBF national pipeline.\n` +
        `City GeoJSON generate:catalogue is not supported here yet.\n` +
        `Next: npm run check:pbf-tools && npm run prepare:pbf -- --region ${region.region_id}\n` +
        `Full national generate requires Phase C benchmarks + --confirm-full-run (not implemented in Phase A).`
    );
  }
  console.log(`Generating catalogue for ${region.region_id}…`);
  const { catalogue, candidateAccepted, rejected } = generateCatalogueForRegion(region, {
    fixture: args.fixture,
    onTileProgress: (done, total) => {
      console.log(`  tile ${done}/${total}`);
    },
  });

  const outDir = path.isAbsolute(region.output_dir)
    ? region.output_dir
    : path.join(EXPLORE_PACKAGE_ROOT, region.output_dir);
  fs.mkdirSync(outDir, { recursive: true });

  const cataloguePath = path.join(outDir, "catalogue.json");
  const statsPath = path.join(outDir, "stats.json");
  fs.writeFileSync(cataloguePath, JSON.stringify(catalogue, null, 2));

  const stats = {
    region_id: catalogue.region_id,
    point_count: catalogue.point_count,
    coverage_km2: catalogue.coverage_km2,
    points_per_km2:
      catalogue.coverage_km2 > 0
        ? Math.round((catalogue.point_count / catalogue.coverage_km2) * 100) / 100
        : null,
    points_by_type: catalogue.points_by_type,
    generator_accepted: candidateAccepted,
    generator_rejected: rejected,
    source_revision: catalogue.source_revision,
    generation_version: catalogue.generation_version,
    generated_at: catalogue.generated_at,
  };
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));

  console.log(`Wrote ${cataloguePath}`);
  console.log(`Wrote ${statsPath}`);
  console.log(
    `points=${catalogue.point_count} coverage_km2=${catalogue.coverage_km2} density=${stats.points_per_km2}/km²`
  );
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
