import { Text, type TextProps, StyleSheet } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | "default"
    | "title"
    | "defaultSemiBold"
    | "subtitle"
    | "link"
    | "heading"
    | "body"
    | "caption";
};

const LINE_HEIGHT_MULTIPLIER = 1.4;

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  className,
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor(
    { light: lightColor ?? darkColor, dark: darkColor ?? lightColor },
    "text"
  );

  const getTypeClasses = () => {
    switch (type) {
      case "title":
        return "text-3xl font-bold text-huntly-forest font-jua";
      case "heading":
        return "text-2xl font-bold text-huntly-forest font-jua";
      case "subtitle":
        return "text-xl font-semibold text-huntly-forest font-jua";
      case "defaultSemiBold":
        return "text-base font-semibold text-huntly-forest font-comic-neue";
      case "default":
        return "text-base text-huntly-forest font-comic-neue";
      case "body":
        return "text-sm text-huntly-charcoal font-comic-neue";
      case "caption":
        return "text-xs text-huntly-brown font-comic-neue";
      case "link":
        return "text-base text-huntly-leaf font-medium font-comic-neue";
      default:
        return "text-base text-huntly-forest font-comic-neue";
    }
  };

  // Extract fontSize from style if provided, calculate proportional lineHeight
  const flatStyle = StyleSheet.flatten(style) || {};
  const fontSize = flatStyle.fontSize;
  const lineHeightStyle = fontSize && !flatStyle.lineHeight
    ? { lineHeight: Math.round(fontSize * LINE_HEIGHT_MULTIPLIER) }
    : {};

  return (
    <Text
      className={`${getTypeClasses()} ${className || ""}`}
      style={[{ color }, lineHeightStyle, style]}
      {...rest}
    />
  );
}
