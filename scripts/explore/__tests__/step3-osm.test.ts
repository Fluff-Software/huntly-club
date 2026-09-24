import { describe, expect, it } from "vitest";
import { overpassToGeoJson } from "../overpass-to-geojson.js";
import {
  classifySourceType,
  isResidentialWithoutSafePedestrian,
  loadAndClassify,
} from "../safety-rules.js";
import { generateStops } from "../generate-stops.js";
import { mergeConfig } from "../config.js";
import type { FeatureCollection } from "geojson";

describe("overpass conversion", () => {
  it("preserves stable OSM IDs and access / hazard tags", () => {
    const geojson = overpassToGeoJson({
      elements: [
        {
          type: "way",
          id: 111,
          tags: {
            highway: "footway",
            foot: "yes",
            access: "yes",
          },
          geometry: [
            { lat: 53.04, lon: -2.17 },
            { lat: 53.041, lon: -2.169 },
          ],
        },
        {
          type: "way",
          id: 222,
          tags: {
            natural: "water",
          },
          geometry: [
            { lat: 53.042, lon: -2.168 },
            { lat: 53.042, lon: -2.167 },
            { lat: 53.043, lon: -2.167 },
            { lat: 53.042, lon: -2.168 },
          ],
        },
        {
          type: "way",
          id: 333,
          tags: { building: "yes" },
          geometry: [
            { lat: 53.044, lon: -2.166 },
            { lat: 53.044, lon: -2.165 },
            { lat: 53.045, lon: -2.165 },
            { lat: 53.044, lon: -2.166 },
          ],
        },
        {
          type: "way",
          id: 444,
          tags: { railway: "rail" },
          geometry: [
            { lat: 53.046, lon: -2.164 },
            { lat: 53.047, lon: -2.163 },
          ],
        },
        {
          type: "way",
          id: 555,
          tags: { barrier: "wall" },
          geometry: [
            { lat: 53.048, lon: -2.162 },
            { lat: 53.049, lon: -2.161 },
          ],
        },
        {
          type: "way",
          id: 666,
          tags: { highway: "primary" },
          geometry: [
            { lat: 53.05, lon: -2.16 },
            { lat: 53.051, lon: -2.159 },
          ],
        },
      ],
    });

    const byId = Object.fromEntries(
      geojson.features.map((f) => [String(f.properties?.id), f.properties])
    );
    expect(byId["way/111"]?.id).toBe("way/111");
    expect(byId["way/111"]?.foot).toBe("yes");
    expect(byId["way/111"]?.access).toBe("yes");
    expect(byId["way/222"]?.natural).toBe("water");
    expect(byId["way/333"]?.building).toBe("yes");
    expect(byId["way/444"]?.railway).toBe("rail");
    expect(byId["way/555"]?.barrier).toBe("wall");
    expect(byId["way/666"]?.highway).toBe("primary");
  });
});

describe("conservative road / building rules", () => {
  it("does not create stops from residential roads without dedicated pedestrian geometry", () => {
    const props = {
      id: "way/res1",
      highway: "residential",
      sidewalk: "both",
    };
    expect(isResidentialWithoutSafePedestrian(props)).toBe(true);
    expect(classifySourceType(props)).toBeNull();

    const collection: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: props,
          geometry: {
            type: "LineString",
            coordinates: [
              [-2.17, 53.04],
              [-2.169, 53.041],
              [-2.168, 53.042],
            ],
          },
        },
      ],
    };
    const result = generateStops(
      collection,
      mergeConfig({
        minLatitude: 53.03,
        minLongitude: -2.18,
        maxLatitude: 53.05,
        maxLongitude: -2.15,
      })
    );
    expect(result.accepted.length).toBe(0);
    expect(result.summary.sourceCandidatesGenerated).toBe(0);
  });

  it("does not create stops from building centres", () => {
    const collection: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: "way/b1", building: "yes", name: "Shop" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-2.166, 53.044],
                [-2.165, 53.044],
                [-2.165, 53.045],
                [-2.166, 53.045],
                [-2.166, 53.044],
              ],
            ],
          },
        },
      ],
    };
    const classified = loadAndClassify(collection);
    expect(classified[0]?.role).toBe("hazard");
    expect(classifySourceType(classified[0]!.props)).toBeNull();
    const result = generateStops(
      collection,
      mergeConfig({
        minLatitude: 53.03,
        minLongitude: -2.18,
        maxLatitude: 53.05,
        maxLongitude: -2.15,
      })
    );
    expect(result.accepted.length).toBe(0);
  });
});
