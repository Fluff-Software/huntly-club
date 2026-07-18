import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ActivityMap, type ActivityMapPoi, type ActivityMapRegion } from "@/components/activity-map";
import { ThemedText } from "@/components/ThemedText";
import { TrackingLocationAccessPrompt } from "@/components/TrackingLocationAccessPrompt";
import { describeTrackingLocationFailure, type TrackingLocationIssue } from "@/utils/trackingLocationPermission";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { metersBetween } from "@/utils/geo";
import {
  ensureExploreLocationPermission,
  getCurrentExploreLocation,
  watchExploreLocation,
  type ExploreLocationFix,
} from "@/services/exploreForegroundLocationService";
import {
  getActiveLocations,
  getVisitedLocationIds,
  type ExploreLocation,
} from "@/services/exploreLocationService";
import { checkInToLocation, type ExploreCheckInFailureReason } from "@/services/exploreCheckInService";

const FOREST_DARK = "#2D4A35";
const LIGHT_BG = "#EEF0F7";
const EXPLORE_BLUE = "#3E63C9";
const SHEET_BG = "#FFF";

const CHECK_IN_SEARCH_DELAY_MS = 700;

const FAILURE_MESSAGES: Record<ExploreCheckInFailureReason, string> = {
  not_authorized: "Something went wrong. Please try again.",
  location_inactive: "This location isn't available right now.",
  accuracy_too_poor: "Your location signal is a bit weak — try moving to an open area.",
  too_far: "You're not quite close enough yet — keep going!",
  rate_limited: "Hold on a moment before checking in again.",
  no_collectibles_configured: "Nothing to find here just yet — check back soon!",
};

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export default function ExploreMapScreen() {
  const router = useRouter();
  const { profileId: profileIdParam } = useLocalSearchParams<{ profileId?: string }>();
  const profileId = profileIdParam ? Number(profileIdParam) : null;
  const { scaleW } = useLayoutScale();

  const [status, setStatus] = useState<"loading" | "denied" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessIssue, setAccessIssue] = useState<TrackingLocationIssue | null>(null);
  const [coords, setCoords] = useState<ExploreLocationFix | null>(null);
  const [locations, setLocations] = useState<ExploreLocation[]>([]);
  const [visitedIds, setVisitedIds] = useState<Set<number>>(new Set());
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [checkInState, setCheckInState] = useState<"idle" | "searching">("idle");
  const [checkInError, setCheckInError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureExploreLocationPermission();
        const fix = await getCurrentExploreLocation();
        if (cancelled) return;
        setCoords(fix);
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
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    let subscription: { remove: () => void } | null = null;
    watchExploreLocation((fix) => {
      if (!cancelled) setCoords(fix);
    }).then((sub) => {
      if (cancelled) sub.remove();
      else subscription = sub;
    });
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [status]);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    Promise.all([getActiveLocations(), getVisitedLocationIds(profileId)])
      .then(([locs, visited]) => {
        if (cancelled) return;
        setLocations(locs);
        setVisitedIds(visited);
      })
      .catch(() => {
        // Non-fatal: the map still works with GPS, just without markers until retried.
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const pois: ActivityMapPoi[] = useMemo(
    () =>
      locations.map((loc) => ({
        id: loc.id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        radiusMeters: loc.radius_meters,
        imageUrl: loc.image_url,
        isDiscovered: visitedIds.has(loc.id),
      })),
    [locations, visitedIds]
  );

  const selectedLocation = useMemo(
    () => locations.find((loc) => loc.id === selectedLocationId) ?? null,
    [locations, selectedLocationId]
  );

  const distanceToSelected = useMemo(() => {
    if (!coords || !selectedLocation) return null;
    return metersBetween(coords, selectedLocation);
  }, [coords, selectedLocation]);

  const inRadius =
    distanceToSelected != null && selectedLocation != null && distanceToSelected <= selectedLocation.radius_meters;

  const region: ActivityMapRegion | null = coords
    ? { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : null;

  const handleCheckIn = async () => {
    if (!profileId || !selectedLocation || !coords || checkInState === "searching") return;
    setCheckInError(null);
    setCheckInState("searching");

    await new Promise((resolve) => setTimeout(resolve, CHECK_IN_SEARCH_DELAY_MS));

    try {
      const result = await checkInToLocation({
        profileId,
        locationId: selectedLocation.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyMeters: coords.accuracy,
      });

      if (!result.success) {
        setCheckInError(FAILURE_MESSAGES[result.failureReason]);
        setCheckInState("idle");
        return;
      }

      setCheckInState("idle");
      router.push({
        pathname: "/(tabs)/activity/explore-reveal",
        params: {
          profileId: String(profileId),
          result: JSON.stringify(result),
        },
      });
    } catch {
      setCheckInError("Something went wrong. Please try again.");
      setCheckInState("idle");
    }
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
          alignItems: "center" },
        iconButton: {
          width: scaleW(42),
          height: scaleW(42),
          borderRadius: scaleW(21),
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.14)" },
        headerTextWrap: { flex: 1, alignItems: "center" },
        headerTitle: { fontSize: scaleW(20), fontWeight: "700", color: "#FFF", textAlign: "center" },
        body: { flex: 1, backgroundColor: LIGHT_BG },
        sheet: {
          position: "absolute",
          left: scaleW(12),
          right: scaleW(12),
          bottom: scaleW(20),
          backgroundColor: SHEET_BG,
          borderRadius: scaleW(20),
          padding: scaleW(16),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 6 },
        sheetTitle: { fontSize: scaleW(17), fontWeight: "800", color: "#1A2333" },
        sheetTease: { fontSize: scaleW(14), color: "#555", marginTop: scaleW(4) },
        sheetDistance: { fontSize: scaleW(14), fontWeight: "700", color: EXPLORE_BLUE, marginTop: scaleW(8) },
        sheetError: { fontSize: scaleW(13), color: "#B3261E", marginTop: scaleW(8) },
        sheetButtons: { flexDirection: "row", gap: scaleW(10), marginTop: scaleW(14) },
        closeButton: {
          paddingVertical: scaleW(12),
          paddingHorizontal: scaleW(16),
          borderRadius: scaleW(22),
          borderWidth: 2,
          borderColor: EXPLORE_BLUE },
        closeButtonText: { color: EXPLORE_BLUE, fontWeight: "800" },
        checkInButton: {
          flex: 1,
          paddingVertical: scaleW(12),
          borderRadius: scaleW(22),
          backgroundColor: EXPLORE_BLUE,
          alignItems: "center",
          opacity: inRadius ? 1 : 0.45 },
        checkInButtonText: { color: "#FFF", fontWeight: "800" } }),
    [scaleW, inRadius]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="chevron-left" size={scaleW(28)} color="#FFF" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <ThemedText type="heading" style={styles.headerTitle}>
            World Explorer
          </ThemedText>
        </View>
        <Pressable
          onPress={() =>
            profileId &&
            router.push({
              pathname: "/(tabs)/activity/explore-collection",
              params: { profileId: String(profileId) },
            })
          }
          style={styles.iconButton}
        >
          <MaterialIcons name="collections-bookmark" size={scaleW(22)} color="#FFF" />
        </Pressable>
      </View>

      <View style={styles.body}>
        {status === "ready" && region ? (
          <View style={styles.body}>
            <ActivityMap
              style={StyleSheet.absoluteFill}
              initialRegion={region}
              route={[]}
              showUserLocation
              pois={pois}
              onPoiPress={(id) => {
                setSelectedLocationId(id);
                setCheckInError(null);
              }}
            />

            {selectedLocation && (
              <View style={styles.sheet}>
                <ThemedText type="heading" style={styles.sheetTitle}>
                  {selectedLocation.name}
                </ThemedText>
                <ThemedText style={styles.sheetTease}>
                  Something's here to discover — get close and check in to find out what.
                </ThemedText>
                {distanceToSelected != null && (
                  <ThemedText style={styles.sheetDistance}>
                    {inRadius ? "You're close enough to check in!" : `${formatDistance(distanceToSelected)} away`}
                  </ThemedText>
                )}
                {checkInError && <ThemedText style={styles.sheetError}>{checkInError}</ThemedText>}
                <View style={styles.sheetButtons}>
                  <Pressable
                    style={styles.closeButton}
                    onPress={() => {
                      setSelectedLocationId(null);
                      setCheckInError(null);
                    }}
                  >
                    <ThemedText style={styles.closeButtonText}>Close</ThemedText>
                  </Pressable>
                  <Pressable
                    style={styles.checkInButton}
                    disabled={!inRadius || checkInState === "searching"}
                    onPress={handleCheckIn}
                  >
                    {checkInState === "searching" ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <ThemedText style={styles.checkInButtonText}>Check In</ThemedText>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ) : (
          <TrackingLocationAccessPrompt
            status={status === "ready" ? "loading" : status}
            accessIssue={accessIssue}
            errorMessage={errorMessage}
            onRetry={() => {
              setStatus("loading");
              setCoords(null);
              setErrorMessage(null);
              setAccessIssue(null);
              ensureExploreLocationPermission()
                .then(() => getCurrentExploreLocation())
                .then((fix) => {
                  setCoords(fix);
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
    </SafeAreaView>
  );
}
