import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { SCAVENGER_GREEN } from "@/constants/scavengerTheme";
import { useLayoutScale } from "@/hooks/useLayoutScale";

type Props = {
  count: number;
};

/** Square count badge beside the quest title on the overview screen (OG Huntly parity). */
export function QuestToFindBadge({ count }: Props) {
  const { scaleW } = useLayoutScale();
  return (
    <View
      style={[
        styles.badge,
        {
          width: scaleW(72),
          height: scaleW(72),
          borderRadius: scaleW(16),
        },
      ]}
    >
      <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontSize: scaleW(28), fontWeight: "800", lineHeight: scaleW(32) }}>
        {count}
      </ThemedText>
      <ThemedText
        lightColor="#fff"
        darkColor="#fff"
        style={{ fontSize: scaleW(12), fontWeight: "700", textAlign: "center", marginTop: scaleW(-2) }}
      >
        To find
      </ThemedText>
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
  badge: {
    backgroundColor: SCAVENGER_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
});
