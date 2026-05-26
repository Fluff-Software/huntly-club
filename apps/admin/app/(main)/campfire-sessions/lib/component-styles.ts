import type { CampfireComponentType } from "../types";

export const COMPONENT_BLOCK_CLASSES: Record<CampfireComponentType, string> = {
  audio: "border-amber-400 bg-amber-600/90",
  video: "border-indigo-400 bg-indigo-600/90",
  captain: "border-violet-400 bg-violet-600/90",
  subtitle: "border-sky-400 bg-sky-600/90",
  mission_card: "border-emerald-400 bg-emerald-600/90",
  submission: "border-rose-400 bg-rose-600/90",
};

export const PALETTE_CHIP_CLASSES: Record<CampfireComponentType, string> = {
  audio: "border-amber-500/60 bg-amber-950/50 text-amber-100",
  video: "border-indigo-400/60 bg-indigo-900/50 text-indigo-100",
  captain: "border-violet-400/60 bg-violet-900/50 text-violet-100",
  subtitle: "border-sky-500/60 bg-sky-950/50 text-sky-100",
  mission_card: "border-emerald-500/60 bg-emerald-950/50 text-emerald-100",
  submission: "border-rose-500/60 bg-rose-950/50 text-rose-100",
};
