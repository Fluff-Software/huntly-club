import {
  ExploreStopsRequestError,
  claimExploreStop,
  getExploreStopsNear,
} from "@/services/exploreStopsService";
import { setDevExploreTransport } from "@/utils/exploreApiConfig";

jest.mock("@/services/supabase", () => ({
  supabase: {},
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
}));

jest.mock("@/services/authService", () => ({
  getCurrentSession: jest.fn(async () => ({
    session: { access_token: "token" },
  })),
}));

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

  describe("claimExploreStop", () => {
    const request = {
      stopId: "stop_abc",
      generationVersion: 2,
      osmRevision: "rev",
      profileId: 1,
      latitude: 53.0442,
      longitude: -2.1656,
      accuracyMetres: 8,
      idempotencyKey: "idem-1",
    };

    const successBody = JSON.stringify({
      success: true,
      claim: {
        claim_id: "1",
        stop_id: "stop_abc",
        generation_version: 2,
        claimed_at: "2026-07-31T09:00:00Z",
        verified_distance_metres: 10,
        profile_id: 1,
        awarded_card_id: "card_1",
      },
    });

    it("retries a gateway failure with the same idempotency key", async () => {
      setDevExploreTransport("edge");
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({ status: 502, text: async () => "Bad Gateway" })
        .mockResolvedValueOnce({ status: 200, text: async () => successBody });
      global.fetch = fetchMock as unknown as typeof fetch;

      const result = await claimExploreStop(request);

      expect(result.success).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const bodies = fetchMock.mock.calls.map((call: unknown[]) =>
        JSON.parse((call[1] as RequestInit).body as string)
      );
      expect(bodies[0].idempotency_key).toBe("idem-1");
      expect(bodies[1].idempotency_key).toBe("idem-1");
    }, 20_000);

    it("gives friendly copy once gateway retries are exhausted", async () => {
      setDevExploreTransport("edge");
      global.fetch = jest.fn().mockResolvedValue({
        status: 502,
        text: async () => "Bad Gateway",
      }) as unknown as typeof fetch;

      await expect(claimExploreStop(request)).rejects.toMatchObject({
        exploreError: { code: "backend_unavailable" },
      });
    }, 20_000);
  });
});
