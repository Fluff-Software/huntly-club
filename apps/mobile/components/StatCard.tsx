import React, { useMemo } from "react";
import { View, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";

export interface StatCardProps {
  value: number | string;
  label: string;
  color: "pink" | "green" | "purple" | "cream";
}

const COLORS: Record<string, string> = {
  pink: "#FFB5B5",
  green: "#B5FFCE",
  purple: "#DCB5FF",
  cream: "#FFDAB5"
};

export function StatCard({
  value,
  label,
  color,
}: StatCardProps) {
  const { scaleW } = useLayoutScale();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          paddingVertical: scaleW(32),
          paddingHorizontal: scaleW(16),
          borderRadius: scaleW(20),
          alignItems: "center",
          justifyContent: "center",
          height: scaleW(150),
          width: scaleW(150),
        },
        valueText: {
          fontSize: scaleW(44),
          lineHeight: scaleW(52),
          marginBottom: scaleW(24),
          fontWeight: "600",
          color: "#000",
        },
        labelText: {
          fontSize: scaleW(16),
          lineHeight: scaleW(18),
          fontWeight: "600",
          color: "#000",
        },
      }),
    [scaleW]
  );

  return (
    <View style={[styles.card, { backgroundColor: COLORS[color] }]}>
      <ThemedText
        type="heading"
        style={[styles.valueText]}
        lightColor="#000"
        darkColor="#000"
      >
        {String(value)}
      </ThemedText>
      <ThemedText
        type="heading"
        style={[styles.labelText]}
        lightColor="#000"
        darkColor="#000"
      >
        {label}
      </ThemedText>
    </View>
  );
}
