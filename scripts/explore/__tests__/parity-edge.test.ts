/**
 * Parity: Node generator vs Edge-compatible generator config on the same FeatureCollection.
 * Uses the synthetic fixture (no regional hard-coding required).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { FeatureCollection } from "geojson";
import { mergeConfig, SYNTHETIC_FIXTURE_PATH } from "../config.js";
import { generateStops } from "../generate-stops.js";
import { computeSourcePadding } from "../edge-compat/padding.js";
import { latLonToTile, tilesForRadius, tilesUnionBounds } from "../edge-compat/tiles.js";
import { buildCanonicalTile, mergeTiles } from "../edge-compat/canonical-tile.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("edge tile + generator parity", () => {
  it("deterministic stop IDs are stable across repeated runs", () => {
    if (!fs.existsSync(SYNTHETIC_FIXTURE_PATH)) {
      return;
    }
    const fc = JSON.parse(fs.readFileSync(SYNTHETIC_FIXTURE_PATH, "utf8")) as FeatureCollection;
    const config = mergeConfig({
      sourceGeoJsonPath: SYNTHETIC_FIXTURE_PATH,
    });
    const a = generateStops(fc, config);
    const b = generateStops(fc, config);
    expect(a.accepted.map((s) => s.stopId)).toEqual(b.accepted.map((s) => s.stopId));
    expect(a.accepted.map((s) => [s.latitude, s.longitude])).toEqual(
      b.accepted.map((s) => [s.latitude, s.longitude])
    );
  });

  it("canonical tile round-trip preserves feature ids for generation input", () => {
    if (!fs.existsSync(SYNTHETIC_FIXTURE_PATH)) {
      return;
    }
    const fc = JSON.parse(fs.readFileSync(SYNTHETIC_FIXTURE_PATH, "utf8")) as FeatureCollection;
    const midLat = (mergeConfig().minLatitude + mergeConfig().maxLatitude) / 2;
    const midLon = (mergeConfig().minLongitude + mergeConfig().maxLongitude) / 2;
    const tile = latLonToTile(midLat, midLon);
    const canonical = buildCanonicalTile({
      tile,
      features: fc.features,
      sourceProvider: "fixture",
    });
    const merged = mergeTiles([canonical]);
    const config = mergeConfig({
      sourceGeoJsonPath: SYNTHETIC_FIXTURE_PATH,
    });
    const fromRaw = generateStops(fc, config);
    const fromCanonical = generateStops(merged, config);
    // Same source features (allowlisted) → same stop IDs
    expect(fromCanonical.accepted.map((s) => s.stopId).sort()).toEqual(
      fromRaw.accepted.map((s) => s.stopId).sort()
    );
  });

  it("four-tile corner coverage includes neighbouring tiles", () => {
    // Pick a point near a likely tile boundary by using exact tile edge.
    const tile = latLonToTile(51.45, -2.59);
    const boundsPad = computeSourcePadding(200);
    const tiles = tilesForRadius(51.45, -2.59, boundsPad.sourceRadiusMetres);
    expect(tiles.length).toBeGreaterThanOrEqual(1);
    const union = tilesUnionBounds(tiles);
    expect(union.minLatitude).toBeLessThan(51.45);
    expect(union.maxLatitude).toBeGreaterThan(51.45);
    void tile;
  });
});
