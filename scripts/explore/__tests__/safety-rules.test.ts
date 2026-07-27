import { describe, expect, it } from "vitest";
import { mergeConfig } from "../config.js";
import { evaluateSafety, loadAndClassify } from "../safety-rules.js";
import type { FeatureCollection } from "geojson";

const hazards: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "h/water", natural: "water", explore_role: "hazard" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-0.29, 51.456],
            [-0.289, 51.456],
            [-0.289, 51.4565],
            [-0.29, 51.4565],
            [-0.29, 51.456],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "h/motorway", highway: "motorway", explore_role: "hazard" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.295, 51.4525],
          [-0.285, 51.4525],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "h/garden",
        leisure: "garden",
        access: "private",
        explore_role: "hazard",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-0.297, 51.455],
            [-0.296, 51.455],
            [-0.296, 51.4555],
            [-0.297, 51.4555],
            [-0.297, 51.455],
          ],
        ],
      },
    },
  ],
};

describe("safety-rules", () => {
  const config = mergeConfig({
    minLatitude: 51.452,
    minLongitude: -0.298,
    maxLatitude: 51.462,
    maxLongitude: -0.282,
  });
  const classified = loadAndClassify(hazards);

  it("rejects points inside water", () => {
    expect(
      evaluateSafety({ latitude: 51.4562, longitude: -0.2895 }, config, classified)
    ).toBe("inside_water");
  });

  it("rejects points too close to motorways", () => {
    expect(
      evaluateSafety({ latitude: 51.45255, longitude: -0.29 }, config, classified)
    ).toBe("too_close_to_motorway");
  });

  it("rejects private gardens", () => {
    expect(
      evaluateSafety({ latitude: 51.4552, longitude: -0.2965 }, config, classified)
    ).toBe("inside_private_garden");
  });

  it("rejects points outside the test area", () => {
    expect(
      evaluateSafety({ latitude: 52, longitude: 0 }, config, classified)
    ).toBe("outside_test_area");
  });
});
