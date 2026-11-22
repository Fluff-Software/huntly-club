import type { ImageSourcePropType } from "react-native";
import { FK, type TeamKey } from "@/constants/fieldKit";

export type Guide = {
  team: TeamKey;
  teamName: "Bears" | "Foxes" | "Otters";
  teamSingular: string;
  guideName: "Bella" | "Felix" | "Oli";
  colour: string;
  traits: [string, string, string];
  tagline: string;
  portrait: ImageSourcePropType;
  waving: ImageSourcePropType;
  standing: ImageSourcePropType;
  badge: ImageSourcePropType;
};

export const GUIDES: Guide[] = [
  {
    team: "bears",
    teamName: "Bears",
    teamSingular: "Bear",
    guideName: "Bella",
    colour: FK.team.bears,
    traits: ["Brave", "Kind", "Curious"],
    tagline: "Bella never walks past a puddle.",
    portrait: require("@/assets/images/bella-close-smiling.png"),
    waving: require("@/assets/images/bella-waving.png"),
    standing: require("@/assets/images/bella-standing.png"),
    badge: require("@/assets/images/bears-badge.png"),
  },
  {
    team: "foxes",
    teamName: "Foxes",
    teamSingular: "Fox",
    guideName: "Felix",
    colour: FK.team.foxes,
    traits: ["Quick", "Creative", "Clever"],
    tagline: "Felix spots the clue everyone else missed.",
    portrait: require("@/assets/images/felix-close-smiling.png"),
    waving: require("@/assets/images/felix-waving.png"),
    standing: require("@/assets/images/felix-standing.png"),
    badge: require("@/assets/images/foxes-badge.png"),
  },
  {
    team: "otters",
    teamName: "Otters",
    teamSingular: "Otter",
    guideName: "Oli",
    colour: FK.team.otters,
    traits: ["Playful", "Observant", "Adventurous"],
    tagline: "Oli turns any walk into a treasure hunt.",
    portrait: require("@/assets/images/oli-close-smiling.png"),
    waving: require("@/assets/images/oli-waving.png"),
    standing: require("@/assets/images/oli-standing.png"),
    badge: require("@/assets/images/otters-badge.png"),
  },
];

export function guideForTeamName(name: string | null | undefined): Guide {
  const n = (name ?? "").toLowerCase();
  return GUIDES.find((g) => n.startsWith(g.team.slice(0, 3))) ?? GUIDES[0];
}
