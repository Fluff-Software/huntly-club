import React, { useEffect, useMemo, useState } from "react";
import { View, ImageBackground, Pressable } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { getNextScheduledSession } from "@/services/campfireService";

const TILE_BG = require("@/assets/images/campfire-tile-bg.png");

const AMBER = "#C47A2A";
const BROWN_DEEP = "#3B1A06";
const BROWN_MID = "#6B3D1A";
const GREEN = "#2F6B43";
const CREAM = "#F6EBDD";

const SOON_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function formatCountdownParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return { hrs, mins, secs };
}

export function CampfireTile() {
  const { scaleW } = useLayoutScale();
  const [scheduledAtMs, setScheduledAtMs] = useState<number | null>(null);
  const [countdownMs, setCountdownMs] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await getNextScheduledSession();
      if (cancelled) return;
      const at = next?.scheduled_at ? Date.parse(next.scheduled_at) : null;
      if (!at) return;
      const now = Date.now();
      const delta = at - now;
      if (delta > 0 && delta <= SOON_WINDOW_MS) {
        setScheduledAtMs(at);
        setCountdownMs(delta);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scheduledAtMs) return;
    const timer = setInterval(() => {
      setCountdownMs(Math.max(0, scheduledAtMs - Date.now()));
    }, 250);
    return () => clearInterval(timer);
  }, [scheduledAtMs]);

  const parts = useMemo(
    () => formatCountdownParts(countdownMs),
    [countdownMs]
  );

  if (scheduledAtMs) {
    return (
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
                onPress={() => router.push("/(tabs)/campfire?mode=scheduled")}
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
                onPress={() => router.push("/(tabs)/campfire?mode=replay")}
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
    );
  }

  return (
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
                onPress={() => router.push("/(tabs)/campfire?mode=replay")}
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
}
