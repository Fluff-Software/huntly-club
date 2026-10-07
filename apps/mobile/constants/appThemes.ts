/**
 * Seasonal app themes.
 *
 * Which theme is live (and when) is data -- the `app_themes` table, edited in
 * the admin app. What a theme *looks like* is defined here, keyed by slug, so
 * a schedule can be changed without a release but a new look ships with an
 * update. When no theme is live the app uses its normal colours untouched.
 */

export type AppThemeSlug = "halloween";

export type AppThemePalette = {
  slug: AppThemeSlug;
  /**
   * Brand colour -> themed colour, keyed by upper-case #RRGGBB. Applied to
   * hex and rgba() strings by `remapColor` in the shared layout components.
   */
  remap: Record<string, string>;
  /** Tailwind colour tokens (see tailwind.config.js) as "R G B" channels. */
  tailwind: Partial<Record<TailwindThemeToken, string>>;
  /** Accent colours for themed decorations. */
  accent: { primary: string; secondary: string; glow: string };
};

/** Tailwind `huntly.*` tokens that are driven by CSS variables. */
export const TAILWIND_THEME_TOKENS = [
  "forest",
  "leaf",
  "sage",
  "mint",
  "sunshine",
  "amber",
  "peach",
  "sky",
  "ocean",
  "navy",
  "cream",
  "brown",
  "charcoal",
] as const;
export type TailwindThemeToken = (typeof TAILWIND_THEME_TOKENS)[number];

/** Normal-app channel values; must match the :root defaults in global.css. */
export const DEFAULT_TAILWIND_CHANNELS: Record<TailwindThemeToken, string> = {
  forest: "45 90 39",
  leaf: "74 124 89",
  sage: "127 176 105",
  mint: "168 213 186",
  sunshine: "255 217 61",
  amber: "255 165 0",
  peach: "255 179 71",
  sky: "135 206 235",
  ocean: "70 130 180",
  navy: "30 58 138",
  cream: "255 248 220",
  brown: "139 69 19",
  charcoal: "54 69 79",
};

export const HALLOWEEN_THEME: AppThemePalette = {
  slug: "halloween",
  remap: {
    // Greens -> purples / pumpkin orange
    "#4F6F52": "#3B1F5E",
    "#2D5A27": "#2A1245",
    "#4A7C59": "#6B3FA0",
    "#7FB069": "#FF7A1A",
    "#A8D5BA": "#CDB4EA",
    "#62A94F": "#FF8A2B",
    "#7FAF8A": "#9B6BD1",
    "#EEF5EE": "#F1E8FA",
    "#D8EDD8": "#E4D3F5",
    // Deep greens -> midnight
    "#2D4A35": "#1E0F36",
    "#1A2E1E": "#140A26",
    "#132414": "#0E0720",
    "#1E2E28": "#120A22",
    // Creams -> candlelight / moonlit lavender
    "#FFF8DC": "#FFE9CC",
    "#F4F0EB": "#F3EAF9",
    "#FFFDF7": "#FFF6EC",
    "#F8F7F4": "#F6EFFA",
    // Text
    "#36454F": "#2B1B3D",
    "#2F3336": "#2A1D38",
    // Warm accents -> pumpkin
    "#FFA500": "#FF7A1A",
    "#FFD93D": "#FFC21F",
    "#FFB347": "#FF9A3C",
    "#E07B20": "#E8650A",
    "#8B4513": "#6B3410",
    "#D2684B": "#E8700A",
    "#B07D3E": "#A0521D",
    // Blues -> twilight violet
    "#5B7FA6": "#5A3E8E",
    "#5B8A9E": "#4B3A7A",
  },
  tailwind: {
    forest: "42 18 69", // #2A1245
    leaf: "107 63 160", // #6B3FA0
    sage: "255 122 26", // #FF7A1A
    mint: "205 180 234", // #CDB4EA
    sunshine: "255 194 31", // #FFC21F
    amber: "255 122 26", // #FF7A1A
    peach: "255 154 60", // #FF9A3C
    sky: "155 107 209", // #9B6BD1
    ocean: "90 62 142", // #5A3E8E
    navy: "30 15 54", // #1E0F36
    cream: "255 233 204", // #FFE9CC
    brown: "107 52 16", // #6B3410
    charcoal: "43 27 61", // #2B1B3D
  },
  accent: { primary: "#FF7A1A", secondary: "#8B3FD9", glow: "#B8F000" },
};

export const APP_THEMES: Record<AppThemeSlug, AppThemePalette> = {
  halloween: HALLOWEEN_THEME,
};

export function isAppThemeSlug(value: unknown): value is AppThemeSlug {
  return typeof value === "string" && value in APP_THEMES;
}

/** Remap one colour string (#RRGGBB, #RGB or rgb[a](...)) through a palette. */
export function remapColor(color: string, palette: AppThemePalette | null): string {
  if (!palette || !color) return color;

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const raw = hex[1]!;
    const full = raw.length === 3 ? raw.replace(/./g, (ch) => ch + ch) : raw;
    return palette.remap[`#${full.toUpperCase()}`] ?? color;
  }

  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(color);
  if (rgba) {
    const key =
      "#" +
      [rgba[1], rgba[2], rgba[3]]
        .map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
    const mapped = palette.remap[key];
    if (!mapped) return color;
    const r = parseInt(mapped.slice(1, 3), 16);
    const g = parseInt(mapped.slice(3, 5), 16);
    const b = parseInt(mapped.slice(5, 7), 16);
    return rgba[4] == null ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${rgba[4]})`;
  }

  return color;
}
