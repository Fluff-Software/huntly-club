/**
 * OSM extract revision metadata for health / diagnostics.
 * Does not expose absolute filesystem paths in API responses.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_CONFIG, DEFAULT_TEST_AREA_LABEL, EXPLORE_PACKAGE_ROOT } from "../config.js";

const META_PATH = path.join(EXPLORE_PACKAGE_ROOT, "fixtures", "osm-data-revision.json");

export type OsmDataRevisionMeta = {
  region_id: string;
  region_label: string;
  bounding_box: {
    min_latitude: number;
    min_longitude: number;
    max_latitude: number;
    max_longitude: number;
  };
  prepared_at: string | null;
  osm_snapshot_at: string | null;
  osm_data_revision: string;
  file_sha256: string | null;
  generator_version: number;
  licence: string;
  attribution: string;
  source_file_name: string;
  available: boolean;
};

const DEFAULT_META = {
  region_id: "stoke-sneyd-green",
  region_label: DEFAULT_TEST_AREA_LABEL,
  bounding_box: {
    min_latitude: DEFAULT_CONFIG.minLatitude,
    min_longitude: DEFAULT_CONFIG.minLongitude,
    max_latitude: DEFAULT_CONFIG.maxLatitude,
    max_longitude: DEFAULT_CONFIG.maxLongitude,
  },
  prepared_at: null as string | null,
  osm_snapshot_at: null as string | null,
  osm_data_revision: "unknown",
  generator_version: DEFAULT_CONFIG.generationVersion,
  licence: "ODbL 1.0",
  attribution: "© OpenStreetMap contributors",
  source_file_name: "stoke-sneyd-green.geojson",
};

export function sha256File(filePath: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function loadOsmRevisionMeta(osmDataPath: string): OsmDataRevisionMeta {
  let fileMeta: Partial<typeof DEFAULT_META> = {};
  if (fs.existsSync(META_PATH)) {
    try {
      fileMeta = JSON.parse(fs.readFileSync(META_PATH, "utf8")) as Partial<typeof DEFAULT_META>;
    } catch {
      fileMeta = {};
    }
  }

  const available = fs.existsSync(osmDataPath);
  let fileSha: string | null = null;
  if (available) {
    try {
      fileSha = sha256File(osmDataPath);
    } catch {
      fileSha = null;
    }
  }

  return {
    region_id: fileMeta.region_id ?? DEFAULT_META.region_id,
    region_label: fileMeta.region_label ?? DEFAULT_META.region_label,
    bounding_box: fileMeta.bounding_box ?? DEFAULT_META.bounding_box,
    prepared_at: fileMeta.prepared_at ?? null,
    osm_snapshot_at: fileMeta.osm_snapshot_at ?? null,
    osm_data_revision: fileMeta.osm_data_revision ?? DEFAULT_META.osm_data_revision,
    file_sha256: fileSha,
    generator_version: fileMeta.generator_version ?? DEFAULT_META.generator_version,
    licence: fileMeta.licence ?? DEFAULT_META.licence,
    attribution: fileMeta.attribution ?? DEFAULT_META.attribution,
    source_file_name: path.basename(osmDataPath),
    available,
  };
}
