/**
 * Global Web Mercator slippy-tile scheme for Explore OSM source tiles.
 * Tile IDs are derived only from coordinates — no city/region names.
 */
import { TILE_SCHEME, TILE_ZOOM } from "./config.ts";

export type TileId = {
  z: number;
  x: number;
  y: number;
};

export type LatLon = {
  latitude: number;
  longitude: number;
};

export type BoundingBox = {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
};

const EARTH_CIRCUMFERENCE_METRES = 40_075_016.686;

/** Clamp longitude into [-180, 180). */
export function wrapLongitude(lon: number): number {
  let x = ((((lon + 180) % 360) + 360) % 360) - 180;
  if (x === 180) x = -180;
  return x;
}

export function tileKey(tile: TileId): string {
  return `${tile.z}/${tile.x}/${tile.y}`;
}

export function parseTileKey(key: string): TileId | null {
  const m = /^(\d+)\/(\d+)\/(\d+)$/.exec(key.trim());
  if (!m) return null;
  return { z: Number(m[1]), x: Number(m[2]), y: Number(m[3]) };
}

/** Storage object path under the explore-osm-source bucket. */
export function tileObjectPath(revision: string, tile: TileId): string {
  return `revisions/${revision}/z${tile.z}/${tile.x}/${tile.y}.json`;
}

export function manifestObjectPath(revision: string): string {
  return `revisions/${revision}/manifest.json`;
}

/**
 * Convert WGS84 lat/lon to slippy tile x/y at zoom z.
 * Deterministic across environments (standard Web Mercator).
 */
export function latLonToTile(
  latitude: number,
  longitude: number,
  z: number = TILE_ZOOM
): TileId {
  const lat = Math.min(85.05112878, Math.max(-85.05112878, latitude));
  const lon = wrapLongitude(longitude);
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return {
    z,
    x: Math.min(n - 1, Math.max(0, x)),
    y: Math.min(n - 1, Math.max(0, y)),
  };
}

/** NW corner of tile → SE corner as WGS84 bbox. */
export function tileBounds(tile: TileId): BoundingBox {
  const n = 2 ** tile.z;
  const lonLeft = (tile.x / n) * 360 - 180;
  const lonRight = ((tile.x + 1) / n) * 360 - 180;
  const latTop = tileYToLat(tile.y, n);
  const latBottom = tileYToLat(tile.y + 1, n);
  return {
    minLatitude: Math.min(latBottom, latTop),
    maxLatitude: Math.max(latBottom, latTop),
    minLongitude: Math.min(lonLeft, lonRight),
    maxLongitude: Math.max(lonLeft, lonRight),
  };
}

function tileYToLat(y: number, n: number): number {
  const mercN = Math.PI - (2 * Math.PI * y) / n;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(mercN) - Math.exp(-mercN)));
}

/** Approximate ground width of one tile at a given latitude (metres). */
export function approximateTileWidthMetres(latitude: number, z: number = TILE_ZOOM): number {
  const latRad = (latitude * Math.PI) / 180;
  return (Math.cos(latRad) * EARTH_CIRCUMFERENCE_METRES) / 2 ** z;
}

/**
 * All tiles that intersect a circle of radiusMetres around a point.
 * Uses a conservative bbox + centre-distance check against tile corners/edges.
 */
export function tilesForRadius(
  latitude: number,
  longitude: number,
  radiusMetres: number,
  z: number = TILE_ZOOM
): TileId[] {
  const latRad = (latitude * Math.PI) / 180;
  const metresPerDegLat = 111_320;
  const metresPerDegLon = 111_320 * Math.cos(latRad);
  const dLat = radiusMetres / metresPerDegLat;
  const dLon = radiusMetres / Math.max(metresPerDegLon, 1e-6);

  const sw = latLonToTile(latitude - dLat, longitude - dLon, z);
  const ne = latLonToTile(latitude + dLat, longitude + dLon, z);

  const xMin = Math.min(sw.x, ne.x);
  const xMax = Math.max(sw.x, ne.x);
  const yMin = Math.min(sw.y, ne.y);
  const yMax = Math.max(sw.y, ne.y);

  const out: TileId[] = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      const tile = { z, x, y };
      if (circleIntersectsTile(latitude, longitude, radiusMetres, tile)) {
        out.push(tile);
      }
    }
  }
  // Always include the centre tile even for zero radius.
  if (out.length === 0) {
    out.push(latLonToTile(latitude, longitude, z));
  }
  return out.sort((a, b) => a.x - b.x || a.y - b.y);
}

function circleIntersectsTile(
  latitude: number,
  longitude: number,
  radiusMetres: number,
  tile: TileId
): boolean {
  const b = tileBounds(tile);
  // Clamp point to bbox, then measure distance.
  const clampedLat = Math.min(b.maxLatitude, Math.max(b.minLatitude, latitude));
  const clampedLon = Math.min(b.maxLongitude, Math.max(b.minLongitude, longitude));
  return haversineMetres(latitude, longitude, clampedLat, clampedLon) <= radiusMetres;
}

export function haversineMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Union bbox covering a set of tiles (with optional metre padding). */
export function tilesUnionBounds(tiles: TileId[]): BoundingBox {
  if (tiles.length === 0) {
    throw new Error("tilesUnionBounds requires at least one tile");
  }
  let minLatitude = Infinity;
  let maxLatitude = -Infinity;
  let minLongitude = Infinity;
  let maxLongitude = -Infinity;
  for (const t of tiles) {
    const b = tileBounds(t);
    minLatitude = Math.min(minLatitude, b.minLatitude);
    maxLatitude = Math.max(maxLatitude, b.maxLatitude);
    minLongitude = Math.min(minLongitude, b.minLongitude);
    maxLongitude = Math.max(maxLongitude, b.maxLongitude);
  }
  return { minLatitude, maxLatitude, minLongitude, maxLongitude };
}

export function expandBoundsByMetres(bounds: BoundingBox, metres: number): BoundingBox {
  const midLat = (bounds.minLatitude + bounds.maxLatitude) / 2;
  const metresPerDegLat = 111_320;
  const metresPerDegLon = 111_320 * Math.cos((midLat * Math.PI) / 180);
  const dLat = metres / metresPerDegLat;
  const dLon = metres / Math.max(metresPerDegLon, 1e-6);
  return {
    minLatitude: bounds.minLatitude - dLat,
    maxLatitude: bounds.maxLatitude + dLat,
    minLongitude: wrapLongitude(bounds.minLongitude - dLon),
    maxLongitude: wrapLongitude(bounds.maxLongitude + dLon),
  };
}

export function tileSchemeMeta() {
  return {
    scheme: TILE_SCHEME,
    zoom: TILE_ZOOM,
    path_pattern: "revisions/<revision>/z{z}/{x}/{y}.json",
  };
}
