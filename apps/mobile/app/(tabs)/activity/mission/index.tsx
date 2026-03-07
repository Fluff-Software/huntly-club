import React, { useMemo, useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { getActivityById, getActivityImageSource } from "@/services/packService";
import {
  getRandomActivityPhotos,
  type ActivityPhotoItem,
} from "@/services/activityProgressService";
import { getCategories, getCategoryById, type Category } from "@/services/categoriesService";
import type { Activity } from "@/types/activity";

const TEXT_SECONDARY = "#2F3336";
const LIGHT_GREEN = "#7FAF8A";
const LIGHT_BG = "#f8f8f8";
const CREAM = "#F6F5F1";
const HUNTLY_GREEN = "#4F6F52";
const STEP_ACCENT = "#5a7d5e";
const TIP_BG = "rgba(127, 175, 138, 0.12)";
const ALT_BG = "rgba(79, 111, 82, 0.08)";

function splitBlocks(text: string | null): string[] {
  if (!text || !text.trim()) return [];
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function splitBulletLines(text: string | null): string[] {
  if (!text || !text.trim()) return [];
  return text
    .split(/\n+/)
    .map((s) => s.replace(/^\s*•\s*/, "").trim())
    .filter(Boolean);
}

function normalizeStringArray(
  val: string[] | string | null | undefined
): string[] {
  if (val == null) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return splitBulletLines(typeof val === "string" ? val : null);
}

export default function InstructionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { scaleW } = useLayoutScale();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clubPhotos, setClubPhotos] = useState<ActivityPhotoItem[]>([]);

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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        pageInner: { flex: 1, backgroundColor: LIGHT_BG },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: scaleW(24),
        },
        errorText: {
          fontSize: scaleW(17),
          color: TEXT_SECONDARY,
          textAlign: "center",
        },
        hero: {
          paddingTop: scaleW(20),
          paddingBottom: scaleW(24),
          paddingHorizontal: scaleW(20),
          marginBottom: scaleW(24),
          borderBottomLeftRadius: scaleW(24),
          borderBottomRightRadius: scaleW(24),
          alignItems: "center",
          backgroundColor: LIGHT_GREEN,
          overflow: "hidden",
        },
        titleText: {
          fontSize: scaleW(24),
          fontWeight: "700",
          color: TEXT_SECONDARY,
          marginBottom: scaleW(14),
          textAlign: "center",
          paddingHorizontal: scaleW(8),
        },
        mainImageWrap: {
          width: "100%",
          borderRadius: scaleW(20),
          overflow: "hidden",
          backgroundColor: "#1a1a2e",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 4,
        },
        mainImage: {
          width: "100%",
          height: scaleW(220),
          borderRadius: scaleW(20),
        },
        tagsRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          alignSelf: "stretch",
          gap: scaleW(10),
          marginTop: scaleW(16),
          paddingHorizontal: scaleW(4),
        },
        tag: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: scaleW(6),
          paddingHorizontal: scaleW(10),
          borderRadius: scaleW(20),
          gap: scaleW(6),
        },
        tagNeutral: {
          backgroundColor: "#FFF",
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.08)",
        },
        tagText: { fontSize: scaleW(13), color: "#374151", fontWeight: "500" },
        descriptionCard: {
          backgroundColor: CREAM,
          paddingVertical: scaleW(18),
          paddingHorizontal: scaleW(24),
          borderRadius: scaleW(16),
          marginTop: scaleW(16),
          marginHorizontal: scaleW(4),
          borderLeftWidth: scaleW(4),
          borderLeftColor: HUNTLY_GREEN,
        },
        descriptionText: {
          fontSize: scaleW(17),
          color: "#1a1a1a",
          textAlign: "center",
          lineHeight: scaleW(26),
        },
        section: {
          marginHorizontal: scaleW(20),
          marginBottom: scaleW(28),
        },
        sectionTitle: {
          fontSize: scaleW(20),
          fontWeight: "700",
          color: TEXT_SECONDARY,
        },
        sectionTitleRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: scaleW(8),
          marginBottom: scaleW(14),
        },
        stepCard: {
          backgroundColor: "#FFF",
          borderRadius: scaleW(16),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(18),
          marginBottom: scaleW(14),
          flexDirection: "row",
          alignItems: "flex-start",
          gap: scaleW(14),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        },
        stepNumber: {
          width: scaleW(36),
          height: scaleW(36),
          borderRadius: scaleW(18),
          backgroundColor: STEP_ACCENT,
          alignItems: "center",
          justifyContent: "center",
        },
        stepNumberText: {
          fontSize: scaleW(17),
          fontWeight: "800",
          color: "#FFF",
        },
        stepBody: { flex: 1 },
        stepText: {
          fontSize: scaleW(17),
          color: TEXT_SECONDARY,
          lineHeight: scaleW(25),
        },
        inlineImage: {
          width: "100%",
          height: scaleW(180),
          borderRadius: scaleW(14),
          backgroundColor: "#e5e7eb",
          marginTop: scaleW(12),
          marginBottom: scaleW(8),
        },
        longDescBlock: {
          backgroundColor: "#FFF",
          borderRadius: scaleW(16),
          padding: scaleW(18),
          marginBottom: scaleW(14),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        },
        taskText: {
          fontSize: scaleW(17),
          color: TEXT_SECONDARY,
          lineHeight: scaleW(25),
        },
        tipCard: {
          backgroundColor: TIP_BG,
          borderRadius: scaleW(14),
          paddingVertical: scaleW(12),
          paddingHorizontal: scaleW(16),
          marginBottom: scaleW(10),
          flexDirection: "row",
          alignItems: "flex-start",
          gap: scaleW(10),
          borderLeftWidth: scaleW(4),
          borderLeftColor: LIGHT_GREEN,
        },
        tipBullet: {
          fontSize: scaleW(17),
          color: TEXT_SECONDARY,
          lineHeight: scaleW(25),
          flex: 1,
        },
        altCard: {
          backgroundColor: ALT_BG,
          borderRadius: scaleW(14),
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(16),
          marginBottom: scaleW(10),
          borderWidth: 1,
          borderColor: "rgba(79, 111, 82, 0.2)",
        },
        altText: {
          fontSize: scaleW(16),
          color: TEXT_SECONDARY,
          lineHeight: scaleW(24),
        },
        triviaCard: {
          backgroundColor: "rgba(245, 245, 240, 0.9)",
          borderRadius: scaleW(14),
          padding: scaleW(16),
          marginBottom: scaleW(10),
          fontStyle: "italic",
        },
        teamRow: { gap: scaleW(24), flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
        polaroid: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 3,
          transform: [{ rotate: "-2deg" }],
        },
        polaroidSecond: { marginLeft: scaleW(40), transform: [{ rotate: "2deg" }] },
        polaroidImage: {
          width: scaleW(220),
          height: scaleW(160),
          borderRadius: scaleW(10),
          borderWidth: 2,
          borderColor: "#FFF",
        },
        nextButton: {
          alignSelf: "center",
          backgroundColor: HUNTLY_GREEN,
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(40),
          borderRadius: scaleW(28),
          marginTop: scaleW(8),
          marginBottom: scaleW(12),
          shadowColor: HUNTLY_GREEN,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 4,
        },
        nextButtonText: {
          textAlign: "center",
          fontSize: scaleW(18),
          fontWeight: "700",
          color: "#FFF",
        },
        floatingFooter: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: scaleW(20),
        },
        floatingFooterInner: {},
      }),
    [scaleW]
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, styles.loadingContainer]}
        edges={["top", "left", "right"]}
      >
        <ActivityIndicator size="large" color={HUNTLY_GREEN} />
        <ThemedText style={[styles.errorText, { marginTop: scaleW(16) }]}>
          Loading your mission…
        </ThemedText>
      </SafeAreaView>
    );
  }

  if (error || !activity) {
    return (
      <SafeAreaView
        style={[styles.container, styles.loadingContainer]}
        edges={["top", "left", "right"]}
      >
        <ThemedText style={styles.errorText}>
          {error ?? "Activity not found"}
        </ThemedText>
      </SafeAreaView>
    );
  }

  const imageSource = getActivityImageSource(activity.image);
  const categoryIds =
    activity.categories && Array.isArray(activity.categories)
      ? activity.categories
      : [];
  const categoryInfos = categoryIds
    .map((cid) => getCategoryById(categories, cid))
    .filter((c): c is NonNullable<typeof c> => c != null);
  const hintLines = normalizeStringArray(activity.hints);
  const tipLines = normalizeStringArray(activity.tips);
  const triviaBlocks = splitBlocks(activity.trivia);
  const instructionSteps = Array.isArray(activity.instructions)
    ? activity.instructions.filter(Boolean)
    : [];
  const alternativeLines = Array.isArray(activity.alternative_approaches)
    ? activity.alternative_approaches.filter(Boolean)
    : [];
  const extraImages = Array.isArray(activity.images)
    ? activity.images.filter((url): url is string => typeof url === "string" && url.length > 0)
    : [];
  const hasSteps = instructionSteps.length > 0;
  const showLongDescription =
    !hasSteps &&
    activity.long_description != null &&
    activity.long_description.trim() !== "";

  let imageIndex = 0;
  const nextInlineImage = () => {
    if (imageIndex >= extraImages.length) return null;
    return extraImages[imageIndex++];
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.pageInner}
        contentContainerStyle={{ paddingBottom: scaleW(180) }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <Animated.View
          entering={FadeInDown.duration(520).springify().damping(18)}
          style={styles.hero}
        >
          <ThemedText type="heading" style={styles.titleText}>
            {activity.title}
          </ThemedText>
          <View style={styles.mainImageWrap}>
            <Image
              source={imageSource as { uri: string } | number}
              style={styles.mainImage}
              resizeMode="cover"
            />
          </View>
          {categoryInfos.length > 0 && (
            <View style={styles.tagsRow}>
              {categoryInfos.slice(0, 5).map((cat, i) => (
                <View
                  key={`cat-${i}-${cat.name}`}
                  style={[styles.tag, styles.tagNeutral]}
                >
                  {cat.icon ? (
                    <Image
                      source={{ uri: cat.icon }}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 2,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <MaterialIcons
                      name="label"
                      size={14}
                      color="#6B7280"
                      style={{ marginRight: 2 }}
                    />
                  )}
                  <ThemedText style={styles.tagText}>{cat.name}</ThemedText>
                </View>
              ))}
            </View>
          )}
          {activity.description != null && activity.description !== "" && (
            <View style={styles.descriptionCard}>
              <ThemedText style={styles.descriptionText}>
                {activity.description}
              </ThemedText>
            </View>
          )}
        </Animated.View>

        {(() => {
          const img = nextInlineImage();
          if (!img) return null;
          return (
            <Animated.View
              key="img-0"
              entering={FadeIn.duration(400).delay(80)}
              style={styles.section}
            >
              <Image
                source={{ uri: img }}
                style={styles.inlineImage}
                resizeMode="cover"
              />
            </Animated.View>
          );
        })()}

        {hasSteps && (
          <Animated.View
            entering={FadeInDown.duration(420).delay(120).springify().damping(18)}
            style={styles.section}
          >
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="format-list-numbered" size={scaleW(24)} color={HUNTLY_GREEN} />
              <ThemedText type="heading" style={styles.sectionTitle}>Steps</ThemedText>
            </View>
            {instructionSteps.map((step, idx) => (
              <React.Fragment key={idx}>
                <Animated.View
                  entering={FadeInDown.duration(380)
                    .delay(160 + idx * 70)
                    .springify()
                    .damping(18)}
                  style={styles.stepCard}
                >
                  <View style={styles.stepNumber}>
                    <ThemedText style={styles.stepNumberText}>
                      {idx + 1}
                    </ThemedText>
                  </View>
                  <View style={styles.stepBody}>
                    <ThemedText style={styles.stepText}>{step}</ThemedText>
                  </View>
                </Animated.View>
                {(() => {
                  const img = nextInlineImage();
                  if (!img) return null;
                  return (
                    <Animated.View
                      key={`step-img-${idx}`}
                      entering={FadeIn.duration(400).delay(200 + idx * 70)}
                    >
                      <Image
                        source={{ uri: img }}
                        style={styles.inlineImage}
                        resizeMode="cover"
                      />
                    </Animated.View>
                  );
                })()}
              </React.Fragment>
            ))}
          </Animated.View>
        )}

        {showLongDescription && (
          <Animated.View
            entering={FadeInDown.duration(420).delay(180).springify().damping(18)}
            style={styles.section}
          >
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="checklist" size={scaleW(24)} color={HUNTLY_GREEN} />
              <ThemedText type="heading" style={styles.sectionTitle}>What to do</ThemedText>
            </View>
            <View style={styles.longDescBlock}>
              <ThemedText style={styles.taskText}>
                {activity.long_description!.trim()}
              </ThemedText>
            </View>
          </Animated.View>
        )}

        {tipLines.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(420).delay(hasSteps ? 220 : 200).springify().damping(18)}
            style={styles.section}
          >
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="lightbulb-outline" size={scaleW(24)} color={HUNTLY_GREEN} />
              <ThemedText type="heading" style={styles.sectionTitle}>Tips</ThemedText>
            </View>
            {tipLines.map((line, i) => (
              <Animated.View
                key={i}
                entering={FadeInDown.duration(350).delay(260 + i * 50)}
                style={styles.tipCard}
              >
                <ThemedText style={styles.tipBullet}>• {line}</ThemedText>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {hintLines.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(420).delay(300).springify().damping(18)}
            style={styles.section}
          >
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="psychology" size={scaleW(24)} color={HUNTLY_GREEN} />
              <ThemedText type="heading" style={styles.sectionTitle}>Hints</ThemedText>
            </View>
            {hintLines.map((line, i) => (
              <Animated.View
                key={i}
                entering={FadeInDown.duration(350).delay(320 + i * 50)}
                style={styles.tipCard}
              >
                <ThemedText style={styles.tipBullet}>• {line}</ThemedText>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {alternativeLines.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(420).delay(340).springify().damping(18)}
            style={styles.section}
          >
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="explore" size={scaleW(24)} color={HUNTLY_GREEN} />
              <ThemedText type="heading" style={styles.sectionTitle}>Alternative approaches</ThemedText>
            </View>
            {alternativeLines.map((line, i) => (
              <Animated.View
                key={i}
                entering={FadeInDown.duration(350).delay(360 + i * 50)}
                style={styles.altCard}
              >
                <ThemedText style={styles.altText}>{line}</ThemedText>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {triviaBlocks.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(420).delay(380).springify().damping(18)}
            style={styles.section}
          >
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="auto-stories" size={scaleW(24)} color={HUNTLY_GREEN} />
              <ThemedText type="heading" style={styles.sectionTitle}>Did you know?</ThemedText>
            </View>
            {triviaBlocks.map((block, i) => (
              <Animated.View
                key={i}
                entering={FadeInDown.duration(350).delay(400 + i * 40)}
                style={styles.triviaCard}
              >
                <ThemedText style={[styles.taskText, { fontStyle: "italic" }]}>
                  {block}
                </ThemedText>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {clubPhotos.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(420).delay(420).springify().damping(18)}
            style={styles.section}
          >
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="photo-library" size={scaleW(24)} color={HUNTLY_GREEN} />
              <ThemedText type="heading" style={styles.sectionTitle}>From the community</ThemedText>
            </View>
            <ThemedText
              style={[styles.taskText, { marginBottom: scaleW(14) }]}
            >
              See what others have shared…
            </ThemedText>
            <View style={styles.teamRow}>
              {clubPhotos.map((photo, i) => (
                <View
                  key={i}
                  style={[
                    styles.polaroid,
                    i === 1 ? styles.polaroidSecond : undefined,
                  ]}
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

      </ScrollView>
      <View style={styles.floatingFooter} pointerEvents="box-none">
        <SafeAreaView edges={["bottom"]} style={styles.floatingFooterInner}>
          <Animated.View
            entering={FadeInDown.duration(480).delay(440).springify().damping(18)}
            style={nextAnimatedStyle}
          >
            <Pressable
              style={styles.nextButton}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/activity/mission/completion",
                  params: { id: String(activity.id) },
                } as Parameters<typeof router.push>[0])
              }
              onPressIn={() => {
                nextScale.value = withSpring(0.96, {
                  damping: 15,
                  stiffness: 400,
                });
              }}
              onPressOut={() => {
                nextScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
            >
              <ThemedText type="heading" style={styles.nextButtonText}>
                I'm ready — complete challenge
              </ThemedText>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
