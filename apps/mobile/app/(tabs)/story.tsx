import React, { useMemo, useEffect, useState, useCallback } from "react";
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
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useFirstSeason } from "@/hooks/useFirstSeason";
import { useCurrentChapter } from "@/hooks/useCurrentChapter";
import { useAllChapters } from "@/hooks/useAllChapters";
import { useRouter } from "expo-router";

function formatReleaseDate(isoDate: string): string {
  const d = new Date(isoDate);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

const STORY_BLUE = "#4B9CD2";
const CREAM = "#F4F0EB";
const DARK_GREEN = "#2D5A27";

export default function StoryScreen() {
  const router = useRouter();
  const { scaleW, width } = useLayoutScale();
  const { firstSeason, heroImageSource, loading: seasonLoading, error: seasonError, refetch: refetchSeason } = useFirstSeason();
  const { nextChapterDate, loading: currentChapterLoading, error: chapterError, refetch: refetchChapter } = useCurrentChapter();
  const { chapters, loading: chaptersLoading, error: chaptersError, refetch: refetchChapters } = useAllChapters();
  const creamButtonScale = useSharedValue(1);
  const completeButtonScale = useSharedValue(1);

  const loading = seasonLoading || currentChapterLoading || chaptersLoading;
  const error = seasonError ?? chapterError ?? chaptersError;

  const handleRetry = useCallback(() => {
    refetchSeason();
    refetchChapter();
    refetchChapters();
  }, [refetchSeason, refetchChapter, refetchChapters]);

  const creamButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: creamButtonScale.value }],
  }));
  const completeButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completeButtonScale.value }],
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: STORY_BLUE },
        scrollContent: {
          flexGrow: 1,
          paddingTop: scaleW(24),
        },
        seasonContainer: {
          backgroundColor: STORY_BLUE,
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
          zIndex: 1,
        },
        imageCircleWrap: {
          width: width * 2.5,
          height: width * 2.5,
          borderRadius: (width * 2.5) / 2,
          overflow: "hidden",
          marginBottom: scaleW(20),
          alignSelf: "center",
          marginTop: -width * 2.1,
        },
        imageCircleImage: {
          width: "50%",
          height: "50%",
          marginTop: width * 1.6,
          alignSelf: "center",
        },
        seasonLabel: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: "#FFF",
          textAlign: "center",
          marginBottom: scaleW(16),
          opacity: 0.95,
        },
        seasonTitle: {
          fontSize: scaleW(32),
          lineHeight: scaleW(40),
          fontWeight: "600",
          color: "#FFF",
          textAlign: "center",
          marginBottom: scaleW(16),
        },
        creamButton: {
          backgroundColor: CREAM,
          alignSelf: "center",
          borderRadius: scaleW(28),
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(32),
          alignItems: "center",
          justifyContent: "center",
          marginBottom: scaleW(40),
        },
        chapterContainer: {
          backgroundColor: "#438DBD",
          paddingVertical: scaleW(48),
          paddingHorizontal: scaleW(36),
        },
        chapterTitle: {
          fontSize: scaleW(20),
          fontWeight: "600",
          color: "#FFF",
          marginBottom: scaleW(4),
        },
        releaseDate: {
          fontSize: scaleW(13),
          color: "rgba(255,255,255,0.7)",
          marginBottom: scaleW(16),
        },
        bodyText: {
          fontSize: scaleW(16),
          color: "#FFF",
          lineHeight: scaleW(24),
          marginBottom: scaleW(12),
        },
        completeButton: {
          backgroundColor: "#7FAF8A",
          alignSelf: "flex-start",
          borderRadius: scaleW(28),
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(24),
          alignItems: "center",
          justifyContent: "center",
          marginTop: scaleW(24),
          marginBottom: scaleW(48),
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        nextLabel: {
          fontSize: scaleW(22),
          fontWeight: "600",
          color: "#FFF",
          textAlign: "center",
          opacity: 0.95,
          marginBottom: scaleW(4),
        },
        nextDate: {
          fontSize: scaleW(22),
          fontWeight: "600",
          color: "#FFF",
          textAlign: "center",
        },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: scaleW(24),
        },
        loadingText: {
          fontSize: scaleW(16),
          color: "#FFF",
          marginTop: scaleW(16),
          opacity: 0.9,
        },
        errorContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: scaleW(24),
        },
        errorText: {
          fontSize: scaleW(16),
          color: "#FFF",
          textAlign: "center",
          marginBottom: scaleW(24),
          opacity: 0.95,
        },
        retryButton: {
          backgroundColor: CREAM,
          borderRadius: scaleW(28),
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(32),
        },
        retryButtonText: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: DARK_GREEN,
        },
      }),
    [scaleW, width]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={["top", "left", "right"]}>
        <ActivityIndicator size="large" color="#FFF" />
        <ThemedText style={styles.loadingText}>Loading story…</ThemedText>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.errorContainer]} edges={["top", "left", "right"]}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <Pressable
          onPress={handleRetry}
          style={styles.retryButton}
          onPressIn={() => {
            creamButtonScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
          }}
          onPressOut={() => {
            creamButtonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
          }}
        >
          <ThemedText type="heading" style={styles.retryButtonText}>
            Retry
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {firstSeason && (
          <View style={styles.seasonContainer}>
            <Animated.View
              entering={FadeInDown.duration(600).delay(0).springify().damping(18)}
              style={styles.imageCircleWrap}
            >
              <Image
                source={heroImageSource}
                resizeMode="contain"
                style={styles.imageCircleImage}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(500).delay(150).springify().damping(18)}>
              <ThemedText type="heading" style={styles.seasonLabel}>Season 1</ThemedText>
              {firstSeason.name != null && firstSeason.name !== "" && (
                <ThemedText type="heading" style={styles.seasonTitle}>
                  {firstSeason.name}
                </ThemedText>
              )}
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(500).delay(280).springify().damping(18)}
              style={creamButtonAnimatedStyle}
            >
              <Pressable
                onPress={() => router.push("/sign-up/intro")}
                onPressIn={() => {
                  creamButtonScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
                }}
                onPressOut={() => {
                  creamButtonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
                }}
                style={styles.creamButton}
              >
                <ThemedText
                  type="heading"
                  style={{
                    fontSize: scaleW(16),
                    fontWeight: "600",
                    color: DARK_GREEN,
                  }}
                >
                  See the season story
                </ThemedText>
              </Pressable>
            </Animated.View>
          </View>
        )}

        {chapters.length > 0 && chapters.map((chapter, index) => (
          <View key={chapter.id} style={styles.chapterContainer}>
            <Animated.View entering={FadeInDown.duration(500).delay(index * 50).springify().damping(18)}>
              <ThemedText type="heading" style={styles.chapterTitle}>
                Chapter {chapter.week_number}: {chapter.title ?? ""}
              </ThemedText>
              <ThemedText style={styles.releaseDate}>
                Released {formatReleaseDate(chapter.unlock_date)}
              </ThemedText>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(500).delay(100 + index * 50).springify().damping(18)}>
              {(chapter.body
                ? chapter.body.split(/\n\n+/).filter(Boolean)
                : []
              ).map((paragraph, i, arr) => (
                <ThemedText
                  key={i}
                  style={[styles.bodyText, i === arr.length - 1 && { marginBottom: scaleW(4) }]}
                >
                  {paragraph.trim()}
                </ThemedText>
              ))}
            </Animated.View>
            {index === 0 && (
              <Animated.View
                entering={FadeInDown.duration(500).delay(200).springify().damping(18)}
                style={completeButtonAnimatedStyle}
              >
                <Pressable
                  onPress={() => router.push("/(tabs)/missions")}
                  onPressIn={() => {
                    completeButtonScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
                  }}
                  onPressOut={() => {
                    completeButtonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
                  }}
                  style={styles.completeButton}
                >
                  <ThemedText
                    type="heading"
                    style={{
                      fontSize: scaleW(15),
                      fontWeight: "600",
                      color: "#FFF",
                    }}
                  >
                    1 / 2 missions complete →
                  </ThemedText>
                </Pressable>
              </Animated.View>
            )}
          </View>
        ))}

        {nextChapterDate && chapters.length > 0 && (
          <View style={styles.chapterContainer}>
            <Animated.View entering={FadeInDown.duration(500).delay(0).springify().damping(18)}>
              <ThemedText type="heading" style={styles.nextLabel}>Next chapter coming on</ThemedText>
              <ThemedText type="heading" style={styles.nextDate}>
                {formatReleaseDate(nextChapterDate)}
              </ThemedText>
            </Animated.View>
          </View>
        )}

        {!firstSeason && chapters.length === 0 && (
          <View style={[styles.chapterContainer, styles.loadingContainer]}>
            <ThemedText style={styles.errorText}>
              No story content available yet.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
