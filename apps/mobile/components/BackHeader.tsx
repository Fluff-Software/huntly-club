import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { router, type Href } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useNavigationReturnOptional } from "@/contexts/NavigationReturnContext";

const COLORS = {
  white: "#FFFFFF",
  darkGreen: "#4F6F52",
  charcoal: "#2F3336",
};

type BackHeaderProps = {
  /** Label next to the back arrow. Defaults to "Back". */
  backToLabel?: string;
  /** Use "light" on light backgrounds (dark icon/text), "dark" on dark backgrounds (white icon/text). Default "dark". */
  variant?: "light" | "dark";
  /** When navigation history is empty, replace with this route instead of Clubhouse. */
  fallbackRoute?: Href;
  /** Optional hook before navigating back (e.g. stop media playback). */
  onBack?: () => void;
};

export function BackHeader({
  backToLabel = "Back",
  variant = "dark",
  fallbackRoute = "/(tabs)",
  onBack,
}: BackHeaderProps) {
  const navigationReturn = useNavigationReturnOptional();
  const { scaleW } = useLayoutScale();
  const isLight = variant === "light";
  const iconColor = isLight ? COLORS.darkGreen : COLORS.white;
  const labelColor = isLight ? COLORS.charcoal : COLORS.white;

  const onPress = () => {
    onBack?.();
    if (navigationReturn) {
      navigationReturn.goBack({ fallbackRoute });
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallbackRoute);
  };

  return (
    <Pressable
      onPress={onPress}
      style={[styles.wrap, { minHeight: scaleW(44), paddingVertical: scaleW(6) }]}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={backToLabel}
    >
      <MaterialIcons
        name="chevron-left"
        size={scaleW(28)}
        color={iconColor}
        style={{ marginRight: scaleW(4) }}
      />
      <ThemedText type="body" style={[styles.label, { color: labelColor, fontSize: scaleW(16) }]}>
        {backToLabel}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  label: {
    fontWeight: "600",
  },
});
