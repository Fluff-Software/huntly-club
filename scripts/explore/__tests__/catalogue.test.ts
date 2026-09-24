import { describe, expect, it } from "vitest";
import {
  pointTypeFromSourceType,
  sourceTypeFromPointType,
  assertKnownPointType,
} from "../point-types.js";
import {
  acceptedToCataloguePoint,
  applyCatalogueSpacing,
  bboxAreaKm2,
  buildCatalogueFromAccepted,
  splitBboxIntoTiles,
  type CatalogueRegionConfig,
} from "../generate-catalogue.js";
import { validateCatalogue } from "../validate-catalogue.js";
import type { AcceptedStop } from "../types.js";

const region: CatalogueRegionConfig = {
  region_id: "test",
  name: "Test",
  bounding_box: {
    min_latitude: 53.03,
    min_longitude: -2.18,
    max_latitude: 53.06,
    max_longitude: -2.15,
  },
  source_geojson: "fixtures/local/stoke-sneyd-green.geojson",
  source_revision: "2026-07-23",
  generation_version: 2,
  output_dir: "output/catalogues/test",
  attribution: "© OpenStreetMap contributors",
  licence: "ODbL 1.0",
};

function fakeStop(partial: Partial<AcceptedStop> & Pick<AcceptedStop, "stopId">): AcceptedStop {
  return {
    candidateId: "cand",
    sourceType: "footpath",
    sourceFeatureId: "way/1",
    candidateIndex: 0,
    latitude: 53.044,
    longitude: -2.165,
    alternativeIndex: 0,
    stopId: partial.stopId,
    generationVersion: 2,
    confidence: 0.9,
    confidenceReasons: [],
    environmentProfile: { urban: 0.5 },
    acceptedReason: "ok",
    priorityKey: "p",
    reviewFlags: [],
    nearWater: false,
    nearMajorRoad: false,
    nearSchool: false,
    nearBarrier: false,
    nearBboxEdge: false,
    mappedPublicWatersideRoute: false,
    nearestWaterMeters: null,
    nearestMajorRoadMeters: null,
    nearestSchoolMeters: null,
    nearestBarrierMeters: null,
    nearestBarrierType: null,
    distanceToBboxEdgeMeters: 10,
    ...partial,
  };
}

describe("point-types", () => {
  it("maps source types to stable integers", () => {
    expect(pointTypeFromSourceType("footpath")).toBe(1);
    expect(pointTypeFromSourceType("park")).toBe(6);
    expect(sourceTypeFromPointType(3)).toBe("sidewalk");
    expect(sourceTypeFromPointType(99)).toBeNull();
    expect(() => assertKnownPointType(99)).toThrow(/unknown_point_type/);
  });
});

describe("catalogue build + validate", () => {
  it("builds compact points and rejects duplicates", () => {
    const stops = [
      fakeStop({ stopId: "stop_a", latitude: 53.044, longitude: -2.165 }),
      fakeStop({ stopId: "stop_a", latitude: 53.044, longitude: -2.165 }),
      fakeStop({
        stopId: "stop_b",
        sourceType: "park",
        latitude: 53.045,
        longitude: -2.166,
      }),
    ];
    const catalogue = buildCatalogueFromAccepted(region, stops);
    expect(catalogue.point_count).toBe(2);
    expect(catalogue.points[0]?.type).toBe(1);
    expect(catalogue.points.find((p) => p.id === "stop_b")?.type).toBe(6);
    expect(bboxAreaKm2(region.bounding_box)).toBeGreaterThan(0);

    const report = validateCatalogue(catalogue);
    expect(report.ok).toBe(true);
    expect(report.duplicate_ids).toBe(0);
  });

  it("tiles large bboxes and applies global spacing", () => {
    const tiles = splitBboxIntoTiles({
      minLatitude: 52.96,
      minLongitude: -2.25,
      maxLatitude: 53.08,
      maxLongitude: -2.08,
    });
    expect(tiles.length).toBeGreaterThan(1);

    const a = fakeStop({
      stopId: "stop_near_a",
      priorityKey: "a",
      latitude: 53.044,
      longitude: -2.165,
    });
    const b = fakeStop({
      stopId: "stop_near_b",
      priorityKey: "b",
      latitude: 53.0441,
      longitude: -2.1651,
    });
    const spaced = applyCatalogueSpacing([a, b], 150);
    expect(spaced).toHaveLength(1);
    expect(spaced[0]?.stopId).toBe("stop_near_a");
  });

  it("acceptedToCataloguePoint skips unknown source types", () => {
    const bad = fakeStop({ stopId: "x", sourceType: "unsupported" as never });
    expect(acceptedToCataloguePoint(bad, "rev")).toBeNull();
  });
});
