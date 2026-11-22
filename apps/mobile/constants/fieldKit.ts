/**
 * Field kit — Huntly World 2027 design foundations.
 *
 * One nav, one colour: the floating ink bar never changes colour between tabs.
 * Sunbeam means go: one cream action per screen.
 * Every child screen speaks: a play button sits beside any instruction.
 */
import type { TextStyle } from "react-native";

export const FK = {
  ink: "#10251B", // Night ink: text, nav bar, secondary CTAs
  moss: "#F2F4EC", // Moss paper: page background
  paper: "#FFFDF6", // Card surface on moss
  sunbeam: "#F4E7CC", // Cream: the one primary action
  sunbeamEdge: "#E2CFA8", // Keeps cream buttons defined on light paper
  forest: "#1E3B2C", // Deep forest: feature cards
  forestSoft: "#2B4A39",
  ember: "#E8642C", // Urgent / time-limited
  sky: "#DCEAF5", // Grown-up info panels
  skyInk: "#1F4B6E",
  muted: "#4F5F55", // Secondary text on light
  mutedOnDark: "#B9C9B4", // Secondary text on dark
  line: "#DDE3D3",
  white: "#FFFFFF",
  team: {
    otters: "#8E9419",
    bears: "#D97A2B",
    foxes: "#2F74D0",
  },
  rarity: {
    common: "#3E7BD6",
    uncommon: "#2E8B57",
    rare: "#6E47C7",
  },
} as const;

export const FONT = {
  display: "BricolageGrotesque_800ExtraBold",
  displayBold: "BricolageGrotesque_700Bold",
  body: "AtkinsonHyperlegibleNext_400Regular",
  bodyBold: "AtkinsonHyperlegibleNext_700Bold",
} as const;

export const RADIUS = { sm: 14, md: 20, lg: 28, pill: 999 } as const;

/** Type presets. Display runs 20–48, body 15–19 for early readers. */
export const TYPE = {
  hero: { fontFamily: FONT.display, fontSize: 40, lineHeight: 42, letterSpacing: -1, color: FK.ink },
  title: { fontFamily: FONT.display, fontSize: 30, lineHeight: 33, letterSpacing: -0.6, color: FK.ink },
  heading: { fontFamily: FONT.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.3, color: FK.ink },
  label: { fontFamily: FONT.displayBold, fontSize: 17, lineHeight: 21, color: FK.ink },
  eyebrow: {
    fontFamily: FONT.display,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: FK.muted,
  },
  body: { fontFamily: FONT.body, fontSize: 17, lineHeight: 25, color: FK.ink },
  bodySmall: { fontFamily: FONT.body, fontSize: 15, lineHeight: 21, color: FK.muted },
} satisfies Record<string, TextStyle>;

export type TeamKey = keyof typeof FK.team;

export function teamKeyFromName(name: string | null | undefined): TeamKey | null {
  const n = (name ?? "").toLowerCase();
  if (n.startsWith("otter")) return "otters";
  if (n.startsWith("bear")) return "bears";
  if (n.startsWith("fox")) return "foxes";
  return null;
}
