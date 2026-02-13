import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const COLORS = {
  white: "#FFFFFF",
  darkGreen: "#4F6F52",
  charcoal: "#2F3336",
};

type BackHeaderProps = {
  /** Label next to the back arrow, e.g. "Your profile" */
  backToLabel: string;
  /** Use "light" on light backgrounds (dark icon/text), "dark" on dark backgrounds (white icon/text). Default "dark". */
  variant?: "light" | "dark";
};

export function BackHeader({ backToLabel, variant = "dark" }: BackHeaderProps) {
  const router = useRouter();
  const { scaleW } = useLayoutScale();
  const isLight = variant === "light";
  const iconColor = isLight ? COLORS.darkGreen : COLORS.white;
  const labelColor = isLight ? COLORS.charcoal : COLORS.white;

  return (
    <Pressable
      onPress={() => router.back()}
      style={[styles.wrap, { marginBottom: scaleW(16), paddingVertical: scaleW(8) }]}
      hitSlop={12}
    >
      <MaterialIcons
        name="chevron-left"
        size={scaleW(28)}
        color={iconColor}
        style={{ marginRight: scaleW(4) }}
      />
      <ThemedText type="body" style={[styles.label, { color: labelColor }]}>
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
    fontSize: 16,
    fontWeight: "600",
  },
});
