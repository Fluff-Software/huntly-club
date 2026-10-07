/**
 * Returns a theme color. App uses a single light theme; light/dark props are both accepted
 * for API compatibility, and either one is used so a single color ensures consistency.
 */

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAppTheme } from "@/contexts/AppThemeContext";

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light
) {
  const theme = useColorScheme();
  const { c } = useAppTheme();
  const colorFromProps = props[theme] ?? props[theme === "light" ? "dark" : "light"];

  if (colorFromProps) {
    return c(colorFromProps);
  }
  return c(Colors.light[colorName]);
}
