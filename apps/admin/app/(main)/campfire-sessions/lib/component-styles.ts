import type { CampfireComponentType } from "../types";

export const COMPONENT_BLOCK_CLASSES: Record<CampfireComponentType, string> = {
  audio: "border-amber-400 bg-amber-600/90",
  video: "border-indigo-400 bg-indigo-600/90",
  captain: "border-violet-400 bg-violet-600/90",
  subtitle: "border-sky-400 bg-sky-600/90",
  mission_card: "border-emerald-400 bg-emerald-600/90",
  submission: "border-rose-400 bg-rose-600/90",
};

/** Filled chip styles for palette items and drag overlay (inset ring, no harsh borders). */
export const PALETTE_CHIP_CLASSES: Record<CampfireComponentType, string> = {
  audio:
    "bg-amber-950/50 text-amber-100 ring-amber-800/60 hover:bg-amber-950/70 hover:ring-amber-700/70",
  video:
    "bg-indigo-950/50 text-indigo-100 ring-indigo-800/60 hover:bg-indigo-950/70 hover:ring-indigo-700/70",
  captain:
    "bg-violet-950/50 text-violet-100 ring-violet-800/60 hover:bg-violet-950/70 hover:ring-violet-700/70",
  subtitle:
    "bg-sky-950/50 text-sky-100 ring-sky-800/60 hover:bg-sky-950/70 hover:ring-sky-700/70",
  mission_card:
    "bg-emerald-950/50 text-emerald-100 ring-emerald-800/60 hover:bg-emerald-950/70 hover:ring-emerald-700/70",
  submission:
    "bg-rose-950/50 text-rose-100 ring-rose-800/60 hover:bg-rose-950/70 hover:ring-rose-700/70",
};

export const PALETTE_ACCENT_BAR: Record<CampfireComponentType, string> = {
  audio: "bg-amber-500",
  video: "bg-indigo-500",
  captain: "bg-violet-500",
  subtitle: "bg-sky-500",
  mission_card: "bg-emerald-500",
  submission: "bg-rose-500",
};

export const PALETTE_HINTS: Record<CampfireComponentType, string> = {
  audio: "Sound track",
  video: "Video clip",
  captain: "Character on screen",
  subtitle: "Timed caption",
  mission_card: "Mission prompt",
  submission: "Approved photo",
};

export const PALETTE_GROUPS: {
  title: string;
  types: CampfireComponentType[];
}[] = [
  { title: "Media", types: ["audio", "video"] },
  {
    title: "On screen",
    types: ["captain", "subtitle", "mission_card", "submission"],
  },
];
