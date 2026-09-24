/**
 * Download OSM extracts via Overpass for offline catalogue generation.
 *
 * Default: Sneyd Green test bbox → fixtures/local/stoke-sneyd-green.geojson
 * Region:  npm run prepare:osm -- --region stoke-on-trent
 *          → fixtures/local/stoke-on-trent.geojson (tiled fetch for large areas)
 *
 * Generation never hits the network — only this prepare step does.
 */
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_CONFIG,
  DEFAULT_TEST_AREA_LABEL,
  EXPLORE_PACKAGE_ROOT,
  LOCAL_OSM_GEOJSON_PATH,
  mergeConfig,
} from "./config.js";
import { loadRegionConfig } from "./generate-catalogue.js";
import { buildOverpassQuery, overpassToGeoJson } from "./overpass-to-geojson.js";
import type { Feature, FeatureCollection } from "geojson";
import type { OsmLikeProperties } from "./types.js";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

type BBox = {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
};

function parseArgs(argv: string[]) {
  let region: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region" && argv[i + 1]) region = argv[++i];
  }
  return { region };
}

/** Split a bbox into a grid so Overpass requests stay within public API limits. */
function tileBbox(bbox: BBox, maxSpanDegrees = 0.04): BBox[] {
  const tiles: BBox[] = [];
  const latSteps = Math.max(
    1,
    Math.ceil((bbox.maxLatitude - bbox.minLatitude) / maxSpanDegrees)
  );
  const lonSteps = Math.max(
    1,
    Math.ceil((bbox.maxLongitude - bbox.minLongitude) / maxSpanDegrees)
  );
  const dLat = (bbox.maxLatitude - bbox.minLatitude) / latSteps;
  const dLon = (bbox.maxLongitude - bbox.minLongitude) / lonSteps;
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

async function fetchOverpass(query: string, attempt = 0): Promise<unknown> {
  let lastError: Error | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 240_000);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": "HuntlyWorldExploreStopGenerator/0.1 (catalogue-prepare; offline)",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        lastError = new Error(`Overpass HTTP ${res.status} from ${endpoint}`);
        continue;
      }
      return await res.json();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  if (attempt < 2) {
    const waitMs = 15_000 * (attempt + 1);
    console.warn(`Retry in ${waitMs / 1000}s… (${lastError?.message ?? "error"})`);
    await new Promise((r) => setTimeout(r, waitMs));
    return fetchOverpass(query, attempt + 1);
  }
  throw new Error(
    `Failed to download OSM extract.\nLast error: ${lastError?.message ?? "unknown"}`
  );
}

function mergeFeatureCollections(parts: FeatureCollection[]): FeatureCollection {
  const byId = new Map<string, Feature>();
  for (const fc of parts) {
    for (const f of fc.features) {
      const id = String((f.properties as OsmLikeProperties | null)?.id ?? "");
      if (!id) continue;
      if (!byId.has(id)) byId.set(id, f);
    }
  }
  const features = [...byId.values()].sort((a, b) => {
    const aid = String((a.properties as OsmLikeProperties).id);
    const bid = String((b.properties as OsmLikeProperties).id);
    return aid.localeCompare(bid);
  });
  return { type: "FeatureCollection", features };
}

async function downloadBbox(bbox: BBox, label: string): Promise<FeatureCollection> {
  const tiles = tileBbox(bbox);
  console.log(`${label}: ${tiles.length} Overpass tile(s)`);
  const parts: FeatureCollection[] = [];
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]!;
    console.log(
      `  [${i + 1}/${tiles.length}] ${tile.minLatitude.toFixed(4)},${tile.minLongitude.toFixed(4)} → ${tile.maxLatitude.toFixed(4)},${tile.maxLongitude.toFixed(4)}`
    );
    const query = buildOverpassQuery(tile);
    const raw = await fetchOverpass(query);
    const geojson = overpassToGeoJson(raw as Parameters<typeof overpassToGeoJson>[0]);
    console.log(`      features=${geojson.features.length}`);
    parts.push(geojson);
    // Be polite to public Overpass
    if (i < tiles.length - 1) await new Promise((r) => setTimeout(r, 2000));
  }
  return mergeFeatureCollections(parts);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let bbox: BBox;
  let outPath: string;
  let name: string;
  let label: string;

  if (args.region) {
    const region = loadRegionConfig(args.region);
    bbox = {
      minLatitude: region.bounding_box.min_latitude,
      minLongitude: region.bounding_box.min_longitude,
      maxLatitude: region.bounding_box.max_latitude,
      maxLongitude: region.bounding_box.max_longitude,
    };
    outPath = path.isAbsolute(region.source_geojson)
      ? region.source_geojson
      : path.join(EXPLORE_PACKAGE_ROOT, region.source_geojson);
    name = `${region.region_id}-osm`;
    label = region.name;
  } else {
    const config = mergeConfig();
    bbox = {
      minLatitude: config.minLatitude,
      minLongitude: config.minLongitude,
      maxLatitude: config.maxLatitude,
      maxLongitude: config.maxLongitude,
    };
    outPath = LOCAL_OSM_GEOJSON_PATH;
    name = "stoke-sneyd-green-osm";
    label = DEFAULT_TEST_AREA_LABEL;
  }

  console.log(label);
  console.log(
    `BBox: [${bbox.minLatitude}, ${bbox.minLongitude}] → [${bbox.maxLatitude}, ${bbox.maxLongitude}]`
  );
  console.log("Downloading OpenStreetMap data via Overpass (offline prepare)…");
  console.log("Data © OpenStreetMap contributors — ODbL: https://www.openstreetmap.org/copyright");

  const geojson = await downloadBbox(bbox, label);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const payload = {
    type: "FeatureCollection" as const,
    name,
    licence: "ODbL",
    attribution: "© OpenStreetMap contributors",
    attribution_url: "https://www.openstreetmap.org/copyright",
    generated_at: new Date().toISOString(),
    bbox: [bbox.minLongitude, bbox.minLatitude, bbox.maxLongitude, bbox.maxLatitude],
    generation_version: DEFAULT_CONFIG.generationVersion,
    features: geojson.features,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload));
  console.log(`Wrote ${outPath}`);
  console.log(`Features: ${geojson.features.length}`);
  if (args.region) {
    console.log(`Next: npm run generate:catalogue -- --region ${args.region}`);
  } else {
    console.log("Next: npm run generate");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
