import {
  DEFAULT_TAILWIND_CHANNELS,
  HALLOWEEN_THEME,
  TAILWIND_THEME_TOKENS,
  remapColor,
} from "@/constants/appThemes";

describe("remapColor", () => {
  it("is the identity when no theme is live", () => {
    expect(remapColor("#4F6F52", null)).toBe("#4F6F52");
  });

  it("remaps brand hexes case-insensitively and expands #RGB", () => {
    expect(remapColor("#4f6f52", HALLOWEEN_THEME)).toBe("#3B1F5E");
    expect(remapColor("#FFF8DC", HALLOWEEN_THEME)).toBe("#FFE9CC");
  });

  it("keeps the alpha when remapping rgba()", () => {
    expect(remapColor("rgba(79,111,82,0.82)", HALLOWEEN_THEME)).toBe("rgba(59,31,94,0.82)");
  });

  it("leaves unknown colours (and white/black) alone", () => {
    expect(remapColor("#FFFFFF", HALLOWEEN_THEME)).toBe("#FFFFFF");
    expect(remapColor("rgba(0,0,0,0.45)", HALLOWEEN_THEME)).toBe("rgba(0,0,0,0.45)");
    expect(remapColor("transparent", HALLOWEEN_THEME)).toBe("transparent");
  });
});

describe("tailwind channels", () => {
  it("defines a themed value for every token the app can override", () => {
    for (const token of TAILWIND_THEME_TOKENS) {
      expect(HALLOWEEN_THEME.tailwind[token]).toMatch(/^\d+ \d+ \d+$/);
      expect(DEFAULT_TAILWIND_CHANNELS[token]).toMatch(/^\d+ \d+ \d+$/);
    }
  });
});
