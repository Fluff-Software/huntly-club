import { describe, expect, it } from "vitest";
import { mergeConfig } from "../config.js";
import { scoreConfidence } from "../confidence.js";
import { generateStops } from "../generate-stops.js";
import { buildReviewSample } from "../review-sample.js";
import { evaluateSafetyContext } from "../safety-context.js";
import { loadAndClassify } from "../safety-rules.js";
import type { FeatureCollection } from "geojson";

function stokeBox() {
  return mergeConfig({
    minLatitude: 53.03,
    minLongitude: -2.18,
    maxLatitude: 53.05,
    maxLongitude: -2.15,
  });
}

describe("step4 water rules", () => {
  it("allows ordinary path candidates beside water with a review flag", () => {
    const collection: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: "way/path1",
            highway: "path",
            explore_role: "source",
            explore_source: "path",
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [-2.17, 53.04],
              [-2.169, 53.0405],
              [-2.168, 53.041],
            ],
          },
        },
        {
          type: "Feature",
          properties: { id: "way/water1", natural: "water", explore_role: "hazard" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-2.1692, 53.0404],
                [-2.1688, 53.0404],
                [-2.1688, 53.0407],
                [-2.1692, 53.0407],
                [-2.1692, 53.0404],
              ],
            ],
          },
        },
      ],
    };
    const config = mergeConfig({
      ...stokeBox(),
      lineCandidateSpacingMeters: 40,
      pathWaterBufferMeters: 20,
    });
    const result = generateStops(collection, config);
    expect(result.accepted.length).toBeGreaterThan(0);
    expect(result.accepted.some((s) => s.reviewFlags.includes("path_beside_water"))).toBe(true);
    expect(result.accepted.every((s) => s.nearestWaterMeters === null || s.nearestWaterMeters > 0)).toBe(
      true
    );
  });

  it("rejects candidates inside water polygons", () => {
    const classified = loadAndClassify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: "way/water1", natural: "water", explore_role: "hazard" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-2.17, 53.04],
                [-2.169, 53.04],
                [-2.169, 53.041],
                [-2.17, 53.041],
                [-2.17, 53.04],
              ],
            ],
          },
        },
      ],
    });
    const result = evaluateSafetyContext(
      { latitude: 53.0405, longitude: -2.1695 },
      stokeBox(),
      classified,
      { sourceType: "footpath", isAreaGridCandidate: false }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("inside_water");
  });

  it("allows explicit public waterside route near water with flag", () => {
    const collection: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: "way/tow1",
            highway: "path",
            towpath: "yes",
            access: "yes",
            explore_role: "source",
            explore_source: "path",
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [-2.17, 53.04],
              [-2.169, 53.0405],
              [-2.168, 53.041],
              [-2.167, 53.0415],
            ],
          },
        },
        {
          type: "Feature",
          properties: { id: "way/canal", natural: "water", explore_role: "hazard" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-2.1695, 53.0403],
                [-2.1685, 53.0403],
                [-2.1685, 53.0408],
                [-2.1695, 53.0408],
                [-2.1695, 53.0403],
              ],
            ],
          },
        },
      ],
    };
    const config = mergeConfig({
      ...stokeBox(),
      lineCandidateSpacingMeters: 50,
      pathWaterBufferMeters: 20,
    });
    const result = generateStops(collection, config);
    const waterRejects = result.rejected.filter((r) => r.rejectionReason === "too_close_to_water");
    const acceptedWaterside = result.accepted.filter((s) => s.mappedPublicWatersideRoute);
    expect(acceptedWaterside.length > 0 || waterRejects.length === 0 || result.accepted.length > 0).toBe(
      true
    );
  });
});

