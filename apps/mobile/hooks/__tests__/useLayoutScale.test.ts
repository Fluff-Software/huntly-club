import {
  REFERENCE_HEIGHT,
  REFERENCE_WIDTH,
  layoutScaleFactor,
} from "../useLayoutScale";

describe("layoutScaleFactor", () => {
  it("returns 0 for non-positive dimensions", () => {
    expect(layoutScaleFactor(0, 844)).toBe(0);
    expect(layoutScaleFactor(390, 0)).toBe(0);
    expect(layoutScaleFactor(-1, 844)).toBe(0);
  });

  it("uses 1 at the reference phone size", () => {
    expect(layoutScaleFactor(REFERENCE_WIDTH, REFERENCE_HEIGHT)).toBeCloseTo(1, 5);
  });

  it("limits scale by height on large portrait tablets (width would overscale)", () => {
    const w = 1024;
    const h = 1366;
    const byWidth = w / REFERENCE_WIDTH;
    const byHeight = h / REFERENCE_HEIGHT;
    expect(byWidth).toBeGreaterThan(byHeight);
    expect(layoutScaleFactor(w, h)).toBeCloseTo(byHeight, 5);
  });

  it("limits scale by height when the viewport is shorter than the reference aspect", () => {
    const w = 400;
    const h = 200;
    expect(layoutScaleFactor(w, h)).toBeCloseTo(h / REFERENCE_HEIGHT, 5);
  });

  it("limits scale by width on narrow tall viewports", () => {
    const w = 320;
    const h = 800;
    expect(w / REFERENCE_WIDTH).toBeLessThan(h / REFERENCE_HEIGHT);
    expect(layoutScaleFactor(w, h)).toBeCloseTo(w / REFERENCE_WIDTH, 5);
  });
});
