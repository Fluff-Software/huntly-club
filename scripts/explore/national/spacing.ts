/**
 * National-scale global min-spacing via spatial grid (Step 10.4).
 * Avoids O(n²) pairwise scans used for city-scale catalogues.
 *
 * Longitude cells use a fixed reference latitude (northern UK) so index keys are
 * consistent across the catalogue. Using each point's own latitude previously
 * allowed <150 m pairs to miss each other in the neighbour ring.
 */
import { haversineMeters } from "../safety-rules.js";

export type SpacedPoint = {
  id: string;
  latitude: number;
  longitude: number;
  priorityKey: string;
};

const METRES_PER_DEG_LAT = 111_320;
/** Northern UK — smallest cos(lat) in coverage ⇒ conservative (smaller) lon cells. */
const LON_REF_LATITUDE = 61;

function cellKey(iy: number, ix: number): string {
  return `${iy}:${ix}`;
}

function latIndex(lat: number, cellMetres: number): number {
  return Math.floor((lat * METRES_PER_DEG_LAT) / cellMetres);
}

function lonIndex(lon: number, cellMetres: number): number {
  const metresPerDegLon =
    METRES_PER_DEG_LAT * Math.max(0.2, Math.cos((LON_REF_LATITUDE * Math.PI) / 180));
  return Math.floor((lon * metresPerDegLon) / cellMetres);
}

/**
 * Deterministic global spacing: sort by priorityKey then id; keep a point if no
 * already-kept neighbour is within minMetres.
 */
export function applyGlobalSpacingGrid<T extends SpacedPoint>(
  points: T[],
  minMetres: number,
  options?: { cellMetres?: number }
): T[] {
  const cellMetres = options?.cellMetres ?? minMetres / 2;
  const ranked = [...points].sort((a, b) => {
    if (a.priorityKey !== b.priorityKey) return a.priorityKey < b.priorityKey ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const grid = new Map<string, T[]>();
  const kept: T[] = [];

  const neighbourKeys = (lat: number, lon: number): string[] => {
    const iy = latIndex(lat, cellMetres);
    const ix = lonIndex(lon, cellMetres);
    const keys: string[] = [];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        keys.push(cellKey(iy + dy, ix + dx));
      }
    }
    return keys;
  };

  for (const point of ranked) {
    let tooClose = false;
    for (const key of neighbourKeys(point.latitude, point.longitude)) {
      const bucket = grid.get(key);
      if (!bucket) continue;
      for (const other of bucket) {
        if (haversineMeters(point, other) < minMetres) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) break;
    }
    if (tooClose) continue;
    kept.push(point);
    const key = cellKey(
      latIndex(point.latitude, cellMetres),
      lonIndex(point.longitude, cellMetres)
    );
    const bucket = grid.get(key);
    if (bucket) bucket.push(point);
    else grid.set(key, [point]);
  }

  kept.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return kept;
}
