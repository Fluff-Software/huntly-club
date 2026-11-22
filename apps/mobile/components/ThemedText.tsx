import { Text, type TextProps, StyleSheet } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { FONT } from "@/constants/fieldKit";

const HEAVY_WEIGHTS = new Set(["600", "700", "800", "900", "bold"]);
const DISPLAY_TYPES = new Set(["title", "heading", "subtitle"]);

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
    // Field kit type: Bricolage Grotesque for headings, Atkinson Hyperlegible for
    // body. Weight comes from the font file, not font-bold (custom fonts don't
    // synthesise weights reliably).
    case "title":
      return "text-3xl font-display";
    case "heading":
      return "text-2xl font-display";
    case "subtitle":
      return "text-xl font-display-bold";
    case "defaultSemiBold":
      return "text-base font-body-bold";
    case "default":
      return "text-base font-body";
    case "body":
      return "text-sm font-body";
    case "caption":
      return "text-xs font-body";
    case "link":
      return "text-base font-body-bold";
    default:
      return "text-base font-body";
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

  // A bold fontWeight on a single-weight custom font does nothing, so swap in the
  // bold font file instead (unless the caller chose a family themselves).
  const heavy = flatStyle.fontWeight != null && HEAVY_WEIGHTS.has(String(flatStyle.fontWeight));
  const weightStyle =
    heavy && !flatStyle.fontFamily
      ? { fontFamily: DISPLAY_TYPES.has(type) ? FONT.display : FONT.bodyBold, fontWeight: "normal" as const }
      : null;

  return (
    <Text
      className={`${typeClassName} ${className || ""}`}
      style={[{ color }, lineHeightStyle, style, weightStyle]}
      {...rest}
    />
  );
}
