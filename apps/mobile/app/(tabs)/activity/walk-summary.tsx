import React, { useMemo, useState } from "react";
import { BackHandler, View, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import MapView, { Marker, Polyline } from "react-native-maps";
import ConfettiCannon from "react-native-confetti-cannon";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { clearCurrentWalkSession, getCurrentWalkSession } from "../../../services/walkSessionService";
import { useFocusEffect } from "@react-navigation/native";

const FOREST_DARK = "#2D4A35";
const LIGHT_GREEN_BG = "#EEF5EE";
const CARD_BG = "#FFF";
const HUNTLY_GREEN = "#4F6F52";

function formatDurationMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  return `${hours}h ${remMins}m`;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export default function WalkSummaryScreen() {
  const router = useRouter();
  const { scaleW, isTablet } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const [confettiKey, setConfettiKey] = useState(0);

  const session = getCurrentWalkSession();

  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
      setConfettiKey((k) => k + 1);
      return () => sub.remove();
    }, [])
  );

  const computed = useMemo(() => {
    if (!session) return null;
    const started = new Date(session.startedAt).getTime();
    const ended = new Date(session.endedAt).getTime();
    return {
      durationMs: Math.max(0, ended - started),
      region:
        session.route.length > 0
          ? {
              latitude: session.route[session.route.length - 1]!.latitude,
              longitude: session.route[session.route.length - 1]!.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }
          : null,
      start: session.route[0] ?? null,
      end: session.route.length > 0 ? session.route[session.route.length - 1]! : null,
    };
  }, [session]);

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
        scroll: { flex: 1 },
        scrollContent: { padding: scaleW(16), paddingBottom: scaleW(140) },
        mapCard: {
          backgroundColor: CARD_BG,
          borderRadius: scaleW(16),
          overflow: "hidden",
          shadowColor: "#2D4A35",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2,
          marginBottom: scaleW(12),
        },
        map: { height: scaleW(220), width: "100%" },
        statsRow: { flexDirection: "row", gap: scaleW(10) },
        statCard: {
          flex: 1,
          backgroundColor: CARD_BG,
          borderRadius: scaleW(16),
          padding: scaleW(16),
          shadowColor: "#2D4A35",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2,
        },
        statLabel: { color: "#5a5a5a", fontSize: scaleW(13), fontWeight: "800" },
        statValue: { marginTop: scaleW(6), color: "#1A2E1E", fontSize: scaleW(20), fontWeight: "900" },
        confettiLayer: {
          ...StyleSheet.absoluteFillObject,
          zIndex: 9999,
          elevation: 9999,
          pointerEvents: "none" as const,
        },
        footer: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: scaleW(12),
          paddingHorizontal: scaleW(20),
          paddingBottom: insets.bottom + scaleW(12) + (isTablet ? scaleW(40) : 0),
          backgroundColor: LIGHT_GREEN_BG,
          borderTopWidth: 1,
          borderTopColor: "rgba(79,111,82,0.1)",
        },
        doneButton: {
          backgroundColor: HUNTLY_GREEN,
          borderRadius: scaleW(28),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(32),
          alignSelf: "stretch",
          alignItems: "center",
        },
        doneButtonText: { fontSize: scaleW(18), fontWeight: "800", color: "#FFF" },
        emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: scaleW(24) },
        emptyText: { textAlign: "center", fontSize: scaleW(15), color: "#2F3336", marginTop: scaleW(12) },
      }),
    [scaleW, insets.bottom, isTablet]
  );

  if (!session || !computed) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <View style={styles.headerRightSpacer} />
          <View style={styles.headerTextWrap}>
            <ThemedText type="heading" style={styles.headerTitle}>
              Walk summary
            </ThemedText>
            <ThemedText style={styles.headerSubtext}>No walk data found.</ThemedText>
          </View>
          <View style={styles.headerRightSpacer} />
        </View>
        <View style={styles.body}>
          <View style={styles.emptyWrap}>
            <MaterialIcons name="map" size={scaleW(34)} color={HUNTLY_GREEN} />
            <ThemedText style={styles.emptyText}>
              Head back to the map screen and complete a walk to see your stats.
            </ThemedText>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.confettiLayer} pointerEvents="none">
        <ConfettiCannon
          key={confettiKey}
          count={120}
          origin={{ x: 0, y: 0 }}
          fadeOut
          autoStart
          explosionSpeed={420}
          fallSpeed={2800}
        />
      </View>
      <View style={styles.header}>
        <View style={styles.headerRightSpacer} />
        <View style={styles.headerTextWrap}>
          <ThemedText type="heading" style={styles.headerTitle}>
            Walk complete
          </ThemedText>
          <ThemedText style={styles.headerSubtext}>Here’s what you covered.</ThemedText>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.body}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <View style={styles.mapCard}>
            <MapView
              style={styles.map}
              initialRegion={
                computed.region ?? {
                  latitude: 0,
                  longitude: 0,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }
              }
              scrollEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              zoomEnabled={false}
            >
              {session.route.length >= 2 && (
                <Polyline coordinates={session.route} strokeColor="#2D5A27" strokeWidth={6} />
              )}
              {computed.start && <Marker coordinate={computed.start} title="Start" />}
              {computed.end && <Marker coordinate={computed.end} title="Finish" />}
            </MapView>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Distance</ThemedText>
              <ThemedText type="heading" style={styles.statValue}>
                {formatDistance(session.distanceMeters)}
              </ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Time</ThemedText>
              <ThemedText type="heading" style={styles.statValue}>
                {formatDurationMs(computed.durationMs)}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.statsRow, { marginTop: scaleW(10) }]}>
            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Steps</ThemedText>
              <ThemedText type="heading" style={styles.statValue}>
                {session.steps == null ? "—" : `${session.steps}`}
              </ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Route points</ThemedText>
              <ThemedText type="heading" style={styles.statValue}>
                {session.route.length}
              </ThemedText>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer} pointerEvents="box-none">
          <Pressable
            style={styles.doneButton}
            onPress={() => {
              clearCurrentWalkSession();
              router.replace("/(tabs)");
            }}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <ThemedText type="heading" style={styles.doneButtonText}>
              Done
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

