import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import {
  SCAVENGER_BG_DEEP,
  SCAVENGER_GOLD_GRADIENT,
  scavengerGoldGlow,
} from "@/constants/scavengerTheme";
import { useLayoutScale } from "@/hooks/useLayoutScale";

type Props = {
  count: number;
};

/** Square count badge beside the quest title on the overview screen (OG Huntly parity). */
export function QuestToFindBadge({ count }: Props) {
  const { scaleW } = useLayoutScale();
  return (
    <View style={[styles.wrap, { borderRadius: scaleW(18) }]}>
      <LinearGradient
        colors={SCAVENGER_GOLD_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.badge,
          {
            width: scaleW(74),
            height: scaleW(74),
            borderRadius: scaleW(18),
          },
        ]}
      >
        <ThemedText
          lightColor={SCAVENGER_BG_DEEP}
          darkColor={SCAVENGER_BG_DEEP}
          style={{ fontSize: scaleW(30), fontWeight: "800", lineHeight: scaleW(34) }}
        >
          {count}
        </ThemedText>
        <ThemedText
          lightColor={SCAVENGER_BG_DEEP}
          darkColor={SCAVENGER_BG_DEEP}
          style={{ fontSize: scaleW(11), fontWeight: "800", textAlign: "center", marginTop: scaleW(-2), letterSpacing: 0.5 }}
        >
          TO FIND
        </ThemedText>
      </LinearGradient>
    </View>
  );
}

function formatWebsiteHost(url: string): string {
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return host.replace(/^www\./, "");
  } catch {
    return "website";
  }
}

export function websiteVisitLabel(url: string): string {
  return `Visit ${formatWebsiteHost(url)}`;
}

const styles = StyleSheet.create({
  wrap: {
    ...scavengerGoldGlow,
  },
  badge: {
    alignItems: "center",
    justifyContent: "center",
  },
});
