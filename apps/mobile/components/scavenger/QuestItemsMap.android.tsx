import React from "react";
import { StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { ScavengerQuestItem } from "@/services/scavengerService";
import { ThemedText } from "@/components/ThemedText";
import { SCAVENGER_GREEN } from "@/constants/scavengerTheme";

type Props = {
  items: ScavengerQuestItem[];
  foundIds: Set<string>;
  onMarkerPress: (item: ScavengerQuestItem) => void;
  userCoords?: { latitude: number; longitude: number } | null;
};

/**
 * react-native-maps is excluded from Android autolinking in this app (MapLibre is used
 * instead, see ActivityMap.android.tsx) — QuestItemsMap.ios.tsx can't run here. This is a
 * placeholder until the pin/marker view gets a MapLibre implementation; list view still works.
 */
export function QuestItemsMap(_props: Props) {
  return (
    <View style={styles.container}>
      <MaterialIcons name="map" size={40} color={SCAVENGER_GREEN} />
      <ThemedText style={styles.text}>
        Map view isn't available on this device yet — use the list view to keep exploring.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  text: {
    textAlign: "center",
    color: "#5a6a5c",
    fontSize: 14,
    lineHeight: 20,
  },
});
