import { useState } from "react";
import { Dimensions, Platform } from "react-native";

export type TabletInfo = {
  isTablet: boolean;
  isReady: boolean;
};

/**
 * Detects if the device is a tablet based on screen dimensions.
 * Tablets typically have a shortest dimension >= 600dp.
 */
function detectTablet(): boolean {
  const { width, height } = Dimensions.get("screen");
  const shortestDimension = Math.min(width, height);
  
  if (Platform.OS === "ios") {
    // iOS: iPads have a shortest dimension of 768+ (or 744 for iPad mini 6)
    return shortestDimension >= 700;
  }
  
  // Android: tablets are typically 600dp+ on shortest side
  return shortestDimension >= 600;
}

/**
 * Detects if the device is a tablet.
 * Note: Orientation locking requires a development build with expo-screen-orientation.
 * For now, this just detects tablet for scaling purposes.
 */
export function useTablet(): TabletInfo {
  const [isTablet] = useState(() => detectTablet());

  return { isTablet, isReady: true };
}
