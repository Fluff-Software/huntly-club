import React, { useMemo, useEffect, useState, useCallback } from "react";
import { View, ScrollView, Image, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
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
import { usePlayer } from "@/contexts/PlayerContext";
import { getActivityById, getActivityImageSource } from "@/services/packService";
import { getRandomActivityPhotos, type ActivityPhotoItem } from "@/services/activityProgressService";
import { getCategories, getCategoryById, type Category } from "@/services/categoriesService";
import { supabase } from "@/services/supabase";
import type { Activity } from "@/types/activity";

const TEXT_SECONDARY = "#2F3336";
const LIGHT_GREEN = "#7FAF8A";
const LIGHT_BG = "#f8f8f8";
const CREAM = "#F6F5F1";
const HUNTLY_GREEN = "#4F6F52";

function splitBlocks(text: string | null): string[] {
  if (!text || !text.trim()) return [];
  return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

/** Splits hint/tip text by newlines into lines; strips optional leading "• " so we can render one bullet per line. */
function splitBulletLines(text: string | null): string[] {
  if (!text || !text.trim()) return [];
  return text.split("\\n")
}

export default function InstructionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { scaleW } = useLayoutScale();
  const { profiles } = usePlayer();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clubPhotos, setClubPhotos] = useState<ActivityPhotoItem[]>([]);
  const [completedByNames, setCompletedByNames] = useState<string[]>([]);

  const nextScale = useSharedValue(1);
  const nextAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nextScale.value }],
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
      const [data, cats] = await Promise.all([
        getActivityById(Number(id)),
        getCategories(),
      ]);
      setActivity(data ?? null);
      setCategories(cats);
      if (!data) setError("Activity not found");
      else {
        const photos = await getRandomActivityPhotos(2, data.id);
        setClubPhotos(photos);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
      setActivity(null);
      setClubPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    const activityId = activity?.id;
    const profileIds = profiles.map((p) => p.id);
    if (!activityId || profileIds.length === 0) {
      setCompletedByNames([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: progressError } = await supabase
        .from("user_activity_progress")
        .select("profile_id")
        .eq("activity_id", activityId)
        .in("profile_id", profileIds)
        .not("completed_at", "is", null);
      if (cancelled || progressError) return;
      const names = (data ?? [])
        .map((row) => {
          const p = profiles.find((x) => x.id === row.profile_id);
          return (p?.nickname || p?.name || "Explorer").trim() || "Explorer";
        })
        .filter((name, i, arr) => arr.indexOf(name) === i);
      setCompletedByNames(names);
    })();
    return () => { cancelled = true; };
  }, [activity?.id, profiles]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        pageInner: { flex: 1, backgroundColor: LIGHT_BG },
        loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: scaleW(24) },
        errorText: { fontSize: scaleW(16), color: TEXT_SECONDARY, textAlign: "center" },
        titleContainer: {
          backgroundColor: LIGHT_GREEN,
          paddingTop: scaleW(20),
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
          alignSelf: "stretch",
          gap: scaleW(12),
          marginTop: scaleW(16),
          marginBottom: scaleW(12),
          paddingHorizontal: scaleW(4),
        },
        tag: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: scaleW(2),
          paddingHorizontal: scaleW(6),
          borderRadius: scaleW(20),
          gap: scaleW(6),
        },
        tagNeutral: {
          backgroundColor: "#FFF",
          borderWidth: 1,
          borderColor: "#E5E7EB",
        },
        tagText: { fontSize: scaleW(12), color: "#374151" },
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
        bulletListContainer: {
          gap: scaleW(6),
        },
        hintItem: {
          flexDirection: "row",
          alignItems: "flex-start",
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
        nextButton: {
          alignSelf: "center",
          backgroundColor: HUNTLY_GREEN,
          paddingVertical: scaleW(14),
          width: scaleW(240),
          borderRadius: scaleW(28),
          marginTop: scaleW(24),
          marginBottom: scaleW(32),
        },
        nextButtonText: {
          textAlign: "center",
          fontSize: scaleW(16),
          fontWeight: "700",
          color: "#FFF",
        },
        completedByWrap: {
          marginTop: scaleW(12),
          marginHorizontal: scaleW(32),
          marginBottom: scaleW(16),
        },
        completedByLabel: {
          fontSize: scaleW(14),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          marginBottom: scaleW(4),
        },
        completedByNames: {
          fontSize: scaleW(14),
          color: TEXT_SECONDARY,
          lineHeight: scaleW(20),
        },
      }),
    [scaleW]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={["top", "left", "right"]}>
        <ActivityIndicator size="large" color={HUNTLY_GREEN} />
        <ThemedText style={[styles.errorText, { marginTop: scaleW(16) }]}>Loading your mission…</ThemedText>
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

  const imageSource = getActivityImageSource(activity.image);
  const categoryIds = activity.categories && Array.isArray(activity.categories) ? activity.categories : [];
  const categoryInfos = categoryIds
    .map((cid) => getCategoryById(categories, cid))
    .filter((c): c is NonNullable<typeof c> => c != null);
  const hintLines = Array.isArray(activity.hints)
    ? activity.hints.filter(Boolean)
    : splitBulletLines(activity.hints as string | null);
  const tipLines = Array.isArray(activity.tips)
    ? activity.tips.filter(Boolean)
    : splitBulletLines(activity.tips as string | null);
  const triviaBlocks = splitBlocks(activity.trivia);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.pageInner}
        contentContainerStyle={{ paddingBottom: scaleW(100) }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
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
          {categoryInfos.length > 0 && (
            <View style={styles.tagsRow}>
              {categoryInfos.slice(0, 5).map((cat, i) => (
                <View key={`cat-${i}-${cat.name}`} style={[styles.tag, styles.tagNeutral]}>
                  {cat.icon ? (
                    <Image
                      source={{ uri: cat.icon }}
                      style={{ width: 14, height: 14, marginRight: 4, borderRadius: 2 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <MaterialIcons name="label" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                  )}
                  <ThemedText style={styles.tagText}>{cat.name}</ThemedText>
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

        {tipLines.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(500).delay(280).springify().damping(18)}
            style={styles.section}
          >
            <ThemedText type="heading" style={styles.sectionTitle}>
              Tips
            </ThemedText>
            <View style={styles.bulletListContainer}>
              {tipLines.map((line, i) => (
                <View key={i} style={styles.hintItem}>
                  <ThemedText style={styles.hintText}>• {line}</ThemedText>
                </View>
              ))}
            </View>
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
            <View style={styles.bulletListContainer}>
              {hintLines.map((line, i) => (
                <View key={i} style={styles.hintItem}>
                  <ThemedText style={styles.hintText}>• {line}</ThemedText>
                </View>
              ))}
            </View>
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

        {clubPhotos.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(500).delay(580).springify().damping(18)}
            style={styles.section}
          >
            <View>
              <ThemedText type="heading" style={styles.sectionTitle}>
                Huntly
              </ThemedText>
              <ThemedText style={styles.sectionDescription}>
                See submissions from other people in huntly world...
              </ThemedText>
            </View>
            <View style={styles.teamRow}>
              {clubPhotos.map((photo, i) => (
                <View
                  key={i}
                  style={[styles.polaroid, i === 1 ? styles.polaroidSecond : undefined]}
                >
                  <Image
                    source={{ uri: photo.photo_url }}
                    style={styles.polaroidImage}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.duration(500).delay(580).springify().damping(18)}
          style={nextAnimatedStyle}
        >
          <Pressable
            style={styles.nextButton}
            onPress={() => router.push({ pathname: "/(tabs)/activity/mission/completion", params: { id: String(activity.id) } } as Parameters<typeof router.push>[0])}
            onPressIn={() => {
              nextScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
            }}
            onPressOut={() => {
              nextScale.value = withSpring(1, { damping: 15, stiffness: 400 });
            }}
          >
            <ThemedText type="heading" style={styles.nextButtonText}>
              Complete Challenge
            </ThemedText>
          </Pressable>
          {completedByNames.length > 0 && (
            <View style={styles.completedByWrap}>
              <ThemedText style={styles.completedByLabel}>Completed by</ThemedText>
              <ThemedText style={styles.completedByNames}>
                {completedByNames.join(", ")}
              </ThemedText>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
