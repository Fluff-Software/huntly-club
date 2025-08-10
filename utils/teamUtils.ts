import { ImageSourcePropType } from "react-native";

export type TeamName = "foxes" | "bears" | "otters";

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