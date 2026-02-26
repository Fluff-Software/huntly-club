import { useMemo } from "react";

/**
 * App uses a single light theme for consistency across Android and iOS.
 * Returns "light" always; dark mode is not used.
 */
export function useColorScheme(): "light" {
  return useMemo(() => "light", []);
}
