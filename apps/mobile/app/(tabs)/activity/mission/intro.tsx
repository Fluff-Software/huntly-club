import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring } from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { getActivityById } from "@/services/packService";
import { useUser } from "@/contexts/UserContext";
import { isStartMissionOnboardingActive } from "@/constants/startMissionOnboarding";
import type { Activity } from "@/types/activity";
import { ACTIVITY_CATEGORIES } from "@/types/activity";
import { getCategoryColor, getCategoryLabel } from "@/utils/categoryUtils";

// Legacy animal fallbacks (for missions that pre-date captain system)
const BEAR_FACE = require("@/assets/images/bear-face.png");
const FOX_FACE = require("@/assets/images/fox-face.png");
const OTTER_FACE = require("@/assets/images/otter-face.png");

const CAPTAIN_ASSETS = {
  bella: {
    avatar:          require("@/assets/images/bella-close-smiling.png"),
    standing:        require("@/assets/images/bella-standing.png"),
    "crossed-arms":  require("@/assets/images/bella-crossed-arms.png"),
    waving:          require("@/assets/images/bella-waving.png"),
  },
  felix: {
    avatar:          require("@/assets/images/felix-close-smiling.png"),
    standing:        require("@/assets/images/felix-standing.png"),
    "crossed-arms":  require("@/assets/images/felix-crossed-arms.png"),
    waving:          require("@/assets/images/felix-waving.png"),
  },
  oli: {
    avatar:          require("@/assets/images/oli-close-smiling.png"),
    standing:        require("@/assets/images/oli-standing.png"),
    "crossed-arms":  require("@/assets/images/oli-crossed-arms.png"),
    waving:          require("@/assets/images/oli-waving.png"),
  },
} as const;

type CaptainKey = keyof typeof CAPTAIN_ASSETS;
type PoseKey = "standing" | "crossed-arms" | "waving";

function getLegacyFace(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("fox")) return FOX_FACE;
  if (lower.includes("otter")) return OTTER_FACE;
  return BEAR_FACE;
}

const FOREST_DARK = "#2D4A35";
const FOREST_MID = "#3D5F45";
const URGENT_RED = "#C0392B";
const CREAM = "#F0E8C8";

