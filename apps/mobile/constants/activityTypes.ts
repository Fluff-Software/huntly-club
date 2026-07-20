import type { ComponentProps } from "react";
import type { MaterialIcons } from "@expo/vector-icons";

export type ActivityTypeKey = "walk" | "cycle" | "mission" | "explore";

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
    key: "explore",
    label: "Explore",
    description: "Hunt for hidden card packs and grow your collection",
    icon: "explore",
    route: "/(tabs)/activity/explore-prep",
    color: "#3E63C9",
    tint: "#E5EAFB",
  },
];

export function getAvailableActivityTypes(platformOS: string): ActivityTypeMeta[] {
  return ACTIVITY_TYPES.filter(
    (type) => !type.unavailableOn?.includes(platformOS as "ios" | "android")
  );
}
