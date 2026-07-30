import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOCAL_OSM_GEOJSON_PATH } from "../config.js";
import {
  clearNearbyCache,
  getCachedAcceptedCoordinatesForTests,
  getNearbyStops,
} from "../server/nearby-stops.js";
import { validateNearbyQuery } from "../server/validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hasLocalExtract = fs.existsSync(LOCAL_OSM_GEOJSON_PATH);

const describeIfExtract = hasLocalExtract ? describe : describe.skip;

describe("validateNearbyQuery", () => {
  it("accepts a valid nearby request", () => {
    const params = new URLSearchParams({
      latitude: "53.0442",
      longitude: "-2.1656",
      radius_metres: "1000",
      generation_version: "2",
    });
    const result = validateNearbyQuery(params);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query.latitude).toBe(53.0442);
      expect(result.query.longitude).toBe(-2.1656);
      expect(result.query.radiusMetres).toBe(1000);
      expect(result.query.generationVersion).toBe(2);
    }
  });

  it("rejects invalid latitude", () => {
    const params = new URLSearchParams({
      latitude: "120",
      longitude: "-2.1656",
      radius_metres: "1000",
    });
    const result = validateNearbyQuery(params);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_latitude");
  });

  it("rejects invalid longitude", () => {
    const params = new URLSearchParams({
      latitude: "53.0442",
      longitude: "200",
      radius_metres: "1000",
    });
    const result = validateNearbyQuery(params);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_longitude");
  });

  it("rejects invalid radius", () => {
    const params = new URLSearchParams({
      latitude: "53.0442",
      longitude: "-2.1656",
      radius_metres: "0",
    });
    const result = validateNearbyQuery(params);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_radius");
  });

  it("rejects radius above maximum", () => {
    const params = new URLSearchParams({
      latitude: "53.0442",
      longitude: "-2.1656",
      radius_metres: "5000",
    });
    const result = validateNearbyQuery(params);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("radius_too_large");
  });

  it("rejects unsupported generation version", () => {
    const params = new URLSearchParams({
      latitude: "53.0442",
      longitude: "-2.1656",
      radius_metres: "1000",
      generation_version: "99",
    });
    const result = validateNearbyQuery(params);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("unsupported_generation_version");
  });
});

describeIfExtract("getNearbyStops (local OSM extract)", () => {
  const centre = {
    latitude: 53.0442,
    longitude: -2.1656,
    generationVersion: 2,
  };

  it(
    "returns only stops inside the requested radius, sorted by distance",
    () => {
      clearNearbyCache();
      const result = getNearbyStops({ ...centre, radiusMetres: 1000 });
      expect("error" in result).toBe(false);
      if ("error" in result) return;
      expect(result.stops.length).toBeGreaterThan(0);
      for (const stop of result.stops) {
        expect(stop.distance_metres).toBeLessThanOrEqual(1000);
      }
      for (let i = 1; i < result.stops.length; i++) {
        expect(result.stops[i]!.distance_metres).toBeGreaterThanOrEqual(
          result.stops[i - 1]!.distance_metres
        );
      }
    },
    60_000
  );

  it("rejects requests outside the supported test area", () => {
    const result = getNearbyStops({
      latitude: 51.5,
      longitude: -0.1,
      radiusMetres: 1000,
      generationVersion: 2,
    });
    expect(result).toMatchObject({ error: "outside_supported_test_area" });
  }, 30_000);

  it("returns identical output for identical requests", () => {
    const a = getNearbyStops({ ...centre, radiusMetres: 800 });
    const b = getNearbyStops({ ...centre, radiusMetres: 800 });
    expect(a).toEqual(b);
  }, 30_000);

  it("overlapping radii share the same stop IDs for shared stops", () => {
    const near = getNearbyStops({ ...centre, radiusMetres: 500 });
    const far = getNearbyStops({ ...centre, radiusMetres: 1500 });
    expect("error" in near).toBe(false);
    expect("error" in far).toBe(false);
    if ("error" in near || "error" in far) return;
    const farIds = new Set(far.stops.map((s) => s.stop_id));
    for (const stop of near.stops) {
      expect(farIds.has(stop.stop_id)).toBe(true);
      const match = far.stops.find((s) => s.stop_id === stop.stop_id)!;
      expect(match.latitude).toBe(stop.latitude);
      expect(match.longitude).toBe(stop.longitude);
    }
  }, 30_000);

  it("user coordinates do not alter generated stop coordinates", () => {
    const a = getNearbyStops({
      latitude: 53.04,
      longitude: -2.17,
      radiusMetres: 2000,
      generationVersion: 2,
    });
    const b = getNearbyStops({
      latitude: 53.048,
      longitude: -2.16,
      radiusMetres: 2000,
      generationVersion: 2,
    });
    expect("error" in a).toBe(false);
    expect("error" in b).toBe(false);
    if ("error" in a || "error" in b) return;
    const byIdA = new Map(a.stops.map((s) => [s.stop_id, s]));
    for (const stop of b.stops) {
      const other = byIdA.get(stop.stop_id);
      if (!other) continue;
      expect(other.latitude).toBe(stop.latitude);
      expect(other.longitude).toBe(stop.longitude);
    }
    const cached = getCachedAcceptedCoordinatesForTests();
    expect(cached.length).toBeGreaterThan(0);
    for (const stop of a.stops) {
      const row = cached.find((c) => c.stopId === stop.stop_id);
      expect(row?.latitude).toBe(stop.latitude);
      expect(row?.longitude).toBe(stop.longitude);
    }
  }, 30_000);

  it("does not write database artefacts under output during nearby queries", () => {
    const outputDir = path.join(__dirname, "..", "output");
    const before = fs.existsSync(outputDir)
      ? fs.readdirSync(outputDir).filter((f) => f.endsWith(".db") || f.includes("supabase"))
      : [];
    getNearbyStops({ ...centre, radiusMetres: 1000 });
    const after = fs.existsSync(outputDir)
      ? fs.readdirSync(outputDir).filter((f) => f.endsWith(".db") || f.includes("supabase"))
      : [];
    expect(after).toEqual(before);
  }, 30_000);
});
