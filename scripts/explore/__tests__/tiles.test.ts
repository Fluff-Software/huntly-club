/**
 * Step 10.2 — global tile scheme, padding, and canonical tile tests.
 */
import { describe, expect, it } from "vitest";
import {
  approximateTileWidthMetres,
  latLonToTile,
  tileBounds,
  tileKey,
  tileObjectPath,
  tilesForRadius,
} from "../edge-compat/tiles.js";
import { computeSourcePadding } from "../edge-compat/padding.js";
import {
  buildCanonicalTile,
  mergeTiles,
  validateCanonicalTile,
} from "../edge-compat/canonical-tile.js";
import { ACTIVE_OSM_REVISION, TILE_ZOOM } from "../edge-compat/config.js";
import type { Feature } from "geojson";

const SNEYD = { latitude: 53.044236, longitude: -2.165567 };
const BRISTOL = { latitude: 51.4545, longitude: -2.5879 };

describe("global slippy tile scheme", () => {
  it("maps coordinates to deterministic tile IDs", () => {
    const a = latLonToTile(SNEYD.latitude, SNEYD.longitude);
    const b = latLonToTile(SNEYD.latitude, SNEYD.longitude);
    expect(a).toEqual(b);
    expect(a.z).toBe(TILE_ZOOM);
    expect(tileKey(a)).toMatch(/^\d+\/\d+\/\d+$/);
  });

  it("produces different tile IDs for Sneyd Green vs Bristol", () => {
    const sneyd = latLonToTile(SNEYD.latitude, SNEYD.longitude);
    const bristol = latLonToTile(BRISTOL.latitude, BRISTOL.longitude);
    expect(tileKey(sneyd)).not.toBe(tileKey(bristol));
  });

  it("object paths contain no city names", () => {
    const tile = latLonToTile(SNEYD.latitude, SNEYD.longitude);
    const path = tileObjectPath(ACTIVE_OSM_REVISION, tile);
    expect(path).toBe(
      `revisions/${ACTIVE_OSM_REVISION}/z${tile.z}/${tile.x}/${tile.y}.json`
    );
    expect(path.toLowerCase()).not.toContain("sneyd");
    expect(path.toLowerCase()).not.toContain("bristol");
    expect(path.toLowerCase()).not.toContain("stoke");
  });

  it("neighbouring locations share or adjoin tiles", () => {
    const centre = latLonToTile(SNEYD.latitude, SNEYD.longitude);
    const nearby = latLonToTile(SNEYD.latitude + 0.001, SNEYD.longitude + 0.001);
    const dx = Math.abs(centre.x - nearby.x);
    const dy = Math.abs(centre.y - nearby.y);
    expect(dx + dy).toBeLessThanOrEqual(2);
  });

  it("radius intersects expected tiles and includes padding neighbours", () => {
    const unpadded = tilesForRadius(SNEYD.latitude, SNEYD.longitude, 500);
    const padded = computeSourcePadding(500);
    const withPad = tilesForRadius(
      SNEYD.latitude,
      SNEYD.longitude,
      padded.sourceRadiusMetres
    );
    expect(unpadded.length).toBeGreaterThan(0);
    expect(withPad.length).toBeGreaterThanOrEqual(unpadded.length);
  });

  it("benchmarks z15 vs z16 tile counts at UK latitude", () => {
    const radius = computeSourcePadding(500).sourceRadiusMetres;
    const z15 = tilesForRadius(SNEYD.latitude, SNEYD.longitude, radius, 15);
    const z16 = tilesForRadius(SNEYD.latitude, SNEYD.longitude, radius, 16);
    const width15 = approximateTileWidthMetres(SNEYD.latitude, 15);
    const width16 = approximateTileWidthMetres(SNEYD.latitude, 16);
    // Documented choice: z15 keeps request tile counts smaller.
    expect(z15.length).toBeLessThan(z16.length);
    expect(width15).toBeGreaterThan(width16);
    expect(width15).toBeGreaterThan(600);
    expect(width15).toBeLessThan(900);
    expect(z15.length).toBeLessThanOrEqual(16);
  });

  it("revision changes create new object paths", () => {
    const tile = latLonToTile(BRISTOL.latitude, BRISTOL.longitude);
    const a = tileObjectPath("2026-07", tile);
    const b = tileObjectPath("2026-08", tile);
    expect(a).not.toBe(b);
    expect(a).toContain("2026-07");
    expect(b).toContain("2026-08");
  });
});

describe("source padding", () => {
  it("adds safety + spacing + environment buffers (500 → ~835)", () => {
    const p = computeSourcePadding(500);
    expect(p.maximumSafetyBufferMetres).toBe(50);
    expect(p.generationSpacingBufferMetres).toBe(150);
    expect(p.environmentContextBufferMetres).toBe(100);
    expect(p.alternativeDisplacementBufferMetres).toBe(35);
    expect(p.sourceRadiusMetres).toBe(500 + 50 + 150 + 100 + 35);
  });
});

describe("canonical tiles", () => {
  it("validates, dedupes, and merges without city keys", () => {
    const tile = latLonToTile(SNEYD.latitude, SNEYD.longitude);
    const features: Feature[] = [
      {
        type: "Feature",
        properties: {
          id: "way/1",
          highway: "footway",
          user: "should-strip",
          changeset: 99,
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [-2.165, 53.044],
            [-2.164, 53.045],
          ],
        },
      },
      {
        type: "Feature",
        properties: { id: "way/1", highway: "footway" },
        geometry: {
          type: "LineString",
          coordinates: [
            [-2.165, 53.044],
            [-2.164, 53.045],
          ],
        },
      },
    ];
    const canonical = buildCanonicalTile({
      tile,
      features,
      sourceProvider: "overpass_compatible",
    });
    expect(canonical.feature_count).toBe(1);
    expect(canonical.features[0]!.properties).not.toHaveProperty("user");
    expect(canonical.features[0]!.properties).not.toHaveProperty("changeset");
    const validated = validateCanonicalTile(canonical);
    expect(validated.ok).toBe(true);

    const merged = mergeTiles([canonical, canonical]);
    expect(merged.features).toHaveLength(1);
  });

  it("rejects duplicate feature IDs on validation", () => {
    const tile = latLonToTile(0, 0);
    const bad = {
      ...buildCanonicalTile({
        tile,
        features: [],
        sourceProvider: "test",
      }),
      features: [
        {
          type: "Feature",
          properties: { id: "way/1" },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        {
          type: "Feature",
          properties: { id: "way/1" },
          geometry: { type: "Point", coordinates: [0.1, 0.1] },
        },
      ],
    };
    const result = validateCanonicalTile(bad);
    expect(result.ok).toBe(false);
  });

  it("tile bounds cover the tile centre", () => {
    const tile = latLonToTile(SNEYD.latitude, SNEYD.longitude);
    const b = tileBounds(tile);
    expect(SNEYD.latitude).toBeGreaterThanOrEqual(b.minLatitude);
    expect(SNEYD.latitude).toBeLessThanOrEqual(b.maxLatitude);
    expect(SNEYD.longitude).toBeGreaterThanOrEqual(b.minLongitude);
    expect(SNEYD.longitude).toBeLessThanOrEqual(b.maxLongitude);
  });
});