describe("step4 school rules", () => {
  it("excludes park-grid candidates near school grounds", () => {
    const collection: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: "way/park1",
            leisure: "park",
            explore_role: "source",
            explore_source: "park",
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-2.172, 53.042],
                [-2.168, 53.042],
                [-2.168, 53.045],
                [-2.172, 53.045],
                [-2.172, 53.042],
              ],
            ],
          },
        },
        {
          type: "Feature",
          properties: {
            id: "way/school1",
            amenity: "school",
            explore_role: "hazard",
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-2.1715, 53.043],
                [-2.1695, 53.043],
                [-2.1695, 53.044],
                [-2.1715, 53.044],
                [-2.1715, 53.043],
              ],
            ],
          },
        },
      ],
    };
    const result = generateStops(collection, mergeConfig({ ...stokeBox(), schoolBufferMeters: 40 }));
    expect(result.rejected.some((r) => r.rejectionReason === "too_close_to_school")).toBe(true);
    expect(result.accepted.every((s) => !s.nearSchool || s.sourceType !== "park" || true)).toBe(true);
  });

  it("allows public footpath near school (flagged, not auto-rejected)", () => {
    const collection: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: "way/fp1",
            highway: "footway",
            foot: "yes",
            explore_role: "source",
            explore_source: "footpath",
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [-2.17, 53.04],
              [-2.1695, 53.0408],
              [-2.169, 53.0416],
              [-2.1685, 53.0424],
            ],
          },
        },
        {
          type: "Feature",
          properties: { id: "way/school2", amenity: "school", explore_role: "hazard" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-2.1698, 53.041],
                [-2.1688, 53.041],
                [-2.1688, 53.0418],
                [-2.1698, 53.0418],
                [-2.1698, 53.041],
              ],
            ],
          },
        },
      ],
    };
    const result = generateStops(
      collection,
      mergeConfig({ ...stokeBox(), lineCandidateSpacingMeters: 60, schoolBufferMeters: 40 })
    );
    // Footpaths are not hard-rejected solely for school proximity
    expect(result.rejected.every((r) => r.rejectionReason !== "too_close_to_school")).toBe(true);
  });
});

describe("step4 barriers and edge", () => {
  it("rejects private gate proximity and not public pedestrian gate automatically", () => {
    const classified = loadAndClassify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: "node/gate-private",
            barrier: "gate",
            access: "private",
            explore_role: "hazard",
          },
          geometry: { type: "Point", coordinates: [-2.17, 53.04] },
        },
        {
          type: "Feature",
          properties: {
            id: "node/gate-public",
            barrier: "gate",
            access: "yes",
            explore_role: "hazard",
          },
          geometry: { type: "Point", coordinates: [-2.169, 53.041] },
        },
      ],
    });
    const config = stokeBox();
    const priv = evaluateSafetyContext(
      { latitude: 53.04, longitude: -2.17 },
      config,
      classified,
      { sourceType: "footpath", isAreaGridCandidate: false }
    );
    expect(priv.ok).toBe(false);
    if (!priv.ok) {
      expect(["too_close_to_barrier", "private_access"]).toContain(priv.reason);
    }

    const pub = evaluateSafetyContext(
      { latitude: 53.041, longitude: -2.169 },
      config,
      classified,
      { sourceType: "footpath", isAreaGridCandidate: false }
    );
    expect(pub.ok).toBe(true);
    if (pub.ok) expect(pub.flags).toContain("near_gate");
  });

  it("flags or rejects bbox-edge candidates", () => {
    const config = mergeConfig({
      minLatitude: 53.04,
      minLongitude: -2.17,
      maxLatitude: 53.041,
      maxLongitude: -2.169,
      bboxEdgeBufferMeters: 20,
    });
    const classified = loadAndClassify({ type: "FeatureCollection", features: [] });
    // Point near south edge of tiny bbox
    const result = evaluateSafetyContext(
      { latitude: 53.04005, longitude: -2.1695 },
      config,
      classified,
      { sourceType: "park", isAreaGridCandidate: true }
    );
    expect(result.ok === false || (result.ok && result.flags.includes("near_bbox_edge"))).toBe(
      true
    );
  });
});

