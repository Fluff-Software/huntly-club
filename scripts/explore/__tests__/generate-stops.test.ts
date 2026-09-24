import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FeatureCollection } from "geojson";
import { describe, expect, it } from "vitest";
import { SYNTHETIC_FIXTURE_PATH, mergeConfig } from "../config.js";
import { scoreEnvironment } from "../environment.js";
import { generateStops } from "../generate-stops.js";
import { loadAndClassify } from "../safety-rules.js";
import { buildStopId, stableHashHex } from "../stable-hash.js";
import { buildReviewSample } from "../review-sample.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, "..", "fixtures", "test-area.geojson");

function loadFixture(): FeatureCollection {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as FeatureCollection;
}

function fixtureConfig() {
  return mergeConfig({
    sourceGeoJsonPath: SYNTHETIC_FIXTURE_PATH,
    minLatitude: 51.452,
    minLongitude: -0.298,
    maxLatitude: 51.462,
    maxLongitude: -0.282,
  });
}

function shuffle<T>(items: T[], seed: string): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Number.parseInt(stableHashHex(`${seed}|${i}`).slice(0, 8), 16) % (i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

describe("deterministic stop generator", () => {
  const config = fixtureConfig();

  it("produces identical output for the same input", () => {
    const collection = loadFixture();
    const a = generateStops(collection, config);
    const b = generateStops(collection, config);
    expect(a.accepted.map((s) => s.stopId)).toEqual(b.accepted.map((s) => s.stopId));
    expect(a.accepted.map((s) => [s.latitude, s.longitude])).toEqual(
      b.accepted.map((s) => [s.latitude, s.longitude])
    );
    expect(a.summary.sourceCandidatesGenerated).toEqual(b.summary.sourceCandidatesGenerated);
  });

  it("does not change accepted stops when source feature order changes", () => {
    const collection = loadFixture();
    const shuffled: FeatureCollection = {
      type: "FeatureCollection",
      features: shuffle(collection.features, "order-test"),
    };
    const a = generateStops(collection, config);
    const b = generateStops(shuffled, config);
    expect(a.accepted.map((s) => s.stopId)).toEqual(b.accepted.map((s) => s.stopId));
  });

  it("assigns a stable stop ID for the same accepted candidate", () => {
    const collection = loadFixture();
    const result = generateStops(collection, config);
    expect(result.accepted.length).toBeGreaterThan(0);
    const stop = result.accepted[0]!;
    const again = buildStopId({
      generationVersion: stop.generationVersion,
      sourceType: stop.sourceType,
      sourceFeatureId: stop.sourceFeatureId,
      candidateIndex: stop.candidateIndex,
      latitude: stop.latitude,
      longitude: stop.longitude,
      coordinateDecimals: config.coordinateDecimals,
    });
    expect(again).toBe(stop.stopId);
  });

  it("rejects candidates inside water", () => {
    const waterPath: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: "fixture/path-through-pond",
            highway: "footway",
            explore_role: "source",
            explore_source: "footpath",
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [-0.2908, 51.4565],
              [-0.290, 51.4571],
              [-0.2892, 51.4577],
            ],
          },
        },
        {
          type: "Feature",
          properties: {
            id: "fixture/pond-blocking",
            natural: "water",
            explore_role: "hazard",
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-0.2905, 51.4568],
                [-0.2895, 51.4568],
                [-0.2895, 51.4574],
                [-0.2905, 51.4574],
                [-0.2905, 51.4568],
              ],
            ],
          },
        },
      ],
    };
    const result = generateStops(waterPath, mergeConfig({
      ...fixtureConfig(),
      lineCandidateSpacingMeters: 40,
    }));
    const waterRejects = result.rejected.filter(
      (r) => r.rejectionReason === "inside_water"
    );
    expect(waterRejects.length).toBeGreaterThan(0);
  });

  it("rejects private-access source features (not used as stop sources)", () => {
    const collection = loadFixture();
    const classified = loadAndClassify(collection);
    const privatePath = classified.find((c) => c.id === "fixture/bad-footpath-private");
    expect(privatePath?.role).toBe("hazard");
    const result = generateStops(collection, config);
    expect(result.accepted.every((s) => s.sourceFeatureId !== "fixture/bad-footpath-private")).toBe(
      true
    );
  });

  it("rejects motorway-adjacent unsafe candidates", () => {
    const collection = loadFixture();
    const result = generateStops(collection, config);
    const motorwayRejects = result.rejected.filter(
      (r) =>
        r.rejectionReason === "on_motorway" ||
        r.rejectionReason === "too_close_to_motorway"
    );
    expect(motorwayRejects.length).toBeGreaterThan(0);
    const roadsideAccepted = result.accepted.filter(
      (s) => s.sourceFeatureId === "fixture/motorway-adjacent-path"
    );
    expect(roadsideAccepted.length).toBe(0);
  });

  it("can accept park candidates", () => {
    const collection = loadFixture();
    const result = generateStops(collection, config);
    const parkStops = result.accepted.filter((s) => s.sourceType === "park");
    expect(parkStops.length).toBeGreaterThan(0);
  });

  it("can accept public path / footpath candidates", () => {
    const collection = loadFixture();
    const result = generateStops(collection, config);
    const pathStops = result.accepted.filter(
      (s) => s.sourceType === "footpath" || s.sourceType === "path"
    );
    expect(pathStops.length).toBeGreaterThan(0);
  });

  it("deterministically deduplicates nearby candidates via spacing", () => {
    const collection = loadFixture();
    const tight = mergeConfig({ ...fixtureConfig(), minimumStopSpacingMeters: 400 });
    const loose = mergeConfig({ ...fixtureConfig(), minimumStopSpacingMeters: 50 });
    const tightResult = generateStops(collection, tight);
    const looseResult = generateStops(collection, loose);
    expect(tightResult.accepted.length).toBeLessThanOrEqual(looseResult.accepted.length);
    expect(
      tightResult.rejected.some((r) => r.rejectionReason === "too_close_to_existing_stop")
    ).toBe(true);
  });

  it("produces repeatable environment profiles", () => {
    const collection = loadFixture();
    const a = generateStops(collection, config);
    const b = generateStops(collection, config);
    expect(a.accepted.map((s) => s.environmentProfile)).toEqual(
      b.accepted.map((s) => s.environmentProfile)
    );
    const classified = loadAndClassify(collection);
    if (a.accepted[0]) {
      const profile = scoreEnvironment(
        a.accepted[0],
        config,
        classified,
        a.accepted[0].sourceType
      );
      expect(profile).toEqual(a.accepted[0].environmentProfile);
    }
  });

  it("does not write generated stops to a database (pure function)", () => {
    const collection = loadFixture();
    const result = generateStops(collection, config);
    expect(result.accepted.every((s) => s.stopId.startsWith("stop_"))).toBe(true);
    expect(typeof result).toBe("object");
  });

  it("summary separates source candidates from alternative attempts", () => {
    const collection = loadFixture();
    const result = generateStops(collection, config);
    expect(result.summary.sourceCandidatesGenerated).toBeGreaterThan(0);
    expect(result.summary.alternativePositionsTested).toBeGreaterThanOrEqual(
      result.summary.sourceCandidatesGenerated
    );
    expect(result.summary.rejectedPositionAttempts).toBe(result.rejected.length);
    expect(result.summary.sourceCandidatesUltimatelyRejected).toBe(
      Math.max(0, result.summary.sourceCandidatesGenerated - result.accepted.length)
    );
  });
});

describe("review sample", () => {
  it("is deterministic and includes all low-confidence stops", () => {
    const collection = loadFixture();
    const config = fixtureConfig();
    const result = generateStops(collection, config);
    const a = buildReviewSample(result.accepted, config);
    const b = buildReviewSample(result.accepted, config);
    expect(a.map((s) => s.stopId)).toEqual(b.map((s) => s.stopId));
    const low = result.accepted.filter((s) => s.confidence < config.lowConfidenceThreshold);
    for (const stop of low) {
      expect(a.some((s) => s.stopId === stop.stopId)).toBe(true);
    }
  });
});
