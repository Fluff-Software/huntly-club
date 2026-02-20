import { useCallback, useState } from "react";
import { useWindowDimensions, Dimensions, Platform } from "react-native";

/** Reference design size (logical pts) for phone portrait. */
export const REFERENCE_WIDTH = 390;
export const REFERENCE_HEIGHT = 844;

export type LayoutScale = {
  scaleW: (n: number) => number;
  width: number;
  height: number;
  isTablet: boolean;
};

/**
 * Detects if the device is a tablet based on screen dimensions.
 */
function detectTablet(): boolean {
  const { width, height } = Dimensions.get("screen");
  const shortestDimension = Math.min(width, height);
  
  if (Platform.OS === "ios") {
    return shortestDimension >= 700;
  }
  return shortestDimension >= 600;
}

/**
 * Returns scaleW and window dimensions. Use for responsive layout
 * so designs based on REFERENCE_WIDTH x REFERENCE_HEIGHT scale to any screen.
 * Uses the minimum scale factor between width and height to ensure content fits.
 */
export function useLayoutScale(): LayoutScale {
  const { width, height } = useWindowDimensions();
  const [isTablet] = useState(() => detectTablet());

  const scaleW = useCallback(
    (n: number) => {
      // Calculate scale factors for both dimensions
      const widthScale = width / REFERENCE_WIDTH;
      const heightScale = height / REFERENCE_HEIGHT;
      
      // Use the minimum to ensure content fits on screen
      // This prevents content from being cut off on devices with different aspect ratios
      const scale = Math.min(widthScale, heightScale);
      
      return Math.round(scale * n);
    },
    [width, height]
  );

  return { scaleW, width, height, isTablet };
}
