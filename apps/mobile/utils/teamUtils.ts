import { ImageSourcePropType } from "react-native";

export type TeamName = "foxes" | "bears" | "otters";

/** Config for the home screen team card (wave mascot + background) */
export type TeamCardConfig = {
  title: string;
  backgroundColor: string;
  waveImage: ImageSourcePropType;
};

const TEAM_CARD_CONFIG: Record<string, TeamCardConfig> = {
  bears: {
    title: "Bears",
    backgroundColor: "#EBCDBB",
    waveImage: require("@/assets/images/bear-wave.png"),
  },
  foxes: {
    title: "Foxes",
    backgroundColor: "#BBDCEB",
    waveImage: require("@/assets/images/fox-wave.png"),
  },
  otters: {
    title: "Otters",
    backgroundColor: "#EBEBBB",
    waveImage: require("@/assets/images/otter-wave.png"),
  },
};

/**
 * Get the config for the home screen team card (background color + wave image)
 * @param teamName - The name of the team (e.g. "Bears", "Foxes", "Otters")
 * @returns Config with title, backgroundColor, waveImage; defaults to Bears if unknown
 */
export function getTeamCardConfig(teamName: string | null | undefined): TeamCardConfig {
  const key = teamName?.toLowerCase();
  return TEAM_CARD_CONFIG[key ?? ""] ?? TEAM_CARD_CONFIG.bears;
}

/**
 * Get the image source for a team based on its name
 * @param teamName - The name of the team
 * @returns The image source or null if no image exists for the team
 */
export function getTeamImageSource(teamName: string): ImageSourcePropType | null {
  switch (teamName.toLowerCase()) {
    case "foxes":
      return require("@/assets/images/fox.png");
    case "bears":
      return require("@/assets/images/bear.png");
    case "otters":
      return require("@/assets/images/otter.png");
    default:
      return null;
  }
}

/**
 * Type guard to check if a team name has an associated image
 * @param teamName - The name of the team
 * @returns true if the team has an associated image
 */
export function hasTeamImage(teamName: string): boolean {
  const normalizedName = teamName.toLowerCase();
  return ["foxes", "bears", "otters"].includes(normalizedName);
}

/**
 * Get all available team images
 * @returns An object mapping team names to their image sources
 */
export function getAllTeamImages(): Record<TeamName, ImageSourcePropType> {
  return {
    foxes: require("@/assets/images/fox.png"),
    bears: require("@/assets/images/bear.png"),
    otters: require("@/assets/images/otter.png"),
  };
}