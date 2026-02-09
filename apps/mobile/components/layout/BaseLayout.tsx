import { View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedView } from "@/components/ThemedView";
import { useColorScheme } from "@/hooks/useColorScheme";

interface BaseLayoutProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  edges?: Array<"top" | "right" | "bottom" | "left">;
  className?: string;
  contentClassName?: string;
}

export function BaseLayout({
  children,
  style,
  contentStyle,
  edges = ["top", "right", "bottom", "left"],
  className,
  contentClassName,
}: BaseLayoutProps) {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === "dark" ? "#2D5A27" : "#FFF8DC"; // huntly-forest : huntly-cream

  return (
    <SafeAreaView
      edges={edges}
      className={`flex-1 ${className || ""}`}
      style={[{ backgroundColor }, style]}
    >
      <ThemedView
        className={`flex-1 p-5 pb-2 ${contentClassName || ""}`}
        style={contentStyle}
      >
        {children}
      </ThemedView>
    </SafeAreaView>
  );
}
