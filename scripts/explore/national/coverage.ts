/**
 * Point-in-polygon helpers for national coverage filtering.
 */
import fs from "node:fs";
import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";

export function loadCoveragePolygons(geojsonPath: string): FeatureCollection {
  if (!fs.existsSync(geojsonPath)) {
    throw new Error(`Coverage polygon missing: ${geojsonPath}`);
  }
  return JSON.parse(fs.readFileSync(geojsonPath, "utf8")) as FeatureCollection;
}

export type CoverageIndexEntry = {
  feature: Feature<Polygon | MultiPolygon>;
  bbox: [number, number, number, number];
};

/** Bbox-prefiltered coverage features (optionally simplified for speed). */
export function prepareCoverageIndex(
  coverage: FeatureCollection,
  options?: { simplifyTolerance?: number }
): CoverageIndexEntry[] {
  const tol = options?.simplifyTolerance;
  return coverage.features
    .filter(
      (f) =>
        f.geometry &&
        (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
    )
    .map((f) => {
      let feature = f as Feature<Polygon | MultiPolygon>;
      if (tol != null && tol > 0) {
        feature = turf.simplify(feature, {
          tolerance: tol,
          highQuality: false,
        }) as Feature<Polygon | MultiPolygon>;
      }
      return {
        feature,
        bbox: turf.bbox(feature) as [number, number, number, number],
      };
    });
}

export function pointInCoverageIndex(
  latitude: number,
  longitude: number,
  index: CoverageIndexEntry[]
): boolean {
  const pt = turf.point([longitude, latitude]);
  for (const { feature, bbox } of index) {
    if (
      longitude < bbox[0] ||
      longitude > bbox[2] ||
      latitude < bbox[1] ||
      latitude > bbox[3]
    ) {
      continue;
    }
    if (turf.booleanPointInPolygon(pt, feature)) return true;
  }
  return false;
}

export function pointInCoverage(
  latitude: number,
  longitude: number,
  coverage: FeatureCollection
): boolean {
  return pointInCoverageIndex(latitude, longitude, prepareCoverageIndex(coverage));
}

export function filterPointsToCoverage<T extends { latitude: number; longitude: number }>(
  points: T[],
  coverage: FeatureCollection
): T[] {
  return points.filter((p) => pointInCoverage(p.latitude, p.longitude, coverage));
}
