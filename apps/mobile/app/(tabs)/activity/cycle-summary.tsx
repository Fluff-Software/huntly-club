import React, { useMemo, useRef, useState } from "react";
import { BackHandler, Image, View, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import MapView, { Polyline } from "react-native-maps";
import ConfettiCannon from "react-native-confetti-cannon";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { clearCurrentCycleSession, getCurrentCycleSession } from "../../../services/cycleSessionService";
import { useFocusEffect } from "@react-navigation/native";
import { usePlayer } from "@/contexts/PlayerContext";

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

function formatSpeedKmh(distanceMeters: number, durationMs: number) {
  const sec = durationMs / 1000;
  if (sec <= 0) return "0 km/h";
  const kmh = (distanceMeters / 1000) / (sec / 3600);
  if (kmh < 10) return `${kmh.toFixed(1)} km/h`;
  return `${Math.round(kmh)} km/h`;
}

export default function CycleSummaryScreen() {
  const router = useRouter();
  const { scaleW, isTablet } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const [confettiKey, setConfettiKey] = useState(0);
  const mapRef = useRef<MapView | null>(null);
  const [currentRegion, setCurrentRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  const session = getCurrentCycleSession();
  const { profiles } = usePlayer();

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
    const durationMs = Math.max(0, ended - started);
    return {
      durationMs,
      region:
        session.route.length > 0
          ? {
              latitude: session.route[session.route.length - 1]!.latitude,
              longitude: session.route[session.route.length - 1]!.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }
          : null,
      end: session.route.length > 0 ? session.route[session.route.length - 1]! : null,
    };
  }, [session]);

  const handleRecenter = () => {
    if (!computed?.end) return;
    const r = currentRegion ?? computed.region;
    mapRef.current?.animateToRegion(
      {
        latitude: computed.end.latitude,
        longitude: computed.end.longitude,
        latitudeDelta: r?.latitudeDelta ?? 0.01,
        longitudeDelta: r?.longitudeDelta ?? 0.01,
      },
      350
    );
  };

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
        headerTextWrap: { flex: 1, alignItems: "center" },
        headerTitle: { fontSize: scaleW(22), fontWeight: "700", color: "#FFF", textAlign: "center" },
        headerSubtext: { marginTop: scaleW(4), fontSize: scaleW(14), color: "rgba(255,255,255,0.75)", textAlign: "center" },
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
        recenterButton: {
          position: "absolute" as const,
          right: scaleW(12),
          bottom: scaleW(12),
          width: scaleW(44),
          height: scaleW(44),
          borderRadius: scaleW(22),
          backgroundColor: "rgba(0,0,0,0.35)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 6,
          elevation: 6,
        },
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
        sectionTitle: { marginTop: scaleW(14), marginBottom: scaleW(10), fontSize: scaleW(16), fontWeight: "900", color: "#1A2E1E" },
        chipRow: { flexDirection: "row", flexWrap: "wrap", gap: scaleW(8) },
        chip: { backgroundColor: CARD_BG, borderRadius: scaleW(999), paddingVertical: scaleW(8), paddingHorizontal: scaleW(12), elevation: 1 },
        chipText: { fontSize: scaleW(13), fontWeight: "900", color: "#1A2E1E" },
        photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: scaleW(10) },
        photoThumb: { width: scaleW(98), height: scaleW(98), borderRadius: scaleW(14), backgroundColor: "#E6E6E6" },
        confettiLayer: { ...StyleSheet.absoluteFillObject, zIndex: 9999, elevation: 9999, pointerEvents: "none" as const },
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
              Cycle summary
            </ThemedText>
            <ThemedText style={styles.headerSubtext}>No cycle data found.</ThemedText>
          </View>
          <View style={styles.headerRightSpacer} />
        </View>
        <View style={styles.body}>
          <View style={styles.emptyWrap}>
            <MaterialIcons name="map" size={scaleW(34)} color={HUNTLY_GREEN} />
            <ThemedText style={styles.emptyText}>Head back and complete a cycle to see your stats.</ThemedText>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const selectedProfiles = session.selectedProfileIds ?? [];
  const selectedChips = selectedProfiles
    .map((id) => profiles.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => (p!.nickname || p!.name || "Explorer").trim())
    .filter(Boolean);

  const photoUris = session.photoUris ?? [];

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
            Cycle complete
          </ThemedText>
          <ThemedText style={styles.headerSubtext}>Here’s what you covered.</ThemedText>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.body}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
          <View style={styles.mapCard}>
            <MapView
              ref={(r) => {
                mapRef.current = r;
              }}
              style={styles.map}
              initialRegion={
                computed.region ?? {
                  latitude: 0,
                  longitude: 0,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }
              }
              scrollEnabled
              rotateEnabled={false}
              pitchEnabled={false}
              zoomEnabled
              onRegionChangeComplete={(r) => setCurrentRegion(r as any)}
            >
              {session.route.length >= 2 && <Polyline coordinates={session.route} strokeColor="#2D5A27" strokeWidth={6} />}
            </MapView>
            <Pressable onPress={handleRecenter} style={styles.recenterButton} accessibilityRole="button" accessibilityLabel="Recenter map">
              <MaterialIcons name="my-location" size={scaleW(20)} color="#FFF" />
            </Pressable>
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
              <ThemedText style={styles.statLabel}>Avg speed</ThemedText>
              <ThemedText type="heading" style={styles.statValue}>
                {formatSpeedKmh(session.distanceMeters, computed.durationMs)}
              </ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Route</ThemedText>
              <ThemedText type="heading" style={styles.statValue}>
                Saved
              </ThemedText>
            </View>
          </View>

          {selectedChips.length > 0 && (
            <>
              <ThemedText type="heading" style={styles.sectionTitle}>
                Explorers
              </ThemedText>
              <View style={styles.chipRow}>
                {selectedChips.map((name) => (
                  <View key={name} style={styles.chip}>
                    <ThemedText style={styles.chipText}>{name}</ThemedText>
                  </View>
                ))}
              </View>
            </>
          )}

          {photoUris.length > 0 && (
            <>
              <ThemedText type="heading" style={styles.sectionTitle}>
                Photos
              </ThemedText>
              <View style={styles.photoGrid}>
                {photoUris.map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                ))}
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.footer} pointerEvents="box-none">
          <Pressable
            style={styles.doneButton}
            onPress={() => {
              clearCurrentCycleSession();
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

