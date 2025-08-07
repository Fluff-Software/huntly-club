import { Text, type TextProps } from "react-native";
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

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  className,
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

  const getTypeClasses = () => {
    switch (type) {
      case "title":
        return "text-3xl font-bold text-huntly-forest leading-8";
      case "heading":
        return "text-2xl font-bold text-huntly-forest leading-7";
      case "subtitle":
        return "text-xl font-semibold text-huntly-forest leading-6";
      case "defaultSemiBold":
        return "text-base font-semibold text-huntly-forest leading-6";
      case "default":
        return "text-base text-huntly-forest leading-6";
      case "body":
        return "text-sm text-huntly-charcoal leading-5";
      case "caption":
        return "text-xs text-huntly-brown leading-4";
      case "link":
        return "text-base text-huntly-leaf font-medium leading-6";
      default:
        return "text-base text-huntly-forest leading-6";
    }
  };

  return (
    <Text
      className={`${getTypeClasses()} ${className || ""}`}
      style={[{ color }, style]}
      {...rest}
    />
  );
}
