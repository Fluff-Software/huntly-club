import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Modal, Animated, Easing, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import MapView, { Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { Pedometer } from "expo-sensors";
import * as ImagePicker from "expo-image-picker";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addWalkPhotoUri, getWalkPhotoUris, setCurrentWalkSession } from "../../../services/walkSessionService";

const FOREST_DARK = "#2D4A35";
const LIGHT_GREEN_BG = "#EEF5EE";
const HUNTLY_GREEN = "#4F6F52";
const CHECK_GREEN = "#2D5A27";

type Coords = {
  latitude: number;
  longitude: number;
};

type LatLng = {
  latitude: number;
  longitude: number;
};

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

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
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * (sinDLon * sinDLon);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export default function WalkMapScreen() {
  const router = useRouter();
  const { scaleW, isTablet } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<"loading" | "denied" | "ready" | "error">("loading");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stepsStatus, setStepsStatus] = useState<"loading" | "denied" | "unavailable" | "ready">("loading");
  const [steps, setSteps] = useState<number>(0);
  const [trail, setTrail] = useState<LatLng[]>([]);
  const mapRef = useRef<MapView | null>(null);
  const [currentRegion, setCurrentRegion] = useState<MapRegion | null>(null);
  const [startedAt] = useState<Date>(() => new Date());
  const [confirmVisible, setConfirmVisible] = useState(false);
  const confirmBackdropOpacity = useRef(new Animated.Value(0)).current;
  const confirmSheetY = useRef(new Animated.Value(32)).current;
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [photoCount, setPhotoCount] = useState(() => getWalkPhotoUris().length);

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

  useEffect(() => {
    if (status !== "ready") return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 2000,
            distanceInterval: 3,
          },
          (pos) => {
            if (cancelled) return;
            const next: LatLng = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            setCoords(next);
            setTrail((prev) => {
              if (prev.length === 0) return [next];
              const last = prev[prev.length - 1]!;
              if (metersBetween(last, next) < 2) return prev;
              return prev.concat(next);
            });
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

  useEffect(() => {
    let cancelled = false;
    let subscription: { remove: () => void } | null = null;
    const startedAt = new Date();

    (async () => {
      try {
        const isAvailable = await Pedometer.isAvailableAsync();
        if (cancelled) return;
        if (!isAvailable) {
          setStepsStatus("unavailable");
          return;
        }

        const perm = await Pedometer.requestPermissionsAsync();
        if (cancelled) return;
        if (!perm.granted) {
          setStepsStatus("denied");
          return;
        }

        setStepsStatus("ready");

        // Start with a baseline count since this screen opened.
        try {
          const initial = await Pedometer.getStepCountAsync(startedAt, new Date());
          if (!cancelled) setSteps(initial.steps ?? 0);
        } catch {
          // ignore; live watch below will still update on supported devices
        }

        subscription = Pedometer.watchStepCount((result) => {
          if (cancelled) return;
          // Some platforms report steps since subscription start.
          setSteps(result.steps ?? 0);
        });
      } catch {
        if (cancelled) return;
        setStepsStatus("unavailable");
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
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
        stepsOverlay: {
          position: "absolute" as const,
          top: scaleW(12),
          left: scaleW(12),
          backgroundColor: "rgba(0,0,0,0.35)",
          borderRadius: scaleW(18),
          paddingVertical: scaleW(8),
          paddingHorizontal: scaleW(10),
          gap: scaleW(6),
          zIndex: 5,
          elevation: 5,
        },
        stepsRow: { flexDirection: "row", alignItems: "center", gap: scaleW(6) },
        stepsOverlayText: { color: "#FFF", fontWeight: "800" as const, fontSize: scaleW(13) },
        statRow: { flexDirection: "row", alignItems: "center", gap: scaleW(6) },
        statsSubText: { color: "rgba(255,255,255,0.9)", fontWeight: "800" as const, fontSize: scaleW(12) },
        recenterButton: {
          position: "absolute" as const,
          right: scaleW(12),
          bottom: scaleW(12) + scaleW(104) + insets.bottom + (isTablet ? scaleW(20) : 0),
          width: scaleW(44),
          height: scaleW(44),
          borderRadius: scaleW(22),
          backgroundColor: "rgba(0,0,0,0.35)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 6,
          elevation: 6,
        },
        cameraButton: {
          position: "absolute" as const,
          left: scaleW(12),
          bottom: scaleW(12) + scaleW(104) + insets.bottom + (isTablet ? scaleW(20) : 0),
          width: scaleW(44),
          height: scaleW(44),
          borderRadius: scaleW(22),
          backgroundColor: "rgba(0,0,0,0.35)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 6,
          elevation: 6,
        },
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
          elevation: 7,
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.9)",
        },
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
          elevation: 10,
        },
        footerHint: {
          fontSize: scaleW(14),
          color: "#5a5a5a",
          textAlign: "center",
          marginBottom: scaleW(12),
        },
        completeButton: {
          backgroundColor: HUNTLY_GREEN,
          borderRadius: scaleW(28),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(32),
          alignSelf: "stretch",
          alignItems: "center",
        },
        completeButtonText: { fontSize: scaleW(18), fontWeight: "800", color: "#FFF" },
        retryButton: {
          marginTop: scaleW(16),
          backgroundColor: HUNTLY_GREEN,
          borderRadius: scaleW(22),
          paddingVertical: scaleW(12),
          paddingHorizontal: scaleW(18),
        },
        retryText: { color: "#FFF", fontWeight: "800", textAlign: "center" as const },
        modalBackdrop: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "flex-end",
        },
        modalSheet: {
          backgroundColor: LIGHT_GREEN_BG,
          borderTopLeftRadius: scaleW(22),
          borderTopRightRadius: scaleW(22),
          padding: scaleW(18),
          paddingBottom: insets.bottom + scaleW(16),
          borderTopWidth: 1,
          borderTopColor: "rgba(79,111,82,0.12)",
        },
        modalTitle: {
          fontSize: scaleW(18),
          fontWeight: "900",
          color: "#1A2E1E",
          textAlign: "center",
        },
        modalBody: {
          marginTop: scaleW(8),
          fontSize: scaleW(14),
          color: "#3a3a3a",
          textAlign: "center",
        },
        modalButtons: { marginTop: scaleW(16), gap: scaleW(10) },
        modalPrimary: {
          backgroundColor: CHECK_GREEN,
          borderRadius: scaleW(28),
          paddingVertical: scaleW(14),
          alignItems: "center",
        },
        modalPrimaryText: { fontSize: scaleW(16), fontWeight: "900", color: "#FFF" },
        modalSecondary: {
          backgroundColor: "rgba(79,111,82,0.10)",
          borderRadius: scaleW(28),
          paddingVertical: scaleW(14),
          alignItems: "center",
        },
        modalSecondaryText: { fontSize: scaleW(16), fontWeight: "900", color: HUNTLY_GREEN },
      }),
    [scaleW, insets.bottom, isTablet]
  );

  const region = coords
    ? {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : null;

  const handleRecenter = () => {
    if (!coords) return;
    const r = currentRegion ?? region;
    if (!r) return;
    mapRef.current?.animateToRegion(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: r.latitudeDelta,
        longitudeDelta: r.longitudeDelta,
      },
      350
    );
  };

  const distanceMeters = useMemo(() => {
    if (trail.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < trail.length; i++) {
      sum += metersBetween(trail[i - 1]!, trail[i]!);
    }
    return sum;
  }, [trail]);

  const durationMs = nowMs - startedAt.getTime();

  const openConfirm = () => {
    setConfirmVisible(true);
    confirmBackdropOpacity.setValue(0);
    confirmSheetY.setValue(32);
    Animated.parallel([
      Animated.timing(confirmBackdropOpacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(confirmSheetY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeConfirm = () => {
    Animated.parallel([
      Animated.timing(confirmBackdropOpacity, {
        toValue: 0,
        duration: 120,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(confirmSheetY, {
        toValue: 32,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setConfirmVisible(false);
    });
  };

  const confirmComplete = () => {
    const endedAt = new Date();
    setCurrentWalkSession({
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      steps: stepsStatus === "ready" ? steps : null,
      distanceMeters,
      route: trail,
      endedAtCoords: coords,
      photoUris: getWalkPhotoUris(),
    });
    closeConfirm();
    router.replace("/(tabs)/activity/walk-finish");
  };

  const takeWalkPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        addWalkPhotoUri(result.assets[0]!.uri);
        setPhotoCount(getWalkPhotoUris().length);
      }
    } catch {
      // ignore
    }
  };

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
          <View style={styles.map}>
            <MapView
              ref={(r) => {
                mapRef.current = r;
              }}
              style={StyleSheet.absoluteFill}
              initialRegion={region}
              showsUserLocation
              onRegionChangeComplete={(r) => setCurrentRegion(r as MapRegion)}
            >
              {trail.length >= 2 && (
                <Polyline
                  coordinates={trail}
                  strokeColor="#2D5A27"
                  strokeWidth={6}
                />
              )}
            </MapView>
            <View pointerEvents="none" style={styles.stepsOverlay}>
              <View style={styles.stepsRow}>
                <MaterialIcons name="directions-walk" size={scaleW(16)} color="#FFF" />
                <ThemedText type="heading" style={styles.stepsOverlayText}>
                  {stepsStatus === "ready"
                    ? `${steps} steps`
                    : stepsStatus === "loading"
                    ? "Steps…"
                    : "Steps off"}
                </ThemedText>
              </View>
              <View style={styles.statRow}>
                <MaterialIcons name="straighten" size={scaleW(15)} color="#FFF" />
                <ThemedText type="heading" style={styles.statsSubText}>{formatDistance(distanceMeters)}</ThemedText>
              </View>
              <View style={styles.statRow}>
                <MaterialIcons name="timer" size={scaleW(15)} color="#FFF" />
                <ThemedText type="heading" style={styles.statsSubText}>{formatDurationMs(durationMs)}</ThemedText>
              </View>
            </View>
            <Pressable
              onPress={handleRecenter}
              style={styles.recenterButton}
              accessibilityRole="button"
              accessibilityLabel="Recenter map"
            >
              <MaterialIcons name="my-location" size={scaleW(20)} color="#FFF" />
            </Pressable>
            <Pressable
              onPress={takeWalkPhoto}
              style={styles.cameraButton}
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
                {trail.length >= 2 ? "Ready when you are!" : "Start walking to record your route."}
              </ThemedText>
              <Pressable
                style={styles.completeButton}
                onPress={openConfirm}
                accessibilityRole="button"
                accessibilityLabel="Complete walk"
              >
                <ThemedText type="heading" style={styles.completeButtonText}>
                  Complete
                </ThemedText>
              </Pressable>
            </View>
          </View>
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
            {status === "denied" && (
              <Pressable style={styles.retryButton} onPress={() => Linking.openSettings()}>
                <ThemedText style={styles.retryText}>Open Settings</ThemedText>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="none"
        onRequestClose={closeConfirm}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.45)", opacity: confirmBackdropOpacity },
            ]}
          />
          <Pressable style={StyleSheet.absoluteFill} onPress={closeConfirm} />
          <Animated.View style={[styles.modalSheet, { transform: [{ translateY: confirmSheetY }] }]}>
            <ThemedText type="heading" style={styles.modalTitle}>
              Complete this walk?
            </ThemedText>
            <ThemedText style={styles.modalBody}>
              You’ll be taken to a summary screen with your route and stats.
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalPrimary}
                onPress={confirmComplete}
                accessibilityRole="button"
                accessibilityLabel="Yes, complete walk"
              >
                <ThemedText type="heading" style={styles.modalPrimaryText}>
                  Yes, complete
                </ThemedText>
              </Pressable>
              <Pressable
                style={styles.modalSecondary}
                onPress={closeConfirm}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <ThemedText type="heading" style={styles.modalSecondaryText}>
                  Keep walking
                </ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

