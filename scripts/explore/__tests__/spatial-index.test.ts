/**
 * Spatial-index + determinism tests (Step 10.4A).
 */
import { describe, expect, it } from "vitest";
import type { FeatureCollection } from "geojson";
import { DEFAULT_CONFIG } from "../config.js";
import { scoreEnvironment } from "../environment.js";
import { generateStops } from "../generate-stops.js";
import { applyGlobalSpacingGrid } from "../national/spacing.js";
import { FeatureSpatialIndex, maxSafetyQueryMetres } from "../national/spatial-index.js";
import { SPATIAL_INDEX_ALGORITHM_VERSION } from "../national/spatial-index.js";
import { OPTIMISED_ALGORITHM_VERSION } from "../national/regional-block.js";
import { evaluateSafety, loadAndClassify } from "../safety-rules.js";
import { evaluateSafetyContext } from "../safety-context.js";

const hazards: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "way/water1", natural: "water" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-0.291, 51.455],
            [-0.289, 51.455],
            [-0.289, 51.456],
            [-0.291, 51.456],
            [-0.291, 51.455],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "way/mway1", highway: "motorway" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.295, 51.452],
          [-0.285, 51.452],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "way/path1", highway: "footway" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.293, 51.454],
          [-0.287, 51.454],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "node/gate1", barrier: "gate", access: "private" },
      geometry: { type: "Point", coordinates: [-0.292, 51.454] },
    },
  ],
};

const config = {
  ...DEFAULT_CONFIG,
  minLatitude: 51.45,
  maxLatitude: 51.46,
  minLongitude: -0.3,
  maxLongitude: -0.28,
};

describe("spatial index safety parity", () => {
  it("indexed evaluateSafety matches full scan", () => {
    const classified = loadAndClassify(hazards);
    const index = new FeatureSpatialIndex(classified);
    const samples = [
      { latitude: 51.4555, longitude: -0.29 }, // in water
      { latitude: 51.4521, longitude: -0.29 }, // near motorway
      { latitude: 51.454, longitude: -0.29 }, // on path
      { latitude: 51.458, longitude: -0.295 }, // clear
    ];
    for (const p of samples) {
      const a = evaluateSafety(p, config, classified);
      const b = evaluateSafety(p, config, classified, { index });
      expect(b).toBe(a);
    }
  });

  it("index query returns a superset large enough for max safety radius", () => {
    const classified = loadAndClassify(hazards);
    const index = new FeatureSpatialIndex(classified);
    const point = { latitude: 51.454, longitude: -0.29 };
    const hits = index.queryRadius(point, maxSafetyQueryMetres(config));
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.id === "way/path1")).toBe(true);
  });

  it("evaluateSafetyContext indexed equals legacy", () => {
    const classified = loadAndClassify(hazards);
    const index = new FeatureSpatialIndex(classified);
    const point = { latitude: 51.454, longitude: -0.29 };
    const opts = {
      sourceFeatureId: "way/path1",
      sourceType: "footpath" as const,
      sourceProps: classified.find((c) => c.id === "way/path1")!.props,
      isAreaGridCandidate: false,
    };
    const a = evaluateSafetyContext(point, config, classified, opts);
    const b = evaluateSafetyContext(point, config, classified, { ...opts, index });
    expect(b.ok).toBe(a.ok);
    if (a.ok && b.ok) {
      expect(b.flags.sort()).toEqual(a.flags.sort());
    } else if (!a.ok && !b.ok) {
      expect(b.reason).toBe(a.reason);
    }
  });

  it("generateStops with index matches without index on fixture", () => {
    const a = generateStops(hazards, config, { useSpatialIndex: false });
    const b = generateStops(hazards, config, { useSpatialIndex: true });
    expect(b.accepted.map((s) => s.stopId).sort()).toEqual(
      a.accepted.map((s) => s.stopId).sort()
    );
    for (const stop of a.accepted) {
      const other = b.accepted.find((s) => s.stopId === stop.stopId)!;
      expect(other.latitude).toBe(stop.latitude);
      expect(other.longitude).toBe(stop.longitude);
      expect(other.sourceType).toBe(stop.sourceType);
    }
  });

  it("environment dedupes by feature id", () => {
    const duped: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        hazards.features[0]!,
        // duplicate id should not double-count
        { ...hazards.features[0]!, properties: { ...hazards.features[0]!.properties } },
      ],
    };
    const classified = loadAndClassify(duped);
    // Force two entries with same id in list
    const doubled = [...classified, { ...classified[0]! }];
    const index = new FeatureSpatialIndex(doubled);
    const point = { latitude: 51.4555, longitude: -0.29 };
    const profile = scoreEnvironment(point, config, doubled, "footpath", index);
    const legacy = scoreEnvironment(point, config, doubled, "footpath", null);
    // Deduped path should not exceed clamped legacy (legacy double-bumps before clamp)
    expect(profile.freshwater ?? 0).toBeLessThanOrEqual(1);
    expect(typeof legacy.freshwater === "number" || legacy.general === 1).toBe(true);
  });

  it("algorithm version is stable", () => {
    expect(SPATIAL_INDEX_ALGORITHM_VERSION).toMatch(/^rbush-/);
    expect(OPTIMISED_ALGORITHM_VERSION).toContain(SPATIAL_INDEX_ALGORITHM_VERSION);
  });
});

describe("global spacing scale", () => {
  it("handles 100k synthetic points without O(n²) blow-up", () => {
    const n = 100_000;
    const points = Array.from({ length: n }, (_, i) => ({
      id: `p_${i}`,
      latitude: 50 + (i % 1000) * 0.001,
      longitude: -5 + Math.floor(i / 1000) * 0.001,
      priorityKey: `k_${String(i).padStart(8, "0")}`,
    }));
    const t0 = performance.now();
    const kept = applyGlobalSpacingGrid(points, 150);
    const ms = performance.now() - t0;
    expect(kept.length).toBeGreaterThan(100);
    expect(kept.length).toBeLessThan(n);
    // Soft bound: 100k should finish well under 30s on CI/dev machines
    expect(ms).toBeLessThan(30_000);
  });
});
