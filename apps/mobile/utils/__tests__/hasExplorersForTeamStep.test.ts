import { hasExplorersForTeamStep } from "../hasExplorersForTeamStep";

describe("hasExplorersForTeamStep", () => {
  it("returns false when both sign-up players and DB profiles are empty", () => {
    expect(hasExplorersForTeamStep([], [])).toBe(false);
  });

  it("returns true when there is at least one sign-up player", () => {
    expect(
      hasExplorersForTeamStep([{ name: "A", nickname: "n", colour: "#fff" }], [])
    ).toBe(true);
  });

  it("returns true when there is at least one DB profile", () => {
    expect(hasExplorersForTeamStep([], [{ id: "p1" }])).toBe(true);
  });
});
