import { exploreClaimDay, msUntilExploreMidnight } from "@/utils/exploreDay";

describe("exploreClaimDay", () => {
  it("uses the UK calendar day, not UTC", () => {
    // 23:30 UTC on 7 Jul is 00:30 BST on 8 Jul.
    expect(exploreClaimDay(new Date("2026-07-07T23:30:00Z"))).toBe("2026-07-08");
    // In winter UK time equals UTC.
    expect(exploreClaimDay(new Date("2026-01-07T23:30:00Z"))).toBe("2026-01-07");
  });
});

describe("msUntilExploreMidnight", () => {
  it("counts down to UK midnight", () => {
    // 22:00 UK (BST) -> 2 hours.
    expect(msUntilExploreMidnight(new Date("2026-07-07T21:00:00Z"))).toBe(2 * 3600 * 1000);
    // 23:59:59 UK (GMT) -> 1 second.
    expect(msUntilExploreMidnight(new Date("2026-01-07T23:59:59Z"))).toBe(1000);
  });
});
