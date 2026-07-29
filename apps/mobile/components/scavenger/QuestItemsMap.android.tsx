import React, { useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import {
  Camera,
  Map,
  ViewAnnotation,
  UserLocation,
  type CameraRef,
} from "@maplibre/maplibre-react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { getMapTilerMapStyleUrl } from "@/constants/maptiler";
import type { ScavengerQuestItem } from "@/services/scavengerService";
import { SCAVENGER_CHECK } from "@/constants/scavengerTheme";
import { useDeferredNativeMount } from "@/components/activity-map/useDeferredNativeMount";

const DEV_MAP_STYLE = "https://demotiles.maplibre.org/style.json";
const UNFOUND_PIN = "#E8743B";

type Props = {
  items: ScavengerQuestItem[];
  foundIds: Set<string>;
  onMarkerPress: (item: ScavengerQuestItem) => void;
  userCoords?: { latitude: number; longitude: number } | null;
};

/** Map mode for hunts whose items carry coordinates — Android (MapLibre). */
export function QuestItemsMap({ items, foundIds, onMarkerPress, userCoords }: Props) {
  const cameraRef = useRef<CameraRef | null>(null);
  const canMountNative = useDeferredNativeMount();

  const located = useMemo(
    () => items.filter((i) => i.lat != null && i.lng != null),
    [items]
  );
  const first = located[0];

  const mapStyle = getMapTilerMapStyleUrl() ?? DEV_MAP_STYLE;

  const centerLat = userCoords?.latitude ?? first?.lat ?? 0;
  const centerLng = userCoords?.longitude ?? first?.lng ?? 0;

  if (!canMountNative) {
    return <View style={styles.map} />;
  }

  return (
    <Map style={styles.map} mapStyle={mapStyle} logo={false} attribution>
      <Camera
        ref={cameraRef}
        initialViewState={{
          center: [centerLng, centerLat],
          zoom: 14,
        }}
      />
      <UserLocation animated />
      {located.map((item) => (
        <ViewAnnotation
          key={item.id}
          id={item.id}
          lngLat={[item.lng!, item.lat!]}
          anchor="bottom"
          onSelect={() => onMarkerPress(item)}
        >
          <MaterialIcons
            name="location-on"
            size={32}
            color={foundIds.has(item.id) ? SCAVENGER_CHECK : UNFOUND_PIN}
          />
        </ViewAnnotation>
      ))}
    </Map>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
