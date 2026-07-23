import type { ComponentProps } from "react";
import type { MaterialIcons } from "@expo/vector-icons";

export type ActivityTypeKey = "walk" | "cycle" | "mission" | "hunt";

/** Scavenger hunt catalog data hasn't been merged into production yet — keep the activity hidden from users until it has. */
export const SCAVENGER_HUNTS_ENABLED = false;

export type ActivityTypeMeta = {
  key: ActivityTypeKey;
  label: string;
  description: string;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  route: string;
  /** Accent color used for this activity type's icon and highlights. */
  color: string;
  /** Light tint of `color`, used as a tile/icon-bubble background. */
  tint: string;
  /** Platforms this activity type is unavailable on (e.g. Cycle needs background GPS, not available on Android). */
  unavailableOn?: Array<"ios" | "android">;
};

export const ACTIVITY_TYPES: ActivityTypeMeta[] = [
  {
    key: "walk",
    label: "Walk",
    description: "Explore on foot and discover things along the way",
    icon: "directions-walk",
    route: "/(tabs)/activity/walk-prep",
    color: "#4F6F52",
    tint: "#E3EFE1",
  },
  {
    key: "cycle",
    label: "Cycle",
    description: "Cover more ground and feel the wind as you ride",
    icon: "directions-bike",
    route: "/(tabs)/activity/cycle-prep",
    color: "#2A5FAB",
    tint: "#E1EAF7",
    unavailableOn: ["android"],
  },
  {
    key: "mission",
    label: "Mission",
    description: "Complete a challenge and earn rewards",
    icon: "flag",
    route: "/(tabs)/missions",
    color: "#C97B20",
    tint: "#FBEBDD",
  },
  {
    key: "hunt",
    label: "Hunt",
    description: "Find clues and complete a scavenger hunt outdoors",
    icon: "travel-explore",
    route: "/(tabs)/activity/scavenger",
    color: "#8B5A2B",
    tint: "#F3E8DC",
  },
];

export function getAvailableActivityTypes(platformOS: string): ActivityTypeMeta[] {
  return ACTIVITY_TYPES.filter((type) => {
    if (type.key === "hunt" && !SCAVENGER_HUNTS_ENABLED) return false;
    return !type.unavailableOn?.includes(platformOS as "ios" | "android");
  });
}
