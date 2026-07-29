/**
 * Explore map — find nearby spots and claim cards.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { ThemedText } from "@/components/ThemedText";
import {
  ActivityMap,
  latitudeDeltaToZoom,
  regionFromCoordinate,
  type ActivityMapRef,
  type ActivityMapRegion,
} from "@/components/activity-map";
import { ExploreCardPackReveal } from "@/components/explore/ExploreCardPackReveal";
import { ExploreSafetyWarning } from "@/components/explore/ExploreSafetyWarning";
import { LocationPermissionModal } from "@/components/explore/LocationPermissionModal";
import { openLocationSettings } from "@/services/locationService";
import {
  EXPLORE_CLAIM_RADIUS_METRES,
  EXPLORE_DEV_GPS_PRESETS,
  EXPLORE_MAP_DEFAULT_DELTA,
  EXPLORE_MAP_FETCH_DEBOUNCE_MS,
  EXPLORE_MAP_KEEP_METRES,
  EXPLORE_MAP_MAX_RADIUS_METRES,
  EXPLORE_MAP_MIN_RADIUS_METRES,
  EXPLORE_MARKER,
  EXPLORE_MOVE_THRESHOLD_METRES,
  EXPLORE_TEST_AREA_CENTRE,
  isLowConfidenceStop,
  stopHasReviewFlags,
  type ExploreDevGpsPresetId,
} from "@/constants/exploreDebug";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  ExploreStopsRequestError,
  claimExploreStop,
  exploreUserMessage,
  getClaimedExploreStopIds,
  getExploreStopsNear,
} from "@/services/exploreStopsService";
import { metersBetween } from "@/services/trackingSessionService";
import type {
  ExploreAward,
  ExploreStop,
  ExploreStopsError,
} from "@/types/exploreStops";

const BG = "#2D4A35";
const PANEL = "#3D5F45";
const ACCENT = "#62A94F";
const FIXED_RADIUS_METRES = 1000;
const METRES_PER_MILE = 1609.34;

function formatExploreDistanceAway(metres: number): string {
  if (metres < METRES_PER_MILE) {
    return `${Math.round(metres)} m away`;
  }
  const miles = metres / METRES_PER_MILE;
  const rounded = miles >= 10 ? miles.toFixed(0) : miles.toFixed(1);
  return Number(rounded) === 1 ? "1 mile away" : `${rounded} miles away`;
}

type LocState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; latitude: number; longitude: number; accuracy: number | null }
  | { status: "denied" }
  | { status: "unavailable"; message: string };

type PackSession = {
  stop: ExploreStop;
  latitude: number;
  longitude: number;
  accuracyMetres: number;
  idempotencyKey: string;
  profileId: number;
};


function newIdempotencyKey(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function radiusMetresFromRegion(region: ActivityMapRegion): number {
  const halfLatM = (region.latitudeDelta / 2) * 111_320;
  const halfLonM =
    (region.longitudeDelta / 2) *
    111_320 *
    Math.max(0.2, Math.cos((region.latitude * Math.PI) / 180));
  const approx = Math.max(halfLatM, halfLonM);
  return Math.round(
    Math.min(
      EXPLORE_MAP_MAX_RADIUS_METRES,
      Math.max(EXPLORE_MAP_MIN_RADIUS_METRES, approx)
    )
  );
}

function mergeStopsAroundCenter(
  previous: ExploreStop[],
  incoming: ExploreStop[],
  center: { latitude: number; longitude: number }
): ExploreStop[] {
  const byId = new Map<string, ExploreStop>();
  for (const stop of previous) byId.set(stop.stopId, stop);
  for (const stop of incoming) byId.set(stop.stopId, stop);
  return [...byId.values()]
    .map((stop) => ({
      ...stop,
      distanceMetres: metersBetween(center, {
        latitude: stop.latitude,
        longitude: stop.longitude,
      }),
    }))
    .filter((stop) => stop.distanceMetres <= EXPLORE_MAP_KEEP_METRES)
    .sort((a, b) => a.distanceMetres - b.distanceMetres);
}

function playerStopColor(claimed: boolean): string {
  return claimed ? EXPLORE_MARKER.claimed : EXPLORE_MARKER.accepted;
}

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<ActivityMapRef>(null);
  const lastFetchAt = useRef<{ latitude: number; longitude: number } | null>(null);
  const fetchInFlight = useRef(false);
  const mapFetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMapFetch = useRef<{
    latitude: number;
    longitude: number;
    radius: number;
  } | null>(null);
  const { session, user } = useAuth();
  const { profiles } = usePlayer();

  const [loc, setLoc] = useState<LocState>({ status: "loading" });
  const [stops, setStops] = useState<ExploreStop[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingStops, setLoadingStops] = useState(false);
  const [mapFetchPending, setMapFetchPending] = useState(false);
  const [error, setError] = useState<ExploreStopsError | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [packSession, setPackSession] = useState<PackSession | null>(null);
  /** DEV: preview pack reveal (NEW seal) without a real claim. */

  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  /** Safety gate — must accept before using the map (Pokémon GO–style). */
  const [safetyAccepted, setSafetyAccepted] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationModalRequesting, setLocationModalRequesting] = useState(false);
  /** DEV: freeze GPS and report spoofed coords for claim testing. */
  const debugSpoofRef = useRef(false);
  const [debugSpoofActive, setDebugSpoofActive] = useState(false);

  useEffect(() => {
    if (profiles.length === 0) {
      setSelectedProfileId(null);
      return;
    }
    setSelectedProfileId((prev) =>
      prev != null && profiles.some((p) => p.id === prev) ? prev : profiles[0]!.id
    );
  }, [profiles]);

  const selected = useMemo(
    () => stops.find((s) => s.stopId === selectedId) ?? null,
    [stops, selectedId]
  );

  const distanceToSelectedMetres = useMemo(() => {
    if (!selected || loc.status !== "ready") return null;
    return metersBetween(
      { latitude: loc.latitude, longitude: loc.longitude },
      { latitude: selected.latitude, longitude: selected.longitude }
    );
  }, [selected, loc]);

  const withinClaimRange =
    distanceToSelectedMetres != null &&
    distanceToSelectedMetres <= EXPLORE_CLAIM_RADIUS_METRES;

  const refreshClaimed = useCallback(async (profileId: number) => {
    try {
      const result = await getClaimedExploreStopIds(profileId);
      setClaimedIds(new Set(result.stopIds));
    } catch {
      // Non-fatal — markers still load without claim history.
    }
  }, []);

  useEffect(() => {
    if (!session || selectedProfileId == null) {
      setClaimedIds(new Set());
      return;
    }
    void refreshClaimed(selectedProfileId);
  }, [session, selectedProfileId, refreshClaimed]);

  useEffect(() => {
    setClaimError(null);
    setPackSession(null);
  }, [selectedId]);

  const visibleStops = useMemo(
    () =>
      stops.filter(
        (s) => !isLowConfidenceStop(s) && !stopHasReviewFlags(s)
      ),
    [stops]
  );

  const markers = useMemo(
    () =>
      visibleStops.map((s) => {
        const claimed = claimedIds.has(s.stopId);
        return {
          id: s.stopId,
          latitude: s.latitude,
          longitude: s.longitude,
          color: playerStopColor(claimed),
          title: claimed ? "Collected" : "Explore spot",
          variant: "stop" as const,
          icon: claimed ? ("check" as const) : ("lock" as const),
        };
      }),
    [visibleStops, claimedIds]
  );

  const outsideCoverage =
    error?.code === "no_coverage" ||
    error?.code === "outside_supported_test_area";

  const emptyExploreHint =
    outsideCoverage || error?.code === "no_nearby_points";

  const showEmptyPanel =
    !selected &&
    !loadingStops &&
    loc.status === "ready" &&
    (emptyExploreHint || (visibleStops.length === 0 && !error));

  const initialRegion = useMemo(() => {
    if (loc.status === "ready") {
      return regionFromCoordinate(
        { latitude: loc.latitude, longitude: loc.longitude },
        EXPLORE_MAP_DEFAULT_DELTA
      );
    }
    return regionFromCoordinate(EXPLORE_TEST_AREA_CENTRE, EXPLORE_MAP_DEFAULT_DELTA);
  }, [loc]);

  const minZoomLevel = useMemo(
    () => latitudeDeltaToZoom(EXPLORE_MAP_DEFAULT_DELTA, initialRegion.latitude),
    [initialRegion.latitude]
  );

  const requestLocation = useCallback(async () => {
    setLoc({ status: "loading" });
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLoc({ status: "denied" });
        setLocationModalVisible(true);
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLoc({
        status: "ready",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    } catch {
      setLoc({
        status: "unavailable",
        message: "We couldn’t get your location. Check that Location Services are on, then try again.",
      });
    }
  }, []);

  const handleLocationModalEnable = useCallback(async () => {
    if (loc.status === "denied") {
      openLocationSettings();
      setLocationModalVisible(false);
      return;
    }
    setLocationModalRequesting(true);
    try {
      await requestLocation();
      setLocationModalVisible(false);
    } finally {
      setLocationModalRequesting(false);
    }
  }, [loc.status, requestLocation]);

  const fetchStops = useCallback(
    async (
      latitude: number,
      longitude: number,
      radius: number,
      options: { force?: boolean; merge?: boolean; quiet?: boolean } = {}
    ) => {
      const { force = false, merge = false, quiet = false } = options;
      if (fetchInFlight.current) {
        if (merge || quiet) {
          pendingMapFetch.current = { latitude, longitude, radius };
        }
        return;
      }
      if (!force && lastFetchAt.current) {
        const moved = metersBetween(lastFetchAt.current, { latitude, longitude });
        if (moved < EXPLORE_MOVE_THRESHOLD_METRES) return;
      }
      fetchInFlight.current = true;
      if (!quiet) setLoadingStops(true);
      else setMapFetchPending(true);
      if (!quiet) setError(null);
      try {
        const response = await getExploreStopsNear({
          latitude,
          longitude,
          radiusMetres: radius,
        });
        const center = { latitude, longitude };
        setStops((prev) =>
          merge
            ? mergeStopsAroundCenter(prev, response.stops, center)
            : response.stops
        );
        setError(null);
        lastFetchAt.current = { latitude, longitude };
        if (!merge && response.stops.length === 0) {
          setError({
            code: "no_nearby_points",
            message: "No Explore spots nearby right now. Try moving or panning the map.",
          });
        }
      } catch (err: unknown) {
        // Coverage / empty-area errors should not keep distant spots from a previous pan.
        const exploreCode =
          err instanceof ExploreStopsRequestError ? err.exploreError.code : null;
        if (
          !merge ||
          exploreCode === "no_coverage" ||
          exploreCode === "outside_supported_test_area"
        ) {
          setStops([]);
          setSelectedId(null);
        }
        if (err instanceof ExploreStopsRequestError) {
          setError({
            ...err.exploreError,
            message: exploreUserMessage(
              err.exploreError.code,
              err.exploreError.message
            ),
          });
        } else {
          setError({
            code: "backend_unavailable",
            message: exploreUserMessage(
              "backend_unavailable",
              "Explore is temporarily unavailable. Please try again in a moment."
            ),
          });
        }
      } finally {
        fetchInFlight.current = false;
        setLoadingStops(false);
        setMapFetchPending(false);
        const pending = pendingMapFetch.current;
        if (pending) {
          pendingMapFetch.current = null;
          void fetchStops(pending.latitude, pending.longitude, pending.radius, {
            merge: true,
            quiet: true,
          });
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!safetyAccepted) return;
    void requestLocation();
  }, [safetyAccepted, requestLocation]);

  useEffect(() => {
    if (loc.status !== "ready") return;
    void fetchStops(loc.latitude, loc.longitude, FIXED_RADIUS_METRES, {
      force: lastFetchAt.current == null,
      merge: lastFetchAt.current != null,
      quiet: lastFetchAt.current != null,
    });
  }, [loc, fetchStops]);

  useEffect(() => {
    if (loc.status !== "ready") return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    void (async () => {
      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 2000,
            distanceInterval: 5,
          },
          (pos) => {
            if (cancelled || debugSpoofRef.current) return;
            setLoc({
              status: "ready",
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          }
        );
      } catch {
        // Keep last known fix; claim refreshes GPS on demand.
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [loc.status]);

  useEffect(() => {
    return () => {
      if (mapFetchTimer.current) clearTimeout(mapFetchTimer.current);
    };
  }, []);

  const onMapRegionChange = useCallback(
    (region: ActivityMapRegion) => {
      if (mapFetchTimer.current) clearTimeout(mapFetchTimer.current);
      mapFetchTimer.current = setTimeout(() => {
        const radius = radiusMetresFromRegion(region);
        void fetchStops(region.latitude, region.longitude, radius, {
          merge: true,
          quiet: true,
          // Pan/zoom should always refetch — don't wait for the GPS move threshold.
          force: true,
        });
      }, EXPLORE_MAP_FETCH_DEBOUNCE_MS);
    },
    [fetchStops]
  );

  const centreOnUser = () => {
    if (loc.status !== "ready") return;
    mapRef.current?.recenter({
      latitude: loc.latitude,
      longitude: loc.longitude,
      latitudeDelta: EXPLORE_MAP_DEFAULT_DELTA,
      longitudeDelta: EXPLORE_MAP_DEFAULT_DELTA,
    });
  };

  const teleportToSelectedStop = useCallback(() => {
    if (!__DEV__ || !selected) return;
    debugSpoofRef.current = true;
    setDebugSpoofActive(true);
    setClaimError(null);
    setLoc({
      status: "ready",
      latitude: selected.latitude,
      longitude: selected.longitude,
      accuracy: 5,
    });
    mapRef.current?.recenter({
      latitude: selected.latitude,
      longitude: selected.longitude,
      latitudeDelta: EXPLORE_MAP_DEFAULT_DELTA,
      longitudeDelta: EXPLORE_MAP_DEFAULT_DELTA,
    });
  }, [selected]);

  const spoofToPreset = useCallback((presetId: ExploreDevGpsPresetId) => {
    if (!__DEV__) return;
    const preset = EXPLORE_DEV_GPS_PRESETS[presetId];
    debugSpoofRef.current = true;
    setDebugSpoofActive(true);
    setClaimError(null);
    setSelectedId(null);
    setLoc({
      status: "ready",
      latitude: preset.latitude,
      longitude: preset.longitude,
      accuracy: 5,
    });
    mapRef.current?.recenter({
      latitude: preset.latitude,
      longitude: preset.longitude,
      latitudeDelta: EXPLORE_MAP_DEFAULT_DELTA,
      longitudeDelta: EXPLORE_MAP_DEFAULT_DELTA,
    });
  }, []);

  const clearDebugSpoof = useCallback(() => {
    if (!__DEV__) return;
    debugSpoofRef.current = false;
    setDebugSpoofActive(false);
    void requestLocation();
  }, [requestLocation]);

  const openPack = useCallback(async () => {
    if (!selected || claiming || !withinClaimRange || packSession) return;
    setClaiming(true);
    setClaimError(null);
    try {
      if (!user || !session) {
        setClaimError("Sign in to collect this spot.");
        return;
      }
      if (selectedProfileId == null) {
        setClaimError("Create a player profile to collect cards.");
        return;
      }

      let report: {
        latitude: number;
        longitude: number;
        accuracyMetres: number;
      };

      if (__DEV__ && debugSpoofRef.current && loc.status === "ready") {
        report = {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracyMetres: 5,
        };
      } else {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        report = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMetres:
            position.coords.accuracy && position.coords.accuracy > 0
              ? position.coords.accuracy
              : 25,
        };
        setLoc({
          status: "ready",
          latitude: report.latitude,
          longitude: report.longitude,
          accuracy: position.coords.accuracy,
        });
      }

      const liveDistance = metersBetween(
        { latitude: report.latitude, longitude: report.longitude },
        { latitude: selected.latitude, longitude: selected.longitude }
      );
      if (liveDistance > EXPLORE_CLAIM_RADIUS_METRES) {
        setClaimError(
          exploreUserMessage(
            "too_far_away",
            "Get closer to this spot to collect the card."
          )
        );
        return;
      }

      // Open the pack only — claim waits until the user finishes the rip.
      setPackSession({
        stop: selected,
        latitude: report.latitude,
        longitude: report.longitude,
        accuracyMetres: report.accuracyMetres,
        idempotencyKey: newIdempotencyKey(),
        profileId: selectedProfileId,
      });
    } catch {
      setClaimError("Couldn’t prepare this pack. Please try again.");
    } finally {
      setClaiming(false);
    }
  }, [
    selected,
    claiming,
    withinClaimRange,
    packSession,
    user,
    session,
    selectedProfileId,
    loc,
  ]);

  const commitPackClaim = useCallback(async (): Promise<ExploreAward> => {
    if (!packSession) {
      throw new Error("Pack session expired. Try collecting again.");
    }
    const { stop, latitude, longitude, accuracyMetres, idempotencyKey, profileId } =
      packSession;

    try {
      const result = await claimExploreStop({
        stopId: stop.stopId,
        generationVersion: stop.generationVersion,
        osmRevision: stop.osmRevision,
        profileId,
        latitude,
        longitude,
        accuracyMetres,
        idempotencyKey,
      });

      if (result.success) {
        setClaimedIds((prev) => new Set(prev).add(stop.stopId));
        if (!result.award) {
          throw new Error("Collected, but no card came back. Check your binder.");
        }
        return result.award;
      }

      if (result.error === "already_claimed") {
        setClaimedIds((prev) => new Set(prev).add(stop.stopId));
        if (result.award) return result.award;
        throw new Error(exploreUserMessage("already_claimed"));
      }

      throw new Error(
        exploreUserMessage(
          result.error || "claim_failed",
          "Couldn’t collect this card. Please try again."
        )
      );
    } catch (err: unknown) {
      if (err instanceof ExploreStopsRequestError) {
        throw new Error(
          exploreUserMessage(err.exploreError.code, err.exploreError.message)
        );
      }
      throw err instanceof Error
        ? err
        : new Error("Couldn’t collect this card. Please try again.");
    }
  }, [packSession]);

  const closePack = useCallback(() => {
    setPackSession(null);

  }, []);

  const alreadyClaimed = selected ? claimedIds.has(selected.stopId) : false;

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ExploreSafetyWarning
        visible={!safetyAccepted}
        onAccept={() => setSafetyAccepted(true)}
        onCancel={() => router.back()}
      />
      <View style={styles.root}>
        <ActivityMap
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          route={[]}
          initialRegion={initialRegion}
          showUserLocation={loc.status === "ready"}
          markers={markers}
          minZoomLevel={minZoomLevel}
          maxZoomLevel={18}
          rotateEnabled={false}
          pitchEnabled={false}
          onRegionChange={onMapRegionChange}
          onMarkerPress={(id: string) => setSelectedId(id)}
        />

        {(loc.status === "loading" || loadingStops) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#FFF" />
          </View>
        )}

        {mapFetchPending && !loadingStops ? (
          <View
            style={[styles.mapFetchBadge, { top: insets.top + 12 }]}
            pointerEvents="none"
          >
            <ActivityIndicator color="#FFF" size="small" />
          </View>
        ) : null}

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.iconBtn}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </Pressable>
          <Pressable
            onPress={() => {
              const params: Record<string, string> = {};
              if (selectedProfileId != null) {
                params.profileId = String(selectedProfileId);
              }
              router.push({
                pathname: "/(tabs)/activity/explore-collection",
                params,
              });
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Open card binder"
            style={styles.iconBtn}
          >
            <MaterialIcons name="collections-bookmark" size={22} color="#FFF" />
          </Pressable>
        </View>

        {false && __DEV__ ? (
          <View style={[styles.devPresetBar, { top: insets.top + 60 }]}>
            <Pressable
              onPress={() => spoofToPreset("philippines")}
              style={styles.devBtn}
              accessibilityRole="button"
              accessibilityLabel="Spoof location to Manila, Philippines"
            >
              <MaterialIcons name="public" size={16} color="#FFE08A" />
              <ThemedText lightColor="#FFE08A" darkColor="#FFE08A" style={styles.devBtnText}>
                DEV: Manila
              </ThemedText>
            </Pressable>
            {debugSpoofActive ? (
              <Pressable
                onPress={clearDebugSpoof}
                style={styles.devBtnMuted}
                accessibilityRole="button"
                accessibilityLabel="Clear spoofed location"
              >
                <ThemedText
                  lightColor="rgba(255,255,255,0.7)"
                  darkColor="rgba(255,255,255,0.7)"
                  style={styles.devBtnText}
                >
                  Clear GPS
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Pressable
          style={[
            styles.myPinButton,
            {
              bottom:
                (selected ? 240 : showEmptyPanel ? 160 : 28) + insets.bottom,
            },
            loc.status !== "ready" && styles.myPinButtonDisabled,
          ]}
          onPress={centreOnUser}
          disabled={loc.status !== "ready"}
          accessibilityRole="button"
          accessibilityLabel="Centre map on you"
        >
          <MaterialIcons name="my-location" size={22} color="#FFF" />
        </Pressable>

        <LocationPermissionModal
          visible={locationModalVisible}
          permissionStatus={loc.status === "denied" ? "denied" : "undetermined"}
          requesting={locationModalRequesting}
          onEnable={() => void handleLocationModalEnable()}
          onDismiss={() => setLocationModalVisible(false)}
        />

        {error && !selected && !showEmptyPanel ? (
          <View
            style={[
              styles.banner,
              { top: insets.top + (__DEV__ ? 112 : 64) },
            ]}
          >
            <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.bannerText}>
              {exploreUserMessage(error.code, error.message)}
            </ThemedText>
          </View>
        ) : null}

        {showEmptyPanel ? (
          <View
            style={[
              styles.emptyPanel,
              { bottom: Math.max(insets.bottom, 16) + 12 },
            ]}
          >
            <MaterialIcons name="explore" size={22} color="#FFE08A" />
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.emptyTitle}>
                {outsideCoverage ? "Explore isn’t here yet" : "No spots nearby"}
              </ThemedText>
              <ThemedText
                lightColor="rgba(255,255,255,0.78)"
                darkColor="rgba(255,255,255,0.78)"
                style={styles.emptyBody}
              >
                {outsideCoverage
                  ? "This place isn’t covered yet. Try parks and paths in the UK, Ireland, or the Philippines."
                  : "Pan the map toward parks, footpaths, or green space to find collectible spots."}
              </ThemedText>
            </View>
          </View>
        ) : null}

        {selected ? (
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText type="heading" lightColor="#FFF" darkColor="#FFF" style={styles.sheetTitle}>
                  {alreadyClaimed ? "Already collected" : "Explore spot"}
                </ThemedText>
                <ThemedText
                  lightColor="rgba(255,255,255,0.7)"
                  darkColor="rgba(255,255,255,0.7)"
                  style={{ fontSize: 13 }}
                >
                  {distanceToSelectedMetres != null
                    ? formatExploreDistanceAway(distanceToSelectedMetres)
                    : "Finding your distance…"}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => setSelectedId(null)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.closeSheet}
              >
                <MaterialIcons name="close" size={22} color="#FFF" />
              </Pressable>
            </View>

            {packSession ? (
              <View style={styles.awardBox}>
                <ThemedText lightColor="#FFE08A" darkColor="#FFE08A" style={{ fontWeight: "800", fontSize: 12 }}>
                  Pack ready
                </ThemedText>
                <ThemedText
                  lightColor="rgba(255,255,255,0.75)"
                  darkColor="rgba(255,255,255,0.75)"
                  style={{ fontSize: 13, lineHeight: 18 }}
                >
                  Swipe the top of the pack to rip it open.
                </ThemedText>
              </View>
            ) : (
              <>
                {claimError ? (
                  <ThemedText lightColor="#FFD8D8" darkColor="#FFD8D8" style={{ fontSize: 13 }}>
                    {claimError}
                  </ThemedText>
                ) : null}
                {__DEV__ ? (
                  <View style={styles.devRow}>
                    <Pressable
                      onPress={teleportToSelectedStop}
                      style={styles.devBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Teleport to this spot"
                    >
                      <MaterialIcons name="my-location" size={16} color="#FFE08A" />
                      <ThemedText lightColor="#FFE08A" darkColor="#FFE08A" style={styles.devBtnText}>
                        {debugSpoofActive ? "DEV: re-teleport here" : "DEV: teleport here"}
                      </ThemedText>
                    </Pressable>
                    {debugSpoofActive ? (
                      <Pressable
                        onPress={clearDebugSpoof}
                        style={styles.devBtnMuted}
                        accessibilityRole="button"
                        accessibilityLabel="Clear spoofed location"
                      >
                        <ThemedText
                          lightColor="rgba(255,255,255,0.7)"
                          darkColor="rgba(255,255,255,0.7)"
                          style={styles.devBtnText}
                        >
                          Clear
                        </ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                {!alreadyClaimed && withinClaimRange ? (
                  <Pressable
                    onPress={() => void openPack()}
                    disabled={claiming}
                    style={[styles.primaryBtn, claiming && { opacity: 0.6 }]}
                    accessibilityRole="button"
                  >
                    <ThemedText lightColor="#FFF" darkColor="#FFF" style={{ fontWeight: "800" }}>
                      {claiming ? "Preparing…" : "Collect card"}
                    </ThemedText>
                  </Pressable>
                ) : null}
                {!alreadyClaimed && !withinClaimRange ? (
                  <View style={styles.closerHint}>
                    <MaterialIcons name="directions-walk" size={20} color="#FFE08A" />
                    <ThemedText
                      lightColor="#FFE08A"
                      darkColor="#FFE08A"
                      style={{ flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "600" }}
                    >
                      Get within {EXPLORE_CLAIM_RADIUS_METRES} m to collect this card
                    </ThemedText>
                  </View>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        {packSession ? (
          <ExploreCardPackReveal
            visible
            onRipComplete={commitPackClaim}
            onClose={() => {
              closePack();
            }}
            onViewBinder={(award) => {
              const params: Record<string, string> = {
                highlightCardId: award.card.id,
              };
              if (selectedProfileId != null) {
                params.profileId = String(selectedProfileId);
              }
              closePack();
              setSelectedId(null);
              router.push({
                pathname: "/(tabs)/activity/explore-collection",
                params,
              });
            }}
          />
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  mapFetchBadge: {
    position: "absolute",
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  myPinButton: {
    position: "absolute",
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
  },
  myPinButtonDisabled: {
    opacity: 0.45,
  },
  devPresetBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 20,
  },
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bannerBtn: {
    alignSelf: "flex-start",
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderRadius: 16,
    padding: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: PANEL,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 12,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  closerHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  devRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  devBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,224,138,0.45)",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  devBtnMuted: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  devBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  closeSheet: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  primaryBtn: {
    alignSelf: "stretch",
    alignItems: "center",
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
  },
  awardBox: {
    gap: 6,
  },
});
