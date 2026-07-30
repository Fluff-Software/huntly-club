import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOCAL_OSM_GEOJSON_PATH } from "../config.js";
import { createExploreServer } from "../server/index.js";
import {
  clearNearbyCache,
  findAcceptedStop,
  getAcceptedStops,
} from "../server/nearby-stops.js";
import {
  CLAIM_RADIUS_METRES,
  MAXIMUM_ACCEPTED_ACCURACY_METRES,
  validateVerifyBody,
  verifyExploreStop,
} from "../server/verify-stop.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hasLocalExtract = fs.existsSync(LOCAL_OSM_GEOJSON_PATH);
const describeIfExtract = hasLocalExtract ? describe : describe.skip;

function offsetMetres(
  latitude: number,
  longitude: number,
  northMetres: number,
  eastMetres: number
): { latitude: number; longitude: number } {
  const dLat = northMetres / 111_320;
  const dLon = eastMetres / (111_320 * Math.cos((latitude * Math.PI) / 180));
  return { latitude: latitude + dLat, longitude: longitude + dLon };
}

describe("validateVerifyBody", () => {
  it("rejects missing accuracy", () => {
    const result = validateVerifyBody({
      stop_id: "stop_x",
      generation_version: 2,
      reported_location: { latitude: 53.04, longitude: -2.16 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.result.error).toBe("invalid_accuracy");
  });

  it("rejects invalid latitude", () => {
    const result = validateVerifyBody({
      stop_id: "stop_x",
      generation_version: 2,
      reported_location: { latitude: 120, longitude: -2.16, accuracy_metres: 10 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.result.error).toBe("invalid_location");
  });

  it("rejects invalid longitude", () => {
    const result = validateVerifyBody({
      stop_id: "stop_x",
      generation_version: 2,
      reported_location: { latitude: 53.04, longitude: 200, accuracy_metres: 10 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.result.error).toBe("invalid_location");
  });

  it("rejects unsupported generation version", () => {
    const result = validateVerifyBody({
      stop_id: "stop_x",
      generation_version: 99,
      reported_location: { latitude: 53.04, longitude: -2.16, accuracy_metres: 10 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.result.error).toBe("unsupported_generation_version");
  });

  it("rejects empty stop id", () => {
    const result = validateVerifyBody({
      stop_id: "  ",
      generation_version: 2,
      reported_location: { latitude: 53.04, longitude: -2.16, accuracy_metres: 10 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.result.error).toBe("invalid_stop_id");
  });

  it("ignores client-supplied stop coordinates in the body", () => {
    const result = validateVerifyBody({
      stop_id: "stop_x",
      generation_version: 2,
      latitude: 0,
      longitude: 0,
      reported_location: {
        latitude: 53.04,
        longitude: -2.16,
        accuracy_metres: 10,
        // decoy nested fields must not become the request
      },
      stop: { latitude: 1, longitude: 2 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.reportedLocation.latitude).toBe(53.04);
      expect(result.request.reportedLocation.longitude).toBe(-2.16);
    }
  });
});

describeIfExtract("verifyExploreStop (local OSM extract)", () => {
  it(
    "accepts a valid stop within claim radius",
    () => {
      clearNearbyCache();
      const stops = getAcceptedStops(2);
      expect(stops.length).toBeGreaterThan(0);
      const stop = stops[0]!;
      const near = offsetMetres(stop.latitude, stop.longitude, 10, 0);
      const result = verifyExploreStop({
        stopId: stop.stopId,
        generationVersion: 2,
        reportedLocation: {
          latitude: near.latitude,
          longitude: near.longitude,
          accuracyMetres: 15,
        },
      });
      expect(result.valid).toBe(true);
      expect(result.claimable).toBe(true);
      if (result.claimable && result.valid) {
        expect(result.stop.stop_id).toBe(stop.stopId);
        expect(result.stop.latitude).toBe(stop.latitude);
        expect(result.stop.longitude).toBe(stop.longitude);
        expect(result.verification.distance_metres).toBeLessThanOrEqual(CLAIM_RADIUS_METRES);
        expect(result.verification.claim_radius_metres).toBe(CLAIM_RADIUS_METRES);
      }
    },
    60_000
  );

  it("returns too_far_away outside claim radius", () => {
    const stop = getAcceptedStops(2)[0]!;
    const far = offsetMetres(stop.latitude, stop.longitude, 100, 0);
    const result = verifyExploreStop({
      stopId: stop.stopId,
      generationVersion: 2,
      reportedLocation: {
        latitude: far.latitude,
        longitude: far.longitude,
        accuracyMetres: 15,
      },
    });
    expect(result.valid).toBe(true);
    expect(result.claimable).toBe(false);
    if (!result.claimable && result.valid) {
      expect(result.error).toBe("too_far_away");
      expect(result.verification?.distance_metres).toBeGreaterThan(CLAIM_RADIUS_METRES);
    }
  }, 30_000);

  it("rejects unknown stop ids", () => {
    const result = verifyExploreStop({
      stopId: "stop_does_not_exist_zzzz",
      generationVersion: 2,
      reportedLocation: { latitude: 53.0442, longitude: -2.1656, accuracyMetres: 10 },
    });
    expect(result).toEqual({
      valid: false,
      claimable: false,
      error: "stop_not_found",
    });
  }, 30_000);

  it("rejects poor GPS accuracy", () => {
    const stop = getAcceptedStops(2)[0]!;
    const result = verifyExploreStop({
      stopId: stop.stopId,
      generationVersion: 2,
      reportedLocation: {
        latitude: stop.latitude,
        longitude: stop.longitude,
        accuracyMetres: MAXIMUM_ACCEPTED_ACCURACY_METRES + 1,
      },
    });
    expect(result.valid).toBe(true);
    expect(result.claimable).toBe(false);
    if (!result.claimable && result.valid) {
      expect(result.error).toBe("gps_accuracy_too_low");
    }
  }, 30_000);

  it("works without calling the nearby endpoint first", () => {
    clearNearbyCache();
    const stop = getAcceptedStops(2)[0]!;
    const result = verifyExploreStop({
      stopId: stop.stopId,
      generationVersion: 2,
      reportedLocation: {
        latitude: stop.latitude,
        longitude: stop.longitude,
        accuracyMetres: 12,
      },
    });
    expect(result.claimable).toBe(true);
  }, 60_000);

  it("uses authoritative coordinates even when client claims otherwise", () => {
    const stop = getAcceptedStops(2)[0]!;
    const found = findAcceptedStop(stop.stopId, 2);
    expect(found?.latitude).toBe(stop.latitude);
    // User far away — must fail even if someone tried to spoof stop coords in memory
    const far = offsetMetres(stop.latitude, stop.longitude, 200, 0);
    const result = verifyExploreStop({
      stopId: stop.stopId,
      generationVersion: 2,
      reportedLocation: {
        latitude: far.latitude,
        longitude: far.longitude,
        accuracyMetres: 10,
      },
    });
    expect(result.claimable).toBe(false);
    if ("stop" in result && result.stop) {
      expect(result.stop.latitude).toBe(stop.latitude);
      expect(result.stop.longitude).toBe(stop.longitude);
    }
  }, 30_000);

  it("returns identical results for identical requests", () => {
    const stop = getAcceptedStops(2)[0]!;
    const near = offsetMetres(stop.latitude, stop.longitude, 5, 5);
    const req = {
      stopId: stop.stopId,
      generationVersion: 2,
      reportedLocation: {
        latitude: near.latitude,
        longitude: near.longitude,
        accuracyMetres: 20,
      },
    };
    expect(verifyExploreStop(req)).toEqual(verifyExploreStop(req));
  }, 30_000);

  it("does not write database artefacts during verification", () => {
    const outputDir = path.join(__dirname, "..", "output");
    const before = fs.existsSync(outputDir)
      ? fs.readdirSync(outputDir).filter((f) => f.endsWith(".db") || f.includes("supabase"))
      : [];
    const stop = getAcceptedStops(2)[0]!;
    verifyExploreStop({
      stopId: stop.stopId,
      generationVersion: 2,
      reportedLocation: {
        latitude: stop.latitude,
        longitude: stop.longitude,
        accuracyMetres: 10,
      },
    });
    const after = fs.existsSync(outputDir)
      ? fs.readdirSync(outputDir).filter((f) => f.endsWith(".db") || f.includes("supabase"))
      : [];
    expect(after).toEqual(before);
  }, 30_000);
});

describeIfExtract("POST /explore/stops/verify HTTP", () => {
  async function withServer(
    run: (base: string) => Promise<void>
  ): Promise<void> {
    const server = createExploreServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    try {
      await run(`http://127.0.0.1:${addr.port}`);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  }

  it("rejects malformed JSON", async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/explore/stops/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      });
      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: string };
      expect(json.error).toBe("invalid_request");
    });
  }, 30_000);

  it("rejects oversized request bodies", async () => {
    await withServer(async (base) => {
      const huge = "x".repeat(20_000);
      const res = await fetch(`${base}/explore/stops/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stop_id: "stop_x",
          generation_version: 2,
          padding: huge,
          reported_location: { latitude: 53.04, longitude: -2.16, accuracy_metres: 10 },
        }),
      });
      expect(res.status).toBe(413);
      const json = (await res.json()) as { error: string; details?: { reason?: string } };
      expect(json.error).toBe("invalid_request");
      expect(json.details?.reason).toBe("request_too_large");
    });
  }, 30_000);

  it("verifies a nearby stop over HTTP", async () => {
    clearNearbyCache();
    const stop = getAcceptedStops(2)[0]!;
    await withServer(async (base) => {
      const near = offsetMetres(stop.latitude, stop.longitude, 8, 0);
      const res = await fetch(`${base}/explore/stops/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stop_id: stop.stopId,
          generation_version: 2,
          // Spoofed stop coords must be ignored
          latitude: 0,
          longitude: 0,
          reported_location: {
            latitude: near.latitude,
            longitude: near.longitude,
            accuracy_metres: 12,
          },
        }),
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        claimable: boolean;
        stop: { latitude: number; longitude: number };
      };
      expect(json.claimable).toBe(true);
      expect(json.stop.latitude).toBe(stop.latitude);
      expect(json.stop.longitude).toBe(stop.longitude);
    });
  }, 60_000);
});
