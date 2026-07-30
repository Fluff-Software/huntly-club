import {
  ExploreStopsRequestError,
  getExploreStopsNear,
} from "@/services/exploreStopsService";
import { setDevExploreTransport } from "@/utils/exploreApiConfig";

describe("exploreStopsService", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.EXPO_PUBLIC_EXPLORE_API_URL;
  const originalTransport = process.env.EXPO_PUBLIC_EXPLORE_TRANSPORT;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_EXPLORE_API_URL = originalEnv;
    process.env.EXPO_PUBLIC_EXPLORE_TRANSPORT = originalTransport;
    setDevExploreTransport(null);
  });

  it("maps a valid local backend response into ExploreStop objects", async () => {
    setDevExploreTransport("local");
    process.env.EXPO_PUBLIC_EXPLORE_API_URL = "http://localhost:4310";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        generation_version: 2,
        test_area: {
          label: "Sneyd Green",
          bounding_box: {
            min_latitude: 53.0367,
            min_longitude: -2.1776,
            max_latitude: 53.0518,
            max_longitude: -2.1535,
          },
        },
        request: {
          latitude: 53.0442,
          longitude: -2.1656,
          radius_metres: 1000,
        },
        stops: [
          {
            stop_id: "stop_abc",
            latitude: 53.045,
            longitude: -2.164,
            distance_metres: 210,
            generation_version: 2,
            source_type: "footpath",
            source_feature_id: "way/1",
            confidence: 0.9,
            confidence_reasons: ["explicit_public_path"],
            environment_profile: { urban: 0.7 },
            review_flags: [],
            nearest_water_meters: 100,
            nearest_major_road_meters: null,
            nearest_school_meters: null,
            nearest_barrier_meters: null,
            nearest_barrier_type: null,
            distance_to_bbox_edge_meters: 50,
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await getExploreStopsNear({
      latitude: 53.0442,
      longitude: -2.1656,
      radiusMetres: 1000,
    });

    expect(result.stops).toHaveLength(1);
    expect(result.stops[0]?.stopId).toBe("stop_abc");
    expect(result.stops[0]?.distanceMetres).toBe(210);
    expect(result.generationVersion).toBe(2);
  });

  it("surfaces outside_supported_test_area as ExploreStopsRequestError", async () => {
    setDevExploreTransport("local");
    process.env.EXPO_PUBLIC_EXPLORE_API_URL = "http://localhost:4310";
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: "outside_supported_test_area",
        test_area: {
          label: "Sneyd Green",
          bounding_box: {
            min_latitude: 53.0367,
            min_longitude: -2.1776,
            max_latitude: 53.0518,
            max_longitude: -2.1535,
          },
        },
      }),
    }) as unknown as typeof fetch;

    await expect(
      getExploreStopsNear({
        latitude: 51.5,
        longitude: -0.1,
        radiusMetres: 1000,
      })
    ).rejects.toBeInstanceOf(ExploreStopsRequestError);
  });

  it("fails clearly when local transport is selected without API URL", async () => {
    setDevExploreTransport("local");
    delete process.env.EXPO_PUBLIC_EXPLORE_API_URL;
    await expect(
      getExploreStopsNear({
        latitude: 53.0442,
        longitude: -2.1656,
        radiusMetres: 1000,
      })
    ).rejects.toMatchObject({
      exploreError: { code: "not_configured" },
    });
  });
});
