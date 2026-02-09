import { useCallback } from "react";
import { useWindowDimensions } from "react-native";

/** Reference design size (logical pts). Layout is scaled to current window. */
export const REFERENCE_WIDTH = 390;
export const REFERENCE_HEIGHT = 844;

export type LayoutScale = {
  scaleW: (n: number) => number;
  scaleH: (n: number) => number;
  width: number;
  height: number;
};

/**
 * Returns scaleW, scaleH and window dimensions. Use for responsive layout
 * so designs based on REFERENCE_WIDTH x REFERENCE_HEIGHT scale to any screen.
 */
export function useLayoutScale(): LayoutScale {
  const { width, height } = useWindowDimensions();

  const scaleW = useCallback(
    (n: number) => Math.round((width / REFERENCE_WIDTH) * n),
    [width]
  );

  const scaleH = useCallback(
    (n: number) => Math.round((height / REFERENCE_HEIGHT) * n),
    [height]
  );

  return { scaleW, scaleH, width, height };
}