export default function IntroScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { scaleW, width, isTablet } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const { userData } = useUser();
  const onboardingActive = isStartMissionOnboardingActive(userData?.start_mission_step);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(async () => {
    if (!id) { setError("No activity selected"); setLoading(false); return; }
    setError(null);
    setLoading(true);
    try {
      const data = await getActivityById(Number(id));
      setActivity(data ?? null);
      if (!data) setError("Activity not found");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  const buttonScale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));

  const handleAccept = () => {
    if (!activity?.id) return;
    router.push({ pathname: "/(tabs)/activity/mission/prep", params: { id: String(activity.id) } });
  };


  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: FOREST_DARK, justifyContent: "center", alignItems: "center" }} edges={["top", "left", "right"]}>
        <ActivityIndicator size="large" color={CREAM} />
        <ThemedText lightColor={CREAM} darkColor={CREAM} style={{ marginTop: scaleW(16), fontSize: scaleW(16) }}>
          Loading your mission…
        </ThemedText>
      </SafeAreaView>
    );
  }

  if (error || !activity) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: FOREST_DARK, justifyContent: "center", alignItems: "center", padding: scaleW(24) }} edges={["top", "left", "right"]}>
        <ThemedText lightColor="#FFF" darkColor="#FFF" style={{ fontSize: scaleW(17), textAlign: "center" }}>
          {error ?? "Activity not found"}
        </ThemedText>
      </SafeAreaView>
    );
  }

  const captainKey = (activity.intro_captain ?? null) as CaptainKey | null;
  const validCaptain = captainKey != null && captainKey in CAPTAIN_ASSETS ? captainKey : null;
  const poseKey: PoseKey = (activity.intro_captain_pose as PoseKey | null | undefined) ?? "standing";
  const validPose: PoseKey =
    validCaptain != null && poseKey in CAPTAIN_ASSETS[validCaptain] ? poseKey : "standing";

  const captainAssets = validCaptain ? CAPTAIN_ASSETS[validCaptain] : null;
  const avatarSource = captainAssets
    ? captainAssets.avatar
    : activity.intro_character_avatar_url
      ? { uri: activity.intro_character_avatar_url }
      : activity.intro_character_name
        ? getLegacyFace(activity.intro_character_name)
        : null;
  const bodySource = captainAssets ? captainAssets[validPose] : null;

  const characterName =
    activity.intro_character_name?.trim() ||
    (validCaptain ? validCaptain.charAt(0).toUpperCase() + validCaptain.slice(1) : null);

  const footerPaddingBottom =
    insets.bottom +
    (onboardingActive ? scaleW(28) : scaleW(24)) +
    (isTablet ? scaleW(40) : 0);

  const hasUrgent = !!activity.intro_urgent_message?.trim();
  const hasDialogue = !!activity.intro_dialogue?.trim();
  const items: string[] = Array.isArray(activity.optional_items) ? activity.optional_items : [];
  const categories = (activity.categories ?? [])
    .map((cat) => {
      if (typeof cat === "number") return ACTIVITY_CATEGORIES[cat]?.category;
      if (typeof cat === "string") return cat;
      return undefined;
    })
    .filter((cat): cat is string => typeof cat === "string" && cat.trim() !== "");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FOREST_DARK }} edges={["top", "left", "right"]}>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: scaleW(20), paddingBottom: scaleW(120), paddingTop: scaleW(8) }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Urgent banner */}
        {hasUrgent && (
          <View style={{
            backgroundColor: URGENT_RED,
            paddingVertical: scaleW(14),
            transform: [{ rotate: "-1deg" }],
            marginHorizontal: -scaleW(20),
            marginBottom: scaleW(16) }}>
            <ThemedText
              lightColor="#FFF"
              darkColor="#FFF"
              style={{ fontSize: scaleW(16), fontWeight: "800", textAlign: "center", letterSpacing: 0.5 }}>
              ⚡ {activity.intro_urgent_message}
            </ThemedText>
          </View>
        )}

        {/* Character section */}
        <View style={{ minHeight: scaleW(260), marginBottom: scaleW(20) }}>
          {/* Full-body captain image — absolute right */}
          {bodySource && (
            <Image
              source={bodySource}
              resizeMode="contain"
              style={{
                position: "absolute",
                right: -scaleW(16),
                bottom: -scaleW(20),
                width: width * 0.42,
                height: scaleW(220) }}
            />
          )}

          {/* Avatar + name */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: scaleW(12), marginBottom: scaleW(16) }}>
            {avatarSource && (
              <View style={{
                width: scaleW(64),
                height: scaleW(64),
                borderRadius: scaleW(32),
                overflow: "hidden",
                borderWidth: 3,
                borderColor: "#FFF" }}>
                <Image
                  source={avatarSource}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>
            )}
            {characterName && (
              <View>
                <ThemedText
                  type="heading"
                  lightColor="#FFF"
                  darkColor="#FFF"
                  style={{ fontSize: scaleW(22), fontWeight: "800" }}>
                  {characterName}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Speech bubble */}
          {hasDialogue && (
            <View style={{ marginRight: bodySource ? width * 0.36 : 0 }}>
              <View style={{
                backgroundColor: "#FFF",
                borderRadius: scaleW(16),
                padding: scaleW(16),
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 4 }}>
                <ThemedText style={{
                  fontSize: scaleW(15),
                  color: "#1a1a1a",
                  lineHeight: scaleW(22),
                  fontStyle: "italic" }}>
                  "{activity.intro_dialogue}"
                </ThemedText>
              </View>
              {/* Right-pointing tail */}
              {bodySource && (
                <View style={{
                  position: "absolute",
                  right: -scaleW(10),
                  top: scaleW(20),
                  width: 0,
                  height: 0,
                  borderTopWidth: scaleW(8),
                  borderBottomWidth: scaleW(8),
                  borderLeftWidth: scaleW(10),
                  borderTopColor: "transparent",
                  borderBottomColor: "transparent",
                  borderLeftColor: "#FFF" }}
                />
              )}
            </View>
          )}
        </View>

        {/* Mission card */}
        <View style={{
          backgroundColor: FOREST_MID,
          borderRadius: scaleW(20),
          padding: scaleW(20),
          marginBottom: scaleW(24),
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4 }}>

          {/* Header row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: scaleW(8), marginBottom: scaleW(12) }}>
            <MaterialIcons name="flag" size={scaleW(16)} color="rgba(255,255,255,0.7)" />
            <ThemedText
              lightColor="rgba(255,255,255,0.7)"
              darkColor="rgba(255,255,255,0.7)"
              style={{ fontSize: scaleW(11), fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase" }}>
              Your Mission
            </ThemedText>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)", paddingTop: scaleW(12) }}>
            <ThemedText
              type="heading"
              lightColor="#FFF"
              darkColor="#FFF"
              style={{ fontSize: scaleW(24), fontWeight: "800", marginBottom: scaleW(8) }}>
              {activity.title}
            </ThemedText>
            {categories.length > 0 && (
              <View style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: scaleW(8),
                marginBottom: scaleW(12) }}>
                {categories.map((category) => (
                  <View
                    key={category}
                    style={{
                      borderRadius: scaleW(999),
                      paddingVertical: scaleW(6),
                      paddingHorizontal: scaleW(10),
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.18)",
                      backgroundColor: `${getCategoryColor(category)}33`,
                    }}
                  >
                    <ThemedText
                      lightColor="#FFF"
                      darkColor="#FFF"
                      style={{ fontSize: scaleW(12), fontWeight: "700" }}>
                      {getCategoryLabel(category)}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
            {!!activity.description?.trim() && (
              <ThemedText
                lightColor="rgba(255,255,255,0.88)"
                darkColor="rgba(255,255,255,0.88)"
                style={{ fontSize: scaleW(15), lineHeight: scaleW(22), marginBottom: scaleW(16) }}>
                {activity.description}
              </ThemedText>
            )}

            {/* Items + duration chips */}
            {(items.length > 0 || !!activity.estimated_duration?.trim()) && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: scaleW(8) }}>
                {items.map((item, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: scaleW(5),
                      backgroundColor: "rgba(255,255,255,0.15)",
                      borderRadius: scaleW(20),
                      paddingVertical: scaleW(5),
                      paddingHorizontal: scaleW(10) }}>
                    <MaterialIcons name="local-offer" size={scaleW(12)} color="rgba(255,255,255,0.8)" />
                    <ThemedText
                      lightColor="#FFF"
                      darkColor="#FFF"
                      style={{ fontSize: scaleW(12), fontWeight: "600" }}>
                      {item}
                    </ThemedText>
                  </View>
                ))}
                {!!activity.estimated_duration?.trim() && (
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: scaleW(5),
                    backgroundColor: "rgba(255,255,255,0.15)",
                    borderRadius: scaleW(20),
                    paddingVertical: scaleW(5),
                    paddingHorizontal: scaleW(10) }}>
                    <MaterialIcons name="timer" size={scaleW(12)} color="rgba(255,255,255,0.8)" />
                    <ThemedText
                      lightColor="#FFF"
                      darkColor="#FFF"
                      style={{ fontSize: scaleW(12), fontWeight: "600" }}>
                      {activity.estimated_duration}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Accept button — fixed footer */}
      <View style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: scaleW(20),
        paddingBottom: footerPaddingBottom }}
        pointerEvents="box-none"
      >
        <Animated.View style={buttonStyle}>
          <Pressable
            onPress={handleAccept}
            onPressIn={() => { buttonScale.value = withSpring(0.97, { damping: 15, stiffness: 400 }); }}
            onPressOut={() => { buttonScale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
            style={{
              backgroundColor: CREAM,
              borderRadius: scaleW(32),
              paddingVertical: scaleW(18),
              paddingHorizontal: scaleW(32),
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: scaleW(8),
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4 }}
          >
            <ThemedText
              type="heading"
              lightColor={FOREST_DARK}
              darkColor={FOREST_DARK}
              style={{ fontSize: scaleW(18), fontWeight: "800" }}>
              Accept the mission
            </ThemedText>
            <MaterialIcons name="arrow-forward" size={scaleW(20)} color={FOREST_DARK} />
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
