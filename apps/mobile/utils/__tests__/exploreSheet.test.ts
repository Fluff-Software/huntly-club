import { closenessProgress, formatDistanceParts, warmthMessage } from "@/utils/exploreSheet";

describe("formatDistanceParts", () => {
  it("uses metres under a mile", () => {
    expect(formatDistanceParts(235.4)).toEqual({ value: "235", unit: "m" });
    expect(formatDistanceParts(0)).toEqual({ value: "0", unit: "m" });
  });

  it("switches to miles from one mile", () => {
    expect(formatDistanceParts(1609.344)).toEqual({ value: "1.0", unit: "miles" });
    expect(formatDistanceParts(2300)).toEqual({ value: "1.4", unit: "miles" });
    expect(formatDistanceParts(20000)).toEqual({ value: "12", unit: "miles" });
  });
});

describe("warmthMessage", () => {
  it("warms up as the child gets closer", () => {
    expect(warmthMessage(900, 50)).toBe("Head this way!");
    expect(warmthMessage(250, 50)).toBe("Getting warmer!");
    expect(warmthMessage(100, 50)).toBe("So close!");
    expect(warmthMessage(50, 50)).toBe("You made it!");
    expect(warmthMessage(10, 50)).toBe("You made it!");
  });
});

describe("closenessProgress", () => {
  it("is full in range, nearly empty far away, and always visible", () => {
    expect(closenessProgress(50, 50)).toBe(1);
    expect(closenessProgress(20, 50)).toBe(1);
    expect(closenessProgress(5000, 50)).toBeCloseTo(0.06);
  });

  it("fills steadily as the distance shrinks", () => {
    expect(closenessProgress(275, 50)).toBeCloseTo(0.5);
    expect(closenessProgress(150, 50)).toBeGreaterThan(closenessProgress(300, 50));
  });
});
