import React, { useMemo, useEffect, useState, useCallback } from "react";
import { View, ScrollView, Image, Pressable, StyleSheet, ActivityIndicator } from "react-native";
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
import { getCategoryLabel, getCategoryIcon, getCategoryColor } from "@/utils/categoryUtils";

const TEXT_SECONDARY = "#2F3336";
const LIGHT_GREEN = "#7FAF8A";
const LIGHT_BG = "#f8f8f8";
const CREAM = "#F6F5F1";
const HUNTLY_GREEN = "#4F6F52";

const CLUB_1 = require("@/assets/images/club-1.png");
const CLUB_2 = require("@/assets/images/club-2.png");

function splitBlocks(text: string | null): string[] {
  if (!text || !text.trim()) return [];
  return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

function splitBullets(text: string | null): string[] {
  if (!text || !text.trim()) return [];
  return text.split(/\n/).map((s) => s.trim()).filter(Boolean);
}

export default function InstructionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { scaleW } = useLayoutScale();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const completeScale = useSharedValue(1);
  const completeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completeScale.value }],
  }));

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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        pageInner: { flex: 1, backgroundColor: LIGHT_BG },
        loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: scaleW(24) },
        errorText: { fontSize: scaleW(16), color: TEXT_SECONDARY, textAlign: "center" },
        titleContainer: {
          backgroundColor: LIGHT_GREEN,
          paddingTop: scaleW(60),
          paddingBottom: scaleW(16),
          paddingHorizontal: scaleW(16),
          marginBottom: scaleW(40),
          borderBottomLeftRadius: scaleW(20),
          borderBottomRightRadius: scaleW(20),
          alignItems: "center",
        },
        titleText: {
          fontSize: scaleW(20),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          marginBottom: scaleW(12),
        },
        mainImage: {
          width: "100%",
          height: scaleW(220),
          borderRadius: scaleW(20),
          backgroundColor: "#1a1a2e",
        },
        tagsRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: scaleW(12),
          marginTop: scaleW(16),
          marginBottom: scaleW(12),
        },
        tag: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: CREAM,
          paddingVertical: scaleW(2),
          paddingHorizontal: scaleW(6),
          borderRadius: scaleW(20),
          gap: scaleW(6),
        },
        tagText: { fontSize: scaleW(12), color: "#000" },
        descriptionBox: {
          backgroundColor: CREAM,
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(38),
          borderRadius: scaleW(14),
        },
        descriptionText: {
          fontSize: scaleW(15),
          color: "#000",
          textAlign: "center",
          lineHeight: scaleW(22),
        },
        section: {
          marginHorizontal: scaleW(48),
          marginBottom: scaleW(24),
          gap: scaleW(20),
        },
        sectionTitle: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: TEXT_SECONDARY,
        },
        sectionDescription: {
          fontSize: scaleW(14),
          color: TEXT_SECONDARY,
          lineHeight: scaleW(20),
          marginRight: scaleW(8),
        },
        taskText: {
          fontSize: scaleW(16),
          color: TEXT_SECONDARY,
          lineHeight: scaleW(20),
        },
        hintItem: {
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: scaleW(8),
          gap: scaleW(8),
        },
        bullet: { fontSize: scaleW(14), color: TEXT_SECONDARY, marginTop: 2 },
        hintText: {
          flex: 1,
          fontSize: scaleW(14),
          color: TEXT_SECONDARY,
          lineHeight: scaleW(20),
        },
        teamRow: { gap: scaleW(32) },
        polaroid: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 2,
          transform: [{ rotate: "-2deg" }],
        },
        polaroidSecond: { marginLeft: scaleW(50), transform: [{ rotate: "2deg" }] },
        polaroidImage: {
          width: scaleW(247),
          height: scaleW(149),
          borderRadius: scaleW(10),
          borderWidth: 2,
          borderColor: "#FFF",
        },
        completeButton: {
          alignSelf: "center",
          backgroundColor: HUNTLY_GREEN,
          paddingVertical: scaleW(14),
          width: scaleW(240),
          borderRadius: scaleW(28),
          marginTop: scaleW(24),
          marginBottom: scaleW(32),
        },
        completeButtonText: {
          textAlign: "center",
          fontSize: scaleW(16),
          fontWeight: "700",
          color: "#FFF",
        },
      }),
    [scaleW]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={HUNTLY_GREEN} />
        <ThemedText style={[styles.errorText, { marginTop: scaleW(16) }]}>Loading activity…</ThemedText>
      </View>
    );
  }

  if (error || !activity) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ThemedText style={styles.errorText}>{error ?? "Activity not found"}</ThemedText>
      </View>
    );
  }

  const imageSource = getActivityImageSource(activity.image);
  const categories = activity.categories && Array.isArray(activity.categories) ? activity.categories : [];
  const hintLines = splitBullets(activity.hints);
  const tipsBlocks = splitBlocks(activity.tips);
  const triviaBlocks = splitBlocks(activity.trivia);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.pageInner}
        contentContainerStyle={{ paddingBottom: scaleW(40) }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(500).delay(0).springify().damping(18)}
          style={styles.titleContainer}
        >
          <ThemedText type="heading" style={styles.titleText}>
            {activity.title}
          </ThemedText>
          <Image
            source={imageSource as { uri: string } | number}
            style={styles.mainImage}
            resizeMode="cover"
          />
          {categories.length > 0 && (
            <View style={styles.tagsRow}>
              {categories.slice(0, 5).map((cat) => (
                <View
                  key={cat}
                  style={[styles.tag, { backgroundColor: `${getCategoryColor(cat)}20`, borderWidth: 1, borderColor: `${getCategoryColor(cat)}40` }]}
                >
                  <ThemedText style={[styles.tagText, { color: getCategoryColor(cat) }]}>
                    {getCategoryIcon(cat)} {getCategoryLabel(cat)}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
          {(activity.description != null && activity.description !== "") && (
            <View style={styles.descriptionBox}>
              <ThemedText style={styles.descriptionText}>{activity.description}</ThemedText>
            </View>
          )}
        </Animated.View>

        {(activity.long_description != null && activity.long_description.trim() !== "") && (
          <Animated.View
            entering={FadeInDown.duration(500).delay(150).springify().damping(18)}
            style={styles.section}
          >
            <ThemedText type="heading" style={styles.sectionTitle}>
              What to do
            </ThemedText>
            <ThemedText style={styles.taskText}>{activity.long_description.trim()}</ThemedText>
          </Animated.View>
        )}

        {tipsBlocks.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(500).delay(280).springify().damping(18)}
            style={styles.section}
          >
            <ThemedText type="heading" style={styles.sectionTitle}>
              Tips
            </ThemedText>
            {tipsBlocks.map((block, i) => (
              <ThemedText key={i} style={[styles.taskText, { marginBottom: scaleW(8) }]}>
                {block}
              </ThemedText>
            ))}
          </Animated.View>
        )}

        {hintLines.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(500).delay(380).springify().damping(18)}
            style={styles.section}
          >
            <ThemedText type="heading" style={styles.sectionTitle}>
              Hints
            </ThemedText>
            {hintLines.map((line, i) => (
              <View key={i} style={styles.hintItem}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.hintText}>{line}</ThemedText>
              </View>
            ))}
          </Animated.View>
        )}

        {triviaBlocks.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(500).delay(480).springify().damping(18)}
            style={styles.section}
          >
            <ThemedText type="heading" style={styles.sectionTitle}>
              Trivia
            </ThemedText>
            {triviaBlocks.map((block, i) => (
              <ThemedText key={i} style={[styles.taskText, { marginBottom: scaleW(8) }]}>
                {block}
              </ThemedText>
            ))}
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.duration(500).delay(580).springify().damping(18)}
          style={styles.section}
        >
          <View>
            <ThemedText type="heading" style={styles.sectionTitle}>
              Your team
            </ThemedText>
            <ThemedText style={styles.sectionDescription}>
              See submissions from other people in your team...
            </ThemedText>
          </View>
          <View style={styles.teamRow}>
            <View style={styles.polaroid}>
              <Image source={CLUB_1} style={styles.polaroidImage} resizeMode="cover" />
            </View>
            <View style={[styles.polaroid, styles.polaroidSecond]}>
              <Image source={CLUB_2} style={styles.polaroidImage} resizeMode="cover" />
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(580).springify().damping(18)}
          style={completeAnimatedStyle}
        >
          <Pressable
            style={styles.completeButton}
            onPress={() => router.push({ pathname: "/(tabs)/activity/mission/completion", params: { id: String(activity.id) } } as Parameters<typeof router.push>[0])}
            onPressIn={() => {
              completeScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
            }}
            onPressOut={() => {
              completeScale.value = withSpring(1, { damping: 15, stiffness: 400 });
            }}
          >
            <ThemedText type="heading" style={styles.completeButtonText}>
              Complete
            </ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
