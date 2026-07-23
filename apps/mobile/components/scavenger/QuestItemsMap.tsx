import React, { useMemo } from "react";
import { Platform, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import type { ScavengerQuestItem } from "@/services/scavengerService";
import { SCAVENGER_CHECK } from "@/constants/scavengerTheme";

const MAP_PROVIDER = Platform.OS === "android" ? PROVIDER_GOOGLE : undefined;
const UNFOUND_PIN = "#E8743B";

type Props = {
  items: ScavengerQuestItem[];
  foundIds: Set<string>;
  onMarkerPress: (item: ScavengerQuestItem) => void;
  userCoords?: { latitude: number; longitude: number } | null;
};

/** Map mode for hunts whose items carry coordinates. */
export function QuestItemsMap({
  items,
  foundIds,
  onMarkerPress,
  userCoords,
}: Props) {
  const located = useMemo(
    () => items.filter((i) => i.lat != null && i.lng != null),
    [items]
  );
  const first = located[0];

  const initialRegion = {
    latitude: userCoords?.latitude ?? first?.lat ?? 0,
    longitude: userCoords?.longitude ?? first?.lng ?? 0,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  return (
    <MapView
      provider={MAP_PROVIDER}
      style={styles.map}
      initialRegion={initialRegion}
      showsUserLocation
      showsMyLocationButton
    >
      {located.map((item) => (
        <Marker
          key={item.id}
          coordinate={{ latitude: item.lat!, longitude: item.lng! }}
          title={item.name}
          pinColor={foundIds.has(item.id) ? SCAVENGER_CHECK : UNFOUND_PIN}
          onCalloutPress={() => onMarkerPress(item)}
          onPress={() => onMarkerPress(item)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
