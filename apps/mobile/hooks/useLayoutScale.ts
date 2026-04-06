import { useCallback, useState } from "react";
import { useWindowDimensions, Dimensions, Platform } from "react-native";

/** Reference design size (logical pts) for phone portrait. */
export const REFERENCE_WIDTH = 390;
export const REFERENCE_HEIGHT = 844;

/**
 * Uniform scale so layouts designed at REFERENCE_WIDTH × REFERENCE_HEIGHT fit on both dimensions.
 * Wide tablets use the height-limited factor so vertical spacing is not blown past the viewport.
 */
export function layoutScaleFactor(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 0;
  return Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT);
}

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
      const scale = layoutScaleFactor(width, height);
      return Math.round(scale * n);
    },
    [width, height]
  );

  return { scaleW, width, height, isTablet };
}
