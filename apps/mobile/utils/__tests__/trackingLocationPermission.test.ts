import {
  TrackingPermissionError,
  getBackgroundTrackingPermissionAlertCopy,
  getTrackingLocationGuidance,
  isTrackingLocationAccessIssue,
  resolveTrackingLocationIssue,
} from "../trackingLocationPermission";

describe("resolveTrackingLocationIssue", () => {
  it("reads issue from TrackingPermissionError", () => {
    expect(resolveTrackingLocationIssue(new TrackingPermissionError("background_denied"))).toBe(
      "background_denied"
    );
  });

  it("maps known permission messages", () => {
    expect(
      resolveTrackingLocationIssue(
        new Error("Background location permission is needed to keep tracking while the app is closed.")
      )
    ).toBe("background_denied");
    expect(
      resolveTrackingLocationIssue(new Error("Location permission is needed to track your adventure."))
    ).toBe("foreground_denied");
    expect(resolveTrackingLocationIssue(new Error("Not authorized to use location services"))).toBe(
      "location_services_disabled"
    );
  });

  it("returns null for unrelated errors", () => {
    expect(resolveTrackingLocationIssue(new Error("Network request failed"))).toBeNull();
  });
});

describe("isTrackingLocationAccessIssue", () => {
  it("is true for permission-related failures", () => {
    expect(isTrackingLocationAccessIssue(new TrackingPermissionError("foreground_denied"))).toBe(true);
    expect(isTrackingLocationAccessIssue(new Error("Not authorized to use location services"))).toBe(true);
  });
});

describe("getTrackingLocationGuidance", () => {
  it("includes platform-specific steps for background access", () => {
    const guidance = getTrackingLocationGuidance("background_denied");
    expect(guidance.title.length).toBeGreaterThan(0);
    expect(guidance.steps.length).toBeGreaterThanOrEqual(3);
    expect(guidance.steps.some((step) => /settings/i.test(step))).toBe(true);
  });
});

describe("getBackgroundTrackingPermissionAlertCopy", () => {
  it("names the exact option users should choose on the next screen", () => {
    const copy = getBackgroundTrackingPermissionAlertCopy();
    expect(copy.title.length).toBeGreaterThan(0);
    expect(copy.message).toMatch(/next screen/i);
    expect(copy.message + copy.title).toMatch(/always|all the time/i);
  });
});
