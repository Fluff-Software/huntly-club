/**
 * Canonical compact OSM source tile JSON for Supabase Storage.
 */
import type { Feature, FeatureCollection, Geometry } from "npm:@types/geojson@7946.0.16";
import {
  ACTIVE_OSM_REVISION,
  OSM_ATTRIBUTION,
  OSM_ATTRIBUTION_URL,
  OSM_LICENCE,
  TILE_FORMAT_VERSION,
  TILE_SCHEME,
  TILE_ZOOM,
} from "./config.ts";
import { filterOsmProperties } from "./property-allowlist.ts";
import { tileBounds, tileKey, type BoundingBox, type TileId } from "./tiles.ts";

export type CanonicalTile = {
  format_version: number;
  revision: string;
  tile: { z: number; x: number; y: number; id: string };
  scheme: typeof TILE_SCHEME;
  bounds: {
    min_latitude: number;
    min_longitude: number;
    max_latitude: number;
    max_longitude: number;
  };
  attribution: string;
  attribution_url: string;
  licence: string;
  source_provider: string;
  source_timestamp: string | null;
  created_at: string;
  feature_count: number;
  type: "FeatureCollection";
  features: Feature[];
};

export type RevisionManifest = {
  active_revision: string;
  tile_scheme: typeof TILE_SCHEME;
  tile_zoom: number;
  generator_version: number;
  source_provider: string;
  attribution: string;
  attribution_url: string;
  licence: string;
  format_version: number;
  created_at: string;
};

function stableStringifyValue(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringifyValue(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringifyValue(obj[k])}`).join(",")}}`;
}

/** Deterministic minified JSON (sorted object keys recursively). */
export function stableStringify(value: unknown): string {
  return stableStringifyValue(value);
}

function isValidGeometry(g: Geometry | null | undefined): g is Geometry {
  if (!g || typeof g !== "object") return false;
  return (
    g.type === "Point" ||
    g.type === "LineString" ||
    g.type === "Polygon" ||
    g.type === "MultiPoint" ||
    g.type === "MultiLineString" ||
    g.type === "MultiPolygon" ||
    g.type === "GeometryCollection"
  );
}

function featureStableId(f: Feature, index: number): string {
  const props = f.properties ?? {};
  const id = props.id;
  if (typeof id === "string" && id.trim()) return id.trim();
  if (typeof f.id === "string" || typeof f.id === "number") return String(f.id);
  return `generated/${index}`;
}

/**
 * Build a canonical tile from raw GeoJSON features for one slippy tile.
 * Deduplicates by stable feature id; sorts features for deterministic output.
 */
export function buildCanonicalTile(opts: {
  tile: TileId;
  revision?: string;
  features: Feature[];
  sourceProvider: string;
  sourceTimestamp?: string | null;
  createdAt?: string;
}): CanonicalTile {
  const revision = opts.revision ?? ACTIVE_OSM_REVISION;
  const bounds = tileBounds(opts.tile);
  const byId = new Map<string, Feature>();

  opts.features.forEach((raw, index) => {
    if (!raw || raw.type !== "Feature") return;
    if (!isValidGeometry(raw.geometry)) return;
    const id = featureStableId(raw, index);
    const props = filterOsmProperties({
      ...(raw.properties ?? {}),
      id,
    });
    const feature: Feature = {
      type: "Feature",
      id,
      properties: props,
      geometry: raw.geometry,
    };
    // First wins for stable deterministic merge within a tile.
    if (!byId.has(id)) byId.set(id, feature);
  });

  const features = [...byId.values()].sort((a, b) => {
    const idA = String((a.properties as { id?: string })?.id ?? a.id ?? "");
    const idB = String((b.properties as { id?: string })?.id ?? b.id ?? "");
    return idA.localeCompare(idB);
  });

  return {
    format_version: TILE_FORMAT_VERSION,
    revision,
    tile: {
      z: opts.tile.z,
      x: opts.tile.x,
      y: opts.tile.y,
      id: tileKey(opts.tile),
    },
    scheme: TILE_SCHEME,
    bounds: {
      min_latitude: bounds.minLatitude,
      min_longitude: bounds.minLongitude,
      max_latitude: bounds.maxLatitude,
      max_longitude: bounds.maxLongitude,
    },
    attribution: OSM_ATTRIBUTION,
    attribution_url: OSM_ATTRIBUTION_URL,
    licence: OSM_LICENCE,
    source_provider: opts.sourceProvider,
    source_timestamp: opts.sourceTimestamp ?? null,
    created_at: opts.createdAt ?? new Date().toISOString(),
    feature_count: features.length,
    type: "FeatureCollection",
    features,
  };
}

