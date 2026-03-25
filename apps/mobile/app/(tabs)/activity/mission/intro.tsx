import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { getActivityById, getActivityImageSource } from "@/services/packService";
import type { Activity } from "@/types/activity";

const BEAR_FACE = require("@/assets/images/bear-face.png");
const FOX_FACE = require("@/assets/images/fox-face.png");
const OTTER_FACE = require("@/assets/images/otter-face.png");

function getFaceImage(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("fox")) return FOX_FACE;
  if (lower.includes("otter")) return OTTER_FACE;
  return BEAR_FACE;
}

const FOREST_DARK = "#2D4A35";
const HUNTLY_GREEN = "#4F6F52";
const URGENT_RED = "#E04434";
const CREAM = "#F6F5F1";

export default function IntroScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { scaleW } = useLayoutScale();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(async () => {
    if (!id) {
      setError("No activity selected");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await getActivityById(Number(id));
      setActivity(data ?? null);
      if (!data) setError("Activity not found");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
      setActivity(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const buttonScale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleAccept = () => {
    if (!activity?.id) return;
    router.push({
      pathname: "/(tabs)/activity/mission/prep",
      params: { id: String(activity.id) },
    });
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: FOREST_DARK },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: scaleW(24),
        },
        errorText: { fontSize: scaleW(17), color: "#FFF", textAlign: "center" },
        scroll: { flex: 1 },
        scrollContent: { paddingHorizontal: scaleW(20), paddingBottom: scaleW(120) },
        urgentBannerWrap: {
          marginHorizontal: -scaleW(28),
          marginTop: scaleW(8),
          marginBottom: scaleW(28),
        },
        urgentBanner: {
          backgroundColor: URGENT_RED,
          paddingVertical: scaleW(16),
          transform: [{ rotate: "-1deg" }],
        },
        urgentText: {
          fontSize: scaleW(17),
          fontWeight: "800",
          color: "#FFF",
          textAlign: "center",
          letterSpacing: 0.5,
        },
        characterRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: scaleW(12),
          marginBottom: scaleW(16),
        },
        avatar: {
          width: scaleW(48),
          height: scaleW(48),
          borderRadius: scaleW(24),
          backgroundColor: "#FFF",
          overflow: "hidden",
          padding: scaleW(6),
          alignItems: "center",
          justifyContent: "center",
        },
        avatarImage: {
          width: scaleW(48),
          height: scaleW(48),
          borderRadius: scaleW(24),
          overflow: "hidden",
        },
        characterName: { fontSize: scaleW(18), fontWeight: "600", color: "#FFF" },
        speechBubble: {
          backgroundColor: HUNTLY_GREEN,
          borderRadius: scaleW(20),
          padding: scaleW(20),
          marginBottom: scaleW(20),
        },
        dialogueText: {
          fontSize: scaleW(16),
          color: "#FFF",
          lineHeight: scaleW(24),
        },
        missionCard: {
          backgroundColor: HUNTLY_GREEN,
          borderRadius: scaleW(20),
          padding: scaleW(24),
          marginBottom: scaleW(24),
        },
        missionLabel: {
          fontSize: scaleW(12),
          fontWeight: "600",
          color: "rgba(255,255,255,0.8)",
          letterSpacing: 1,
          marginBottom: scaleW(8),
        },
        missionTitle: { fontSize: scaleW(22), fontWeight: "700", color: "#FFF", marginBottom: scaleW(4) },
        missionDesc: { fontSize: scaleW(15), color: "rgba(255,255,255,0.9)", marginBottom: scaleW(8) },
        metaRow: { fontSize: scaleW(13), color: "rgba(255,255,255,0.75)" },
        acceptButton: {
          backgroundColor: HUNTLY_GREEN,
          borderRadius: scaleW(28),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(32),
          alignSelf: "center",
          marginTop: scaleW(8),
        },
        acceptButtonText: { fontSize: scaleW(18), fontWeight: "700", color: "#FFF" },
        footer: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: scaleW(20),
          paddingBottom: scaleW(24),
        },
      }),
    [scaleW]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={["top", "left", "right"]}>
        <ActivityIndicator size="large" color={HUNTLY_GREEN} />
        <ThemedText style={[styles.errorText, { marginTop: scaleW(16) }]}>
          Loading your mission…
        </ThemedText>
      </SafeAreaView>
    );
  }

  if (error || !activity) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={["top", "left", "right"]}>
        <ThemedText style={styles.errorText}>{error ?? "Activity not found"}</ThemedText>
      </SafeAreaView>
    );
  }

  const hasUrgent = activity.intro_urgent_message != null && activity.intro_urgent_message.trim() !== "";
  const characterName = activity.intro_character_name?.trim() || "Mission";
  const avatarUrl = activity.intro_character_avatar_url?.trim();

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {hasUrgent && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.urgentBannerWrap}>
            <View style={styles.urgentBanner}>
              <ThemedText style={styles.urgentText}>{activity.intro_urgent_message}</ThemedText>
            </View>
          </Animated.View>
        )}
        <Animated.View entering={FadeInDown.duration(420).delay(80)} style={styles.characterRow}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatar}>
              <Image
                source={getFaceImage(characterName)}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            </View>
          )}
          <ThemedText style={styles.characterName}>{characterName}</ThemedText>
        </Animated.View>
        {activity.intro_dialogue != null && activity.intro_dialogue.trim() !== "" && (
          <Animated.View entering={FadeInDown.duration(420).delay(120)} style={styles.speechBubble}>
            <ThemedText style={styles.dialogueText}>{activity.intro_dialogue}</ThemedText>
          </Animated.View>
        )}
        <Animated.View entering={FadeInDown.duration(420).delay(160)} style={styles.missionCard}>
          <ThemedText style={styles.missionLabel}>YOUR MISSION</ThemedText>
          <ThemedText type="heading" style={styles.missionTitle}>
            {activity.title}
          </ThemedText>
          {activity.description != null && activity.description.trim() !== "" && (
            <ThemedText style={styles.missionDesc}>{activity.description}</ThemedText>
          )}
          <ThemedText style={styles.metaRow}>
            {[activity.optional_items, activity.estimated_duration]
              .filter(Boolean)
              .join(" · ")}
          </ThemedText>
        </Animated.View>
      </ScrollView>
      <View style={styles.footer} pointerEvents="box-none">
        <SafeAreaView edges={["bottom"]}>
          <Animated.View style={buttonStyle}>
            <Pressable
              onPress={handleAccept}
              onPressIn={() => {
                buttonScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                buttonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
              style={styles.acceptButton}
            >
              <ThemedText type="heading" style={styles.acceptButtonText}>
                Accept the mission
              </ThemedText>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