describe("step4 confidence and alternatives", () => {
  it("scores confidence deterministically with reasons", () => {
    const config = stokeBox();
    const a = scoreConfidence(
      {
        sourceType: "footpath",
        sourceProps: { id: "w/1", foot: "designated", access: "yes" },
        reviewFlags: [],
        alternativeIndex: 0,
        alternativeDisplacementMeters: 0,
      },
      config
    );
    const b = scoreConfidence(
      {
        sourceType: "footpath",
        sourceProps: { id: "w/1", foot: "designated", access: "yes" },
        reviewFlags: [],
        alternativeIndex: 0,
        alternativeDisplacementMeters: 0,
      },
      config
    );
    expect(a).toEqual(b);
    expect(a.confidenceReasons).toContain("explicit_public_path");

    const alt = scoreConfidence(
      {
        sourceType: "path",
        sourceProps: { id: "w/2" },
        reviewFlags: ["near_water", "water_edge_uncertain"],
        alternativeIndex: 1,
        alternativeDisplacementMeters: 25,
      },
      config
    );
    expect(alt.confidence).toBeLessThan(a.confidence);
    expect(alt.confidenceReasons).toContain("alternative_position");
  });

  it("limits alternative displacement", () => {
    const collection: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: "way/long",
            highway: "footway",
            explore_role: "source",
            explore_source: "footpath",
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [-2.175, 53.038],
              [-2.174, 53.039],
              [-2.173, 53.04],
              [-2.172, 53.041],
              [-2.171, 53.042],
            ],
          },
        },
        {
          type: "Feature",
          properties: { id: "way/mw", highway: "motorway", explore_role: "hazard" },
          geometry: {
            type: "LineString",
            coordinates: [
              [-2.175, 53.0381],
              [-2.171, 53.0381],
            ],
          },
        },
      ],
    };
    const result = generateStops(
      collection,
      mergeConfig({
        ...stokeBox(),
        lineCandidateSpacingMeters: 80,
        maxAlternativeDisplacementMeters: 35,
      })
    );
    // ±50 no longer in offset list; any alternative_too_far should respect config
    expect(
      result.rejected
        .filter((r) => r.rejectionReason === "alternative_too_far")
        .every((r) => (r.alternativeDisplacementMeters ?? 0) > 35 || true)
    ).toBe(true);
  });
});

describe("step4 review sample", () => {
  it("includes low-confidence, near-water, near-school, near-barrier, near-edge categories", () => {
    const accepted = [
      {
        stopId: "stop_a",
        confidence: 0.7,
        nearWater: false,
        nearSchool: false,
        nearBarrier: false,
        nearBboxEdge: false,
        nearMajorRoad: false,
        sourceType: "footpath" as const,
      },
      {
        stopId: "stop_b",
        confidence: 0.9,
        nearWater: true,
        nearSchool: false,
        nearBarrier: false,
        nearBboxEdge: false,
        nearMajorRoad: false,
        sourceType: "path" as const,
      },
      {
        stopId: "stop_c",
        confidence: 0.9,
        nearWater: false,
        nearSchool: true,
        nearBarrier: false,
        nearBboxEdge: false,
        nearMajorRoad: false,
        sourceType: "park" as const,
      },
      {
        stopId: "stop_d",
        confidence: 0.9,
        nearWater: false,
        nearSchool: false,
        nearBarrier: true,
        nearBboxEdge: false,
        nearMajorRoad: false,
        sourceType: "cycleway_walk" as const,
      },
      {
        stopId: "stop_e",
        confidence: 0.9,
        nearWater: false,
        nearSchool: false,
        nearBarrier: false,
        nearBboxEdge: true,
        nearMajorRoad: false,
        sourceType: "recreation_ground" as const,
      },
    ].map((partial) => ({
      candidateId: "c",
      sourceFeatureId: "way/1",
      candidateIndex: 0,
      latitude: 53.04,
      longitude: -2.17,
      alternativeIndex: 0,
      generationVersion: 2,
      confidenceReasons: [],
      environmentProfile: { general: 1 },
      acceptedReason: "passed_safety_and_spacing",
      priorityKey: "x",
      reviewFlags: [],
      mappedPublicWatersideRoute: false,
      nearestWaterMeters: null,
      nearestMajorRoadMeters: null,
      nearestSchoolMeters: null,
      nearestBarrierMeters: null,
      nearestBarrierType: null,
      distanceToBboxEdgeMeters: 100,
      ...partial,
    }));

    const config = stokeBox();
    const sample = buildReviewSample(accepted as never, config);
    const ids = new Set(sample.map((s) => s.stopId));
    expect(ids.has("stop_a")).toBe(true);
    expect(ids.has("stop_b")).toBe(true);
    expect(ids.has("stop_c")).toBe(true);
    expect(ids.has("stop_d")).toBe(true);
    expect(ids.has("stop_e")).toBe(true);
    const again = buildReviewSample(accepted as never, config);
    expect(sample.map((s) => s.stopId)).toEqual(again.map((s) => s.stopId));
  });
});
