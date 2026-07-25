import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, ImageBackground, Pressable } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useNavigationReturn } from "@/contexts/NavigationReturnContext";
import {
  fetchCampfireTileRefresh,
  getServerNowMs,
  isCampfireLiveDismissed,
  type CampfireSessionRow,
} from "@/services/campfireService";
import {
  invalidateCampfireLivePreload,
  startCampfireLivePreload,
} from "@/services/campfireLivePreload";
const TILE_BG = require("@/assets/images/campfire-tile-bg.jpg");

const AMBER = "#C47A2A";
const BROWN_DEEP = "#3B1A06";
const BROWN_MID = "#6B3D1A";
const GREEN = "#2F6B43";
const CREAM = "#F6EBDD";
const LIVE_RED = "#C0392B";

const TILE_SLIDE_DURATION_MS = 420;
const TILE_SLIDE_DELAY_MS = 150;

function formatCountdownParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return { hrs, mins, secs };
}

type CampfireTileProps = {
  /** When true, parent handles entrance; tile reports readiness via onReadyChange. */
  coordinatedEntrance?: boolean;
  onReadyChange?: (ready: boolean) => void;
};

export function CampfireTile({
  coordinatedEntrance = false,
  onReadyChange,
}: CampfireTileProps) {
  const { scaleW } = useLayoutScale();
  const { pushWithReturn } = useNavigationReturn();
  const [statusReady, setStatusReady] = useState(false);
  const [liveSession, setLiveSession] = useState<CampfireSessionRow | null>(null);
  const [scheduledAtMs, setScheduledAtMs] = useState<number | null>(null);
  const [countdownMs, setCountdownMs] = useState<number>(0);
  const [replaySession, setReplaySession] = useState<CampfireSessionRow | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const hasEntranceAnimatedRef = useRef(false);
  const tileTranslateX = useSharedValue(240);
  const tileOpacity = useSharedValue(0);
  const tileSlideStyle = useAnimatedStyle(() => ({
    opacity: tileOpacity.value,
    transform: [{ translateX: tileTranslateX.value }],
  }));

  const refresh = useCallback(async () => {
    const result = await fetchCampfireTileRefresh();
    setLiveSession(result.liveSession);
    setScheduledAtMs(result.scheduledAtMs);
    setCountdownMs(result.countdownMs);
    setReplaySession(result.replaySession);
    if (result.preloadSession) {
      startCampfireLivePreload(result.preloadSession);
    } else {
      invalidateCampfireLivePreload();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLiveSession((current) =>
        current && isCampfireLiveDismissed(current.id) ? null : current
      );
      let cancelled = false;
      // Only hide for the initial load; later refocuses refresh in place (no re-slide).
      if (!hasLoadedOnceRef.current) {
        setStatusReady(false);
      }
      void (async () => {
        await refresh();
        if (!cancelled) {
          setStatusReady(true);
          hasLoadedOnceRef.current = true;
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [refresh])
  );

  useEffect(() => {
    onReadyChange?.(statusReady);
  }, [statusReady, onReadyChange]);

  // Slide in once after first status load — same motion as the home team card.
  useEffect(() => {
    if (coordinatedEntrance) {
      tileTranslateX.value = 0;
      tileOpacity.value = 1;
      return;
    }
    if (!statusReady) return;

    if (hasEntranceAnimatedRef.current) {
      tileTranslateX.value = 0;
      tileOpacity.value = 1;
      return;
    }

    hasEntranceAnimatedRef.current = true;
    tileTranslateX.value = 240;
    tileOpacity.value = 0;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      tileTranslateX.value = withTiming(0, {
        duration: TILE_SLIDE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
      tileOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    }, TILE_SLIDE_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [coordinatedEntrance, statusReady, tileOpacity, tileTranslateX]);

  // Safety net: keep the tile fresh even if status flips while user stays on home.
  useEffect(() => {
    if (!statusReady) return;
    const t = setInterval(() => {
      void refresh();
    }, 10_000);
    return () => clearInterval(t);
  }, [refresh, statusReady]);

  // Re-check soon after live ends (DB cron may lag behind playback).
  useEffect(() => {
    if (!statusReady || !liveSession) return;
    const t = setInterval(() => {
      void refresh();
    }, 3000);
    return () => clearInterval(t);
  }, [liveSession?.id, refresh, statusReady]);

  // Poll faster while waiting for live after the countdown hits zero.
  useEffect(() => {
    if (!statusReady || !scheduledAtMs || countdownMs > 0) return;
    void refresh();
    const t = setInterval(() => {
      void refresh();
    }, 2000);
    return () => clearInterval(t);
  }, [scheduledAtMs, countdownMs, refresh, statusReady]);

  useEffect(() => {
    if (!scheduledAtMs) return;
    const tick = () => {
      const nowMs = getServerNowMs();
      setCountdownMs(Math.max(0, scheduledAtMs - nowMs));
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [scheduledAtMs]);

  const parts = useMemo(
    () => formatCountdownParts(countdownMs),
    [countdownMs]
  );

  if (!statusReady) {
    return <View style={{ minHeight: scaleW(150) }} />;
  }

  // Nothing live or scheduled, and no past session to replay — there's nothing to show.
  if (!liveSession && !scheduledAtMs && !replaySession) {
    return null;
  }

  const tileContent = liveSession ? (
      <View
        style={{
          borderRadius: scaleW(22),
          minHeight: scaleW(150),
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: 0.28,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          borderWidth: 3,
          borderColor: "#FFF",
          elevation: 4,
        }}
      >
        <ImageBackground
          source={TILE_BG}
          resizeMode="cover"
          style={{ flex: 1, minHeight: scaleW(150) }}
        >
          <View
            style={{
              padding: scaleW(18),
              paddingRight: scaleW(150),
              justifyContent: "center",
              flex: 1,
              gap: scaleW(10),
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                backgroundColor: LIVE_RED,
                borderRadius: scaleW(20),
                paddingVertical: scaleW(4),
                paddingHorizontal: scaleW(10),
                gap: scaleW(6),
              }}
            >
              <View
                style={{
                  width: scaleW(8),
                  height: scaleW(8),
                  borderRadius: scaleW(4),
                  backgroundColor: "#FFF",
                }}
              />
              <ThemedText
                type="title"
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                style={{ fontSize: scaleW(11), fontWeight: "800", letterSpacing: 0.6 }}
              >
                LIVE
              </ThemedText>
            </View>

            <View style={{ gap: scaleW(4) }}>
              <ThemedText
                type="title"
                lightColor={BROWN_DEEP}
                darkColor={BROWN_DEEP}
                style={{ fontSize: scaleW(20), fontWeight: "900", lineHeight: scaleW(24) }}
              >
                Campfire is live!
              </ThemedText>
              {liveSession.title ? (
                <ThemedText
                  lightColor={BROWN_MID}
                  darkColor={BROWN_MID}
                  style={{ fontSize: scaleW(13), fontWeight: "600" }}
                  numberOfLines={2}
                >
                  {liveSession.title}
                </ThemedText>
              ) : null}
            </View>

            <Pressable
              onPress={() => pushWithReturn("/(tabs)/campfire")}
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                gap: scaleW(8),
                backgroundColor: "rgba(47, 107, 67, 0.92)",
                borderRadius: scaleW(22),
                paddingVertical: scaleW(10),
                paddingHorizontal: scaleW(16),
                minWidth: scaleW(180),
              }}
            >
              <MaterialIcons name="local-fire-department" size={scaleW(18)} color={CREAM} />
              <ThemedText
                type="title"
                lightColor={CREAM}
                darkColor={CREAM}
                style={{ fontSize: scaleW(15), fontWeight: "900" }}
              >
                Join now
              </ThemedText>
            </Pressable>
          </View>
        </ImageBackground>
      </View>
  ) : scheduledAtMs ? (
      <View
        style={{
          borderRadius: scaleW(22),
          minHeight: scaleW(160),
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: 0.28,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          borderWidth: 3,
          borderColor: "#FFF",
          elevation: 4,
        }}
      >
        <ImageBackground
          source={TILE_BG}
          resizeMode="cover"
          style={{ flex: 1, minHeight: scaleW(160) }}
        >
          <View
            style={{
              padding: scaleW(18),
              paddingRight: scaleW(150),
              justifyContent: "center",
              flex: 1,
              gap: scaleW(10),
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: scaleW(8) }}>
              <View
                style={{
                  width: scaleW(26),
                  height: scaleW(26),
                  borderRadius: scaleW(13),
                  backgroundColor: "rgba(255,255,255,0.85)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="local-fire-department" size={scaleW(16)} color={AMBER} />
              </View>
              <ThemedText
                type="title"
                lightColor={BROWN_DEEP}
                darkColor={BROWN_DEEP}
                style={{ fontSize: scaleW(18), fontWeight: "900" }}
              >
                Weekly Campfire
              </ThemedText>
            </View>

            <View style={{ flexDirection: "row", gap: scaleW(10) }}>
              {[
                { v: parts.hrs, label: "HRS" },
                { v: parts.mins, label: "MINS" },
                { v: parts.secs, label: "SECS" },
              ].map((b) => (
                <View
                  key={b.label}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.72)",
                    borderRadius: scaleW(12),
                    paddingVertical: scaleW(10),
                    paddingHorizontal: scaleW(12),
                    minWidth: scaleW(58),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ThemedText
                  type="title"
                    lightColor={BROWN_DEEP}
                    darkColor={BROWN_DEEP}
                    style={{ fontSize: scaleW(22), fontWeight: "900", lineHeight: scaleW(24) }}
                  >
                    {String(b.v).padStart(2, "0")}
                  </ThemedText>
                  <ThemedText
                    lightColor={BROWN_MID}
                    darkColor={BROWN_MID}
                    style={{ fontSize: scaleW(10), fontWeight: "800", marginTop: scaleW(2) }}
                  >
                    {b.label}
                  </ThemedText>
                </View>
              ))}
            </View>

            <View style={{ gap: scaleW(10) }}>
              <Pressable
                onPress={() => pushWithReturn("/(tabs)/campfire?mode=scheduled")}
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: scaleW(8),
                  backgroundColor: "rgba(47, 107, 67, 0.92)",
                  borderRadius: scaleW(22),
                  paddingVertical: scaleW(10),
                  paddingHorizontal: scaleW(16),
                  minWidth: scaleW(200),
                }}
              >
                <MaterialIcons name="local-fire-department" size={scaleW(18)} color={CREAM} />
                <ThemedText
                  type="title"
                  lightColor={CREAM}
                  darkColor={CREAM}
                  style={{ fontSize: scaleW(15), fontWeight: "900" }}
                >
                  Join campfire
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => pushWithReturn("/(tabs)/campfire?mode=replay")}
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: scaleW(8),
                  backgroundColor: "rgba(255,255,255,0.72)",
                  borderRadius: scaleW(18),
                  paddingVertical: scaleW(8),
                  paddingHorizontal: scaleW(14),
                }}
              >
                <MaterialIcons name="play-circle-filled" size={scaleW(18)} color={GREEN} />
                <ThemedText
                  type="title"
                  lightColor={GREEN}
                  darkColor={GREEN}
                  style={{ fontSize: scaleW(13), fontWeight: "800" }}
                >
                  Watch last week’s campfire
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </ImageBackground>
      </View>
  ) : (
    <View
      style={{
        borderRadius: scaleW(20),
        minHeight: scaleW(140),
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        borderWidth: 3,
        borderColor: "#FFF",
        elevation: 4,
      }}
    >
      <ImageBackground
        source={TILE_BG}
        resizeMode="cover"
        style={{ flex: 1, minHeight: scaleW(140) }}
      >
        {/* Content — left-aligned, right side shows the character from the bg image */}
        <View
          style={{
            padding: scaleW(20),
            paddingRight: scaleW(140),
            justifyContent: "center",
            flex: 1,
            gap: scaleW(10),
          }}
        >
              {/* Label pill */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  backgroundColor: "rgba(196, 122, 42, 0.85)",
                  borderRadius: scaleW(20),
                  paddingVertical: scaleW(3),
                  paddingHorizontal: scaleW(10),
                  gap: scaleW(4),
                }}
              >
                <MaterialIcons name="local-fire-department" size={scaleW(13)} color="#FFF" />
                <ThemedText
                  type="title"
                  lightColor="#FFFFFF"
                  darkColor="#FFFFFF"
                  style={{ fontSize: scaleW(11), fontWeight: "700", letterSpacing: 0.5 }}
                >
                  CAMPFIRE
                </ThemedText>
              </View>

              {/* Title */}
              <View style={{ gap: scaleW(3) }}>
                <ThemedText
                  type="title"
                  lightColor={BROWN_DEEP}
                  darkColor={BROWN_DEEP}
                  style={{ fontSize: scaleW(20), fontWeight: "800", lineHeight: scaleW(24) }}
                >
                  Watch the{"\n"}Previous Campfire
                </ThemedText>
                <ThemedText
                  lightColor={BROWN_MID}
                  darkColor={BROWN_MID}
                  style={{ fontSize: scaleW(13), fontWeight: "500" }}
                >
                  Stories, songs & adventures
                </ThemedText>
              </View>

              {/* Watch button pill */}
              <Pressable
                onPress={() => pushWithReturn("/(tabs)/campfire?mode=replay")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  backgroundColor: AMBER,
                  borderRadius: scaleW(20),
                  paddingVertical: scaleW(7),
                  paddingHorizontal: scaleW(14),
                  gap: scaleW(6),
                }}
              >
                <MaterialIcons name="play-circle-filled" size={scaleW(16)} color="#FFF" />
                <ThemedText
                  type="title"
                  lightColor="#FFFFFF"
                  darkColor="#FFFFFF"
                  style={{ fontSize: scaleW(14), fontWeight: "700" }}
                >
                  Watch now
                </ThemedText>
              </Pressable>
        </View>
      </ImageBackground>
    </View>
  );

  if (coordinatedEntrance) {
    return tileContent;
  }

  return <Animated.View style={tileSlideStyle}>{tileContent}</Animated.View>;
}