export function buildRevisionManifest(opts: {
  revision?: string;
  generatorVersion: number;
  sourceProvider: string;
  createdAt?: string;
}): RevisionManifest {
  return {
    active_revision: opts.revision ?? ACTIVE_OSM_REVISION,
    tile_scheme: TILE_SCHEME,
    tile_zoom: TILE_ZOOM,
    generator_version: opts.generatorVersion,
    source_provider: opts.sourceProvider,
    attribution: OSM_ATTRIBUTION,
    attribution_url: OSM_ATTRIBUTION_URL,
    licence: OSM_LICENCE,
    format_version: TILE_FORMAT_VERSION,
    created_at: opts.createdAt ?? new Date().toISOString(),
  };
}

export type TileValidationResult =
  | { ok: true; tile: CanonicalTile }
  | { ok: false; error: string; tileId?: string };

export function validateCanonicalTile(raw: unknown): TileValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "tile_not_object" };
  }
  const t = raw as Record<string, unknown>;
  if (t.type !== "FeatureCollection" || !Array.isArray(t.features)) {
    return { ok: false, error: "tile_not_feature_collection" };
  }
  if (typeof t.format_version !== "number" || typeof t.revision !== "string") {
    return { ok: false, error: "tile_missing_metadata" };
  }
  const tileMeta = t.tile as Record<string, unknown> | undefined;
  if (
    !tileMeta ||
    typeof tileMeta.z !== "number" ||
    typeof tileMeta.x !== "number" ||
    typeof tileMeta.y !== "number"
  ) {
    return { ok: false, error: "tile_missing_id" };
  }
  const tileId = `${tileMeta.z}/${tileMeta.x}/${tileMeta.y}`;

  const seen = new Set<string>();
  for (let i = 0; i < t.features.length; i++) {
    const f = t.features[i] as Feature;
    if (!f || f.type !== "Feature" || !isValidGeometry(f.geometry)) {
      return { ok: false, error: "tile_invalid_feature", tileId };
    }
    const id = featureStableId(f, i);
    if (seen.has(id)) {
      return { ok: false, error: "tile_duplicate_feature_id", tileId };
    }
    seen.add(id);
  }

  return { ok: true, tile: raw as CanonicalTile };
}

export function canonicalTileToFeatureCollection(tile: CanonicalTile): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: tile.features,
  };
}

export function mergeTiles(tiles: CanonicalTile[]): FeatureCollection {
  const byId = new Map<string, Feature>();
  for (const tile of tiles) {
    for (let i = 0; i < tile.features.length; i++) {
      const f = tile.features[i]!;
      const id = featureStableId(f, i);
      if (!byId.has(id)) byId.set(id, f);
    }
  }
  const features = [...byId.values()].sort((a, b) => {
    const idA = String((a.properties as { id?: string })?.id ?? "");
    const idB = String((b.properties as { id?: string })?.id ?? "");
    return idA.localeCompare(idB);
  });
  return { type: "FeatureCollection", features };
}

export function boundsFromTileMeta(tile: CanonicalTile): BoundingBox {
  return {
    minLatitude: tile.bounds.min_latitude,
    minLongitude: tile.bounds.min_longitude,
    maxLatitude: tile.bounds.max_latitude,
    maxLongitude: tile.bounds.max_longitude,
  };
}
