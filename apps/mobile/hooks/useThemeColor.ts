/**
 * Returns a theme color. App uses a single light theme; light/dark props are both accepted
 * for API compatibility, and either one is used so a single color ensures consistency.
 */

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light
) {
  const theme = useColorScheme();
  const colorFromProps = props[theme] ?? props[theme === "light" ? "dark" : "light"];

  if (colorFromProps) {
    return colorFromProps;
  }
  return Colors.light[colorName];
}
