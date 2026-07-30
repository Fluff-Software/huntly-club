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

function typeClassesWithoutColor(type: NonNullable<ThemedTextProps["type"]>) {
  switch (type) {
    case "title":
      return "text-3xl font-bold font-jua";
    case "heading":
      return "text-2xl font-bold font-jua";
    case "subtitle":
      return "text-xl font-semibold font-jua";
    case "defaultSemiBold":
      return "text-base font-semibold font-comic-neue";
    case "default":
      return "text-base font-comic-neue";
    case "body":
      return "text-sm font-comic-neue";
    case "caption":
      return "text-xs font-comic-neue";
    case "link":
      return "text-base font-medium font-comic-neue";
    default:
      return "text-base font-comic-neue";
  }
}

function typeColorClass(type: NonNullable<ThemedTextProps["type"]>) {
  switch (type) {
    case "body":
      return "text-huntly-charcoal";
    case "caption":
      return "text-huntly-brown";
    case "link":
      return "text-huntly-leaf";
    default:
      return "text-huntly-forest";
  }
}

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  className,
  ...rest
}: ThemedTextProps) {
  const hasExplicitColor = lightColor != null || darkColor != null;
  const color = useThemeColor(
    { light: lightColor ?? darkColor, dark: darkColor ?? lightColor },
    "text"
  );

  // NativeWind color utilities can override the style color prop. Skip type
  // text-* classes when lightColor/darkColor is set so white-on-button CTAs stay visible.
  const typeClassName = hasExplicitColor
    ? typeClassesWithoutColor(type)
    : `${typeClassesWithoutColor(type)} ${typeColorClass(type)}`;

  // Extract fontSize from style if provided, calculate proportional lineHeight
  const flatStyle = StyleSheet.flatten(style) || {};
  const fontSize = flatStyle.fontSize;
  const lineHeightStyle = fontSize && !flatStyle.lineHeight
    ? { lineHeight: Math.round(fontSize * LINE_HEIGHT_MULTIPLIER) }
    : {};

  return (
    <Text
      className={`${typeClassName} ${className || ""}`}
      style={[{ color }, lineHeightStyle, style]}
      {...rest}
    />
  );
}
