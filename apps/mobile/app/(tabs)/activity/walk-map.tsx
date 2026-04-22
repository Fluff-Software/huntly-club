import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const FOREST_DARK = "#2D4A35";
const LIGHT_GREEN_BG = "#EEF5EE";
const HUNTLY_GREEN = "#4F6F52";

type Coords = {
  latitude: number;
  longitude: number;
};

export default function WalkMapScreen() {
  const router = useRouter();
  const { scaleW } = useLayoutScale();
  const [status, setStatus] = useState<"loading" | "denied" | "ready" | "error">("loading");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (perm.status !== "granted") {
          setStatus("denied");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setErrorMessage(e instanceof Error ? e.message : "Failed to get your location");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: FOREST_DARK },
        header: {
          backgroundColor: FOREST_DARK,
          paddingTop: scaleW(24),
          paddingBottom: scaleW(18),
          paddingHorizontal: scaleW(16),
          borderBottomLeftRadius: scaleW(28),
          borderBottomRightRadius: scaleW(28),
          flexDirection: "row",
          alignItems: "center",
        },
        backButton: {
          width: scaleW(42),
          height: scaleW(42),
          borderRadius: scaleW(21),
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.14)",
        },
        headerTextWrap: { flex: 1, alignItems: "center" },
        headerTitle: {
          fontSize: scaleW(22),
          fontWeight: "700",
          color: "#FFF",
          textAlign: "center",
        },
        headerSubtext: {
          marginTop: scaleW(4),
          fontSize: scaleW(14),
          color: "rgba(255,255,255,0.75)",
          textAlign: "center",
        },
        headerRightSpacer: { width: scaleW(42) },
        body: { flex: 1, backgroundColor: LIGHT_GREEN_BG },
        loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: scaleW(24) },
        message: { textAlign: "center", fontSize: scaleW(15), color: "#2F3336", marginTop: scaleW(12) },
        map: { flex: 1 },
        retryButton: {
          marginTop: scaleW(16),
          backgroundColor: HUNTLY_GREEN,
          borderRadius: scaleW(22),
          paddingVertical: scaleW(12),
          paddingHorizontal: scaleW(18),
        },
        retryText: { color: "#FFF", fontWeight: "800", textAlign: "center" as const },
      }),
    [scaleW]
  );

  const region = coords
    ? {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : null;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="chevron-left" size={scaleW(28)} color="#FFF" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <ThemedText type="heading" style={styles.headerTitle}>
            Your walk map
          </ThemedText>
          <ThemedText style={styles.headerSubtext}>
            Here&apos;s where you are right now.
          </ThemedText>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.body}>
        {status === "ready" && region ? (
          <MapView style={styles.map} initialRegion={region} showsUserLocation>
            <Marker coordinate={coords!} title="You are here" />
          </MapView>
        ) : (
          <View style={styles.loadingWrap}>
            {status === "loading" ? <ActivityIndicator size="large" color={HUNTLY_GREEN} /> : null}
            <ThemedText style={styles.message}>
              {status === "loading"
                ? "Getting your location…"
                : status === "denied"
                ? "Location permission is needed to show the map."
                : errorMessage ?? "Something went wrong while getting your location."}
            </ThemedText>
            {(status === "denied" || status === "error") && (
              <Pressable
                style={styles.retryButton}
                onPress={() => {
                  setStatus("loading");
                  setCoords(null);
                  setErrorMessage(null);
                  Location.requestForegroundPermissionsAsync()
                    .then((perm) => {
                      if (perm.status !== "granted") {
                        setStatus("denied");
                        return null;
                      }
                      return Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                      });
                    })
                    .then((pos) => {
                      if (!pos) return;
                      setCoords({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                      });
                      setStatus("ready");
                    })
                    .catch((e) => {
                      setErrorMessage(e instanceof Error ? e.message : "Failed to get your location");
                      setStatus("error");
                    });
                }}
              >
                <ThemedText style={styles.retryText}>Try again</ThemedText>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

