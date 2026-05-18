import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Pressable, Modal, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ActivityMap,
  type ActivityMapRef,
  type ActivityMapRegion,
} from "@/components/activity-map";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { ThemedText } from "@/components/ThemedText";
import { TrackingLocationAccessPrompt } from "@/components/TrackingLocationAccessPrompt";
import {
  describeTrackingLocationFailure,
  type TrackingLocationIssue,
} from "@/utils/trackingLocationPermission";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useActiveTrackingSession } from "@/hooks/useActiveTrackingSession";
import {
  addTrackingPhotoUri,
  appendTrackingLocation,
  clearActiveTrackingSession,
  completeTrackingSession,
  refreshActiveTrackingLiveSurface,
  startTrackingSession,
  updateActiveTrackingSession,
} from "@/services/trackingSessionService";

const FOREST_DARK = "#2D4A35";
const LIGHT_GREEN_BG = "#EEF5EE";
const HUNTLY_GREEN = "#4F6F52";
const CHECK_GREEN = "#2D5A27";
const STOP_RED = "#B3261E";

type Coords = { latitude: number; longitude: number; timestamp?: number; accuracy?: number | null };
type LatLng = { latitude: number; longitude: number; timestamp?: number; accuracy?: number | null };
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

function metersBetween(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * (sinDLon * sinDLon);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export default function CycleMapScreen() {
  const router = useRouter();
  const { scaleW, isTablet } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<"loading" | "denied" | "ready" | "error">("loading");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessIssue, setAccessIssue] = useState<TrackingLocationIssue | null>(null);
  const [trail, setTrail] = useState<LatLng[]>([]);
  const mapRef = useRef<ActivityMapRef>(null);
  const [currentRegion, setCurrentRegion] = useState<ActivityMapRegion | null>(null);
  const [startedAt] = useState<Date>(() => new Date());
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [stopConfirmVisible, setStopConfirmVisible] = useState(false);
  const confirmBackdropOpacity = useRef(new Animated.Value(0)).current;
  const confirmSheetY = useRef(new Animated.Value(32)).current;
  const [nowMs, setNowMs] = useState(() => Date.now());
  const lastLiveSurfaceRefreshMsRef = useRef(0);
  const [photoCount, setPhotoCount] = useState(0);
  const { session: activeSession } = useActiveTrackingSession();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const trackingSession = await startTrackingSession("cycle");
        if (trackingSession.type !== "cycle") {
          router.replace("/(tabs)/activity/walk-map");
          return;
        }
        if (cancelled) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (cancelled) return;
        const next = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: pos.timestamp,
          accuracy: pos.coords.accuracy };
        setCoords(next);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        const failure = describeTrackingLocationFailure(e, "Failed to get your location");
        setAccessIssue(failure.issue);
        setErrorMessage(failure.errorMessage);
        setStatus(failure.status);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (status !== "ready") return;
    const id = setInterval(() => {
      const nextNowMs = Date.now();
      setNowMs(nextNowMs);
      if (nextNowMs - lastLiveSurfaceRefreshMsRef.current >= 1000) {
        lastLiveSurfaceRefreshMsRef.current = nextNowMs;
        void refreshActiveTrackingLiveSurface();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (!activeSession || activeSession.type !== "cycle") return;
    setTrail(activeSession.route);
    setPhotoCount(activeSession.photoUris?.length ?? 0);
    const latest = activeSession.endedAtCoords ?? activeSession.route[activeSession.route.length - 1] ?? null;
    if (latest) {
      setCoords({ latitude: latest.latitude, longitude: latest.longitude });
    }
  }, [activeSession]);

  useEffect(() => {
    if (activeSession?.status === "active" && activeSession.type === "walk") {
      router.replace("/(tabs)/activity/walk-map");
    }
  }, [activeSession, router]);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      try {
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 8 },
          (pos) => {
            if (cancelled) return;
            const next: LatLng = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              timestamp: pos.timestamp,
              accuracy: pos.coords.accuracy };
            setCoords(next);
            void appendTrackingLocation(next);
          }
        );
      } catch (e) {
        if (cancelled) return;
        setErrorMessage(e instanceof Error ? e.message : "Failed to track your route");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [status]);

  const region = coords
    ? { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : null;

  const distanceMeters = useMemo(() => {
    if (trail.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < trail.length; i++) sum += metersBetween(trail[i - 1]!, trail[i]!);
    return sum;
  }, [trail]);

  const durationMs = nowMs - new Date(activeSession?.startedAt ?? startedAt).getTime();

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
          alignItems: "center" },
        backButton: {
          width: scaleW(42),
          height: scaleW(42),
          borderRadius: scaleW(21),
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.14)" },
        headerTextWrap: { flex: 1, alignItems: "center" },
        headerTitle: { fontSize: scaleW(22), fontWeight: "700", color: "#FFF", textAlign: "center" },
        headerSubtext: {
          marginTop: scaleW(4),
          fontSize: scaleW(14),
          color: "rgba(255,255,255,0.75)",
          textAlign: "center" },
        headerRightSpacer: { width: scaleW(42) },
        body: { flex: 1, backgroundColor: LIGHT_GREEN_BG },
        map: { flex: 1 },
        statsOverlay: {
          position: "absolute" as const,
          top: scaleW(12),
          left: scaleW(12),
          backgroundColor: "rgba(0,0,0,0.35)",
          borderRadius: scaleW(18),
          paddingVertical: scaleW(8),
          paddingHorizontal: scaleW(10),
          gap: scaleW(6),
          zIndex: 5,
          overflow: "hidden" },
        statRow: { flexDirection: "row", alignItems: "center", gap: scaleW(6) },
        statsText: { color: "rgba(255,255,255,0.9)", fontWeight: "900" as const, fontSize: scaleW(12) },
        mapOverlayButton: {
          backgroundColor: "rgba(0,0,0,0.35)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 6,
          overflow: "hidden" },
        recenterButton: {
          position: "absolute" as const,
          right: scaleW(12),
          bottom: scaleW(12) + scaleW(104) + insets.bottom + (isTablet ? scaleW(20) : 0),
          width: scaleW(44),
          height: scaleW(44),
          borderRadius: scaleW(22) },
        cameraButton: {
          position: "absolute" as const,
          left: scaleW(12),
          bottom: scaleW(12) + scaleW(104) + insets.bottom + (isTablet ? scaleW(20) : 0),
          width: scaleW(44),
          height: scaleW(44),
          borderRadius: scaleW(22) },
        cameraBadge: {
          position: "absolute" as const,
          top: -scaleW(6),
          right: -scaleW(6),
          minWidth: scaleW(18),
          height: scaleW(18),
          borderRadius: scaleW(9),
          backgroundColor: CHECK_GREEN,
          paddingHorizontal: scaleW(5),
          alignItems: "center",
          justifyContent: "center",
          zIndex: 7,
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.9)" },
        cameraBadgeText: { color: "#FFF", fontWeight: "900" as const, fontSize: scaleW(10) },
        footer: {
          position: "absolute" as const,
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: scaleW(12),
          paddingHorizontal: scaleW(20),
          paddingBottom: insets.bottom + scaleW(12) + (isTablet ? scaleW(40) : 0),
          backgroundColor: LIGHT_GREEN_BG,
          borderTopWidth: 1,
          borderTopColor: "rgba(79,111,82,0.1)",
          zIndex: 10,
          elevation: 10 },
        footerHint: {
          fontSize: scaleW(14),
          color: "#5a5a5a",
          textAlign: "center",
          marginBottom: scaleW(12) },
        footerActions: { flexDirection: "row", alignItems: "center", gap: scaleW(10) },
        stopButton: {
          width: scaleW(54),
          height: scaleW(54),
          borderRadius: scaleW(27),
          backgroundColor: STOP_RED,
          alignItems: "center",
          justifyContent: "center" },
        completeButton: {
          flex: 1,
          backgroundColor: HUNTLY_GREEN,
          borderRadius: scaleW(28),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(32),
          alignItems: "center" },
        completeButtonText: { fontSize: scaleW(18), fontWeight: "800", color: "#FFF" },
        modalBackdrop: { flex: 1, justifyContent: "flex-end" },
        modalSheet: {
          backgroundColor: LIGHT_GREEN_BG,
          borderTopLeftRadius: scaleW(22),
          borderTopRightRadius: scaleW(22),
          padding: scaleW(18),
          paddingBottom: insets.bottom + scaleW(16),
          borderTopWidth: 1,
          borderTopColor: "rgba(79,111,82,0.12)" },
        modalTitle: { fontSize: scaleW(18), fontWeight: "900", color: "#1A2E1E", textAlign: "center" },
        modalBody: { marginTop: scaleW(8), fontSize: scaleW(14), color: "#3a3a3a", textAlign: "center" },
        modalButtons: { marginTop: scaleW(16), gap: scaleW(10) },
        modalPrimary: { backgroundColor: CHECK_GREEN, borderRadius: scaleW(28), paddingVertical: scaleW(14), alignItems: "center" },
        modalDanger: { backgroundColor: STOP_RED, borderRadius: scaleW(28), paddingVertical: scaleW(14), alignItems: "center" },
        modalPrimaryText: { fontSize: scaleW(16), fontWeight: "900", color: "#FFF" },
        modalSecondary: { backgroundColor: "rgba(79,111,82,0.10)", borderRadius: scaleW(28), paddingVertical: scaleW(14), alignItems: "center" },
        modalSecondaryText: { fontSize: scaleW(16), fontWeight: "900", color: HUNTLY_GREEN } }),
    [scaleW, insets.bottom, isTablet]
  );

  const handleRecenter = () => {
    if (!coords) return;
    const r = currentRegion ?? region;
    if (!r) return;
    mapRef.current?.recenter({
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: r.latitudeDelta,
      longitudeDelta: r.longitudeDelta,
    });
  };

  const openConfirm = () => {
    setConfirmVisible(true);
    confirmBackdropOpacity.setValue(0);
    confirmSheetY.setValue(32);
    Animated.parallel([
      Animated.timing(confirmBackdropOpacity, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(confirmSheetY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  const closeConfirm = () => {
    Animated.parallel([
      Animated.timing(confirmBackdropOpacity, { toValue: 0, duration: 120, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(confirmSheetY, { toValue: 32, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setConfirmVisible(false);
    });
  };

  const takeCyclePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]?.uri) {
      const nextSession = await addTrackingPhotoUri(result.assets[0]!.uri);
      setPhotoCount(nextSession?.photoUris?.length ?? 0);
    }
  };

  const confirmComplete = async () => {
    await updateActiveTrackingSession({
      distanceMeters,
      route: trail,
      endedAtCoords: coords });
    await completeTrackingSession();
    closeConfirm();
    router.replace("/(tabs)/activity/cycle-finish");
  };

  const confirmStop = async () => {
    await clearActiveTrackingSession();
    setStopConfirmVisible(false);
    router.replace("/(tabs)/activity/pick-activity");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="chevron-left" size={scaleW(28)} color="#FFF" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <ThemedText type="heading" style={styles.headerTitle}>
            Your cycle map
          </ThemedText>
          <ThemedText style={styles.headerSubtext}>Track your ride as you go.</ThemedText>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.body}>
        {status === "ready" && region ? (
          <View style={styles.map}>
            <ActivityMap
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              initialRegion={region}
              route={trail}
              showUserLocation
              onRegionChange={setCurrentRegion}
            />

            <View pointerEvents="none" style={styles.statsOverlay}>
              <View style={styles.statRow}>
                <MaterialIcons name="straighten" size={scaleW(15)} color="#FFF" />
                <ThemedText type="heading" style={styles.statsText}>
                  {formatDistance(distanceMeters)}
                </ThemedText>
              </View>
              <View style={styles.statRow}>
                <MaterialIcons name="timer" size={scaleW(15)} color="#FFF" />
                <ThemedText type="heading" style={styles.statsText}>
                  {formatDurationMs(durationMs)}
                </ThemedText>
              </View>
            </View>

            <Pressable
              onPress={handleRecenter}
              style={[styles.mapOverlayButton, styles.recenterButton]}
              accessibilityRole="button"
              accessibilityLabel="Recenter map"
            >
              <MaterialIcons name="my-location" size={scaleW(20)} color="#FFF" />
            </Pressable>

            <Pressable
              onPress={takeCyclePhoto}
              style={[styles.mapOverlayButton, styles.cameraButton]}
              accessibilityRole="button"
              accessibilityLabel="Take a photo"
            >
              <MaterialIcons name="photo-camera" size={scaleW(20)} color="#FFF" />
              {photoCount > 0 && (
                <View pointerEvents="none" style={styles.cameraBadge}>
                  <ThemedText style={styles.cameraBadgeText}>{photoCount}</ThemedText>
                </View>
              )}
            </Pressable>

            <View style={styles.footer} pointerEvents="box-none">
              <ThemedText style={styles.footerHint}>
                {trail.length >= 2 ? "Ready when you are!" : "Start cycling to record your route."}
              </ThemedText>
              <View style={styles.footerActions}>
                <Pressable
                  style={styles.stopButton}
                  onPress={() => setStopConfirmVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Stop cycle"
                >
                  <MaterialIcons name="stop" size={scaleW(24)} color="#FFF" />
                </Pressable>
                <Pressable style={styles.completeButton} onPress={openConfirm} accessibilityRole="button" accessibilityLabel="Complete cycle">
                  <ThemedText type="heading" style={styles.completeButtonText}>
                    Complete
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <TrackingLocationAccessPrompt
            status={status as "loading" | "denied" | "error"}
            accessIssue={accessIssue}
            errorMessage={errorMessage}
            onRetry={() => {
              setStatus("loading");
              setCoords(null);
              setErrorMessage(null);
              setAccessIssue(null);
              startTrackingSession("cycle")
                .then((trackingSession) => {
                  if (trackingSession.type !== "cycle") {
                    router.replace("/(tabs)/activity/walk-map");
                    return null;
                  }
                  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                })
                .then((pos) => {
                  if (!pos) return;
                  const next = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    timestamp: pos.timestamp,
                    accuracy: pos.coords.accuracy };
                  setCoords(next);
                  setStatus("ready");
                })
                .catch((e) => {
                  const failure = describeTrackingLocationFailure(e, "Failed to get your location");
                  setAccessIssue(failure.issue);
                  setErrorMessage(failure.errorMessage);
                  setStatus(failure.status);
                });
            }}
          />
        )}
      </View>

      <Modal visible={confirmVisible} transparent animationType="none" onRequestClose={closeConfirm}>
        <View style={styles.modalBackdrop}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.45)", opacity: confirmBackdropOpacity }]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={closeConfirm} />
          <Animated.View style={[styles.modalSheet, { transform: [{ translateY: confirmSheetY }] }]}>
            <ThemedText type="heading" style={styles.modalTitle}>
              Complete this cycle?
            </ThemedText>
            <ThemedText style={styles.modalBody}>You’ll be taken to a summary screen with your route and stats.</ThemedText>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalPrimary} onPress={confirmComplete} accessibilityRole="button" accessibilityLabel="Yes, complete cycle">
                <ThemedText type="heading" style={styles.modalPrimaryText}>
                  Yes, complete
                </ThemedText>
              </Pressable>
              <Pressable style={styles.modalSecondary} onPress={closeConfirm} accessibilityRole="button" accessibilityLabel="Cancel">
                <ThemedText type="heading" style={styles.modalSecondaryText}>
                  Keep cycling
                </ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
      <Modal visible={stopConfirmVisible} transparent animationType="fade" onRequestClose={() => setStopConfirmVisible(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setStopConfirmVisible(false)} />
          <View style={styles.modalSheet}>
            <ThemedText type="heading" style={styles.modalTitle}>
              Stop this cycle?
            </ThemedText>
            <ThemedText style={styles.modalBody}>Your progress will be lost if you stop now.</ThemedText>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalDanger} onPress={confirmStop} accessibilityRole="button" accessibilityLabel="Yes, stop cycle">
                <ThemedText type="heading" style={styles.modalPrimaryText}>
                  Yes, stop
                </ThemedText>
              </Pressable>
              <Pressable style={styles.modalSecondary} onPress={() => setStopConfirmVisible(false)} accessibilityRole="button" accessibilityLabel="Keep cycling">
                <ThemedText type="heading" style={styles.modalSecondaryText}>
                  Keep cycling
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

