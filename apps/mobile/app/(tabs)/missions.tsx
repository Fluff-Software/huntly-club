import React, { useRef, useMemo, useCallback } from "react";
import {
  View,
  ScrollView,
  Animated as RNAnimated,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { BackHeader } from "@/components/BackHeader";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useCurrentChapterActivities } from "@/hooks/useCurrentChapterActivities";
import { useAllChaptersActivities } from "@/hooks/useAllChaptersActivities";
import { MissionCard } from "@/components/MissionCard";
import type { ChapterActivityCard } from "@/hooks/useCurrentChapterActivities";

const MISSIONS_ORANGE = "#D2684B";

export default function MissionsScreen() {
  const { scaleW, width } = useLayoutScale();
  const { activityCards: currentCards, loading: currentLoading, error: currentError, refetch: refetchCurrent } = useCurrentChapterActivities();
  const { activityCards: allCards, loading: allLoading, error: allError, refetch: refetchAll } = useAllChaptersActivities();

  const currentIds = useMemo(() => new Set(currentCards.map((c) => c.id)), [currentCards]);
  const oldCards: ChapterActivityCard[] = useMemo(
    () => allCards.filter((card) => !currentIds.has(card.id)),
    [allCards, currentIds]
  );

  const loading = currentLoading || allLoading;
  const error = currentError ?? allError;
  const refetch = useCallback(async () => {
    await refetchCurrent();
    await refetchAll();
  }, [refetchCurrent, refetchAll]);

  const missionCardsScrollX = useRef(new RNAnimated.Value(0)).current;
  const oldMissionCardsScrollX = useRef(new RNAnimated.Value(0)).current;
  const missionCardWidth = scaleW(270);
  const missionCardBorderWidth = 6;
  const missionCardGap = scaleW(12);
  const missionCardStep = missionCardWidth + missionCardGap;
  const missionCardsPaddingHorizontal = Math.max(0, Math.round((width - missionCardWidth) / 2));
  const getMissionCenterScrollX = (index: number) => index * missionCardStep;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: MISSIONS_ORANGE },
        scrollContent: {
          flexGrow: 1,
          backgroundColor: MISSIONS_ORANGE,
          paddingTop: scaleW(12),
          paddingBottom: scaleW(32),
        },
        title: {
          fontSize: scaleW(24),
          lineHeight: scaleW(32),
          fontWeight: "600",
          color: "#FFF",
          textAlign: "center" as const,
          marginBottom: scaleW(12),
        },
        sectionTitle: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: "#FFF",
          marginBottom: scaleW(8),
          marginHorizontal: scaleW(20),
          opacity: 0.95,
        },
        sectionBlock: {
          marginBottom: scaleW(24),
        },
        cardsScroll: { overflow: "visible" as const },
        cardsContent: {
          paddingLeft: missionCardsPaddingHorizontal,
          paddingRight: missionCardsPaddingHorizontal,
          paddingBottom: scaleW(4),
        },
        loadingContainer: {
          paddingVertical: scaleW(48),
          alignItems: "center" as const,
        },
        errorContainer: {
          paddingVertical: scaleW(24),
          paddingHorizontal: scaleW(24),
          alignItems: "center" as const,
        },
        errorText: { fontSize: scaleW(16), color: "#FFF", textAlign: "center" as const, marginBottom: scaleW(16) },
        retryButton: {
          backgroundColor: "#F4F0EB",
          borderRadius: scaleW(28),
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(32),
        },
        emptyText: { fontSize: scaleW(16), color: "#FFF", textAlign: "center" as const, opacity: 0.9 },
      }),
    [scaleW, width, missionCardsPaddingHorizontal]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={{ paddingHorizontal: scaleW(20), paddingBottom: scaleW(4), backgroundColor: MISSIONS_ORANGE }}>
        <BackHeader backToLabel="Clubhouse" variant="dark" />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <Animated.View entering={FadeInDown.duration(500).delay(0).springify().damping(18)}>
          <ThemedText type="heading" style={styles.title}>Missions</ThemedText>
        </Animated.View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFF" />
            <ThemedText style={[styles.emptyText, { marginTop: scaleW(16) }]}>Loading missions…</ThemedText>
          </View>
        )}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable style={styles.retryButton} onPress={refetch}>
              <ThemedText type="heading" style={{ fontSize: scaleW(16), fontWeight: "600", color: "#2D5A27" }}>
                Retry
              </ThemedText>
            </Pressable>
          </View>
        )}

        {!loading && !error && (
          <>
            <Animated.View entering={FadeInDown.duration(500).delay(100).springify().damping(18)} style={styles.sectionBlock}>
              <ThemedText type="heading" style={styles.sectionTitle}>This chapter&apos;s missions</ThemedText>
              <View style={styles.cardsScroll}>
                <RNAnimated.ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardsContent}
                  style={{ overflow: "visible" }}
                  nestedScrollEnabled={Platform.OS === "android"}
                  removeClippedSubviews={false}
                  overScrollMode="never"
                  scrollEventThrottle={16}
                  onScroll={RNAnimated.event(
                    [{ nativeEvent: { contentOffset: { x: missionCardsScrollX } } }],
                    { useNativeDriver: true }
                  )}
                  snapToInterval={missionCardStep}
                  snapToAlignment="start"
                  decelerationRate="fast"
                >
                  {currentCards.length === 0 ? (
                    <View style={[styles.loadingContainer, { paddingVertical: scaleW(24) }]}>
                      <ThemedText style={styles.emptyText}>No missions for this chapter yet.</ThemedText>
                    </View>
                  ) : (
                    currentCards.map((card, index) => {
                      const centerScrollX = index === 0 ? 0 : getMissionCenterScrollX(index);
                      const rotation = missionCardsScrollX.interpolate({
                        inputRange: [centerScrollX - 120, centerScrollX, centerScrollX + 120],
                        outputRange: ["-2deg", "0deg", "2deg"],
                        extrapolate: "clamp",
                      });
                      return (
                        <RNAnimated.View key={card.id} style={{ transform: [{ rotate: rotation }] }}>
                          <MissionCard card={card} xp={card.xp} tiltDeg={0} />
                        </RNAnimated.View>
                      );
                    })
                  )}
                </RNAnimated.ScrollView>
              </View>
            </Animated.View>

            {oldCards.length > 0 && (
              <Animated.View entering={FadeInDown.duration(500).delay(200).springify().damping(18)} style={styles.sectionBlock}>
                <ThemedText type="heading" style={styles.sectionTitle}>Previous missions</ThemedText>
                <View style={styles.cardsScroll}>
                  <RNAnimated.ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.cardsContent}
                    style={{ overflow: "visible" }}
                    nestedScrollEnabled={Platform.OS === "android"}
                    removeClippedSubviews={false}
                    overScrollMode="never"
                    scrollEventThrottle={16}
                    onScroll={RNAnimated.event(
                      [{ nativeEvent: { contentOffset: { x: oldMissionCardsScrollX } } }],
                      { useNativeDriver: true }
                    )}
                    snapToInterval={missionCardStep}
                    snapToAlignment="start"
                    decelerationRate="fast"
                  >
                    {oldCards.map((card, index) => {
                      const centerScrollX = index === 0 ? 0 : getMissionCenterScrollX(index);
                      const rotation = oldMissionCardsScrollX.interpolate({
                        inputRange: [centerScrollX - 120, centerScrollX, centerScrollX + 120],
                        outputRange: ["-2deg", "0deg", "2deg"],
                        extrapolate: "clamp",
                      });
                      return (
                        <RNAnimated.View key={card.id} style={{ transform: [{ rotate: rotation }] }}>
                          <MissionCard card={card} xp={card.xp} tiltDeg={0} />
                        </RNAnimated.View>
                      );
                    })}
                  </RNAnimated.ScrollView>
                </View>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
