import React, { useMemo } from "react";
import { View, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";

export interface StatCardProps {
  value: number | string;
  label: string;
  color: "pink" | "green";
}

const COLORS: Record<string, string> = {
  pink: "#FFB5B5",
  green: "#B5FFCE",
}

export function StatCard({
  value,
  label,
  color,
}: StatCardProps) {
  const { scaleW, scaleH } = useLayoutScale();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flex: 1,
          paddingVertical: scaleW(32),
          paddingHorizontal: scaleW(16),
          borderRadius: scaleW(20),
          alignItems: "center",
          justifyContent: "center",
          minHeight: scaleH(100),
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
          lineHeight: scaleH(18),
          fontWeight: "600",
          color: "#000",
        },
      }),
    [scaleW, scaleH]
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
