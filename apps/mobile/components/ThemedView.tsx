import { View, type ViewProps } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  className?: string;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  className,
  ...otherProps
}: ThemedViewProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor ?? darkColor, dark: darkColor ?? lightColor },
    "background"
  );

  return (
    <View
      className={`bg-huntly-cream ${className || ""}`}
      style={[{ backgroundColor }, style]}
      {...otherProps}
    />
  );
}
