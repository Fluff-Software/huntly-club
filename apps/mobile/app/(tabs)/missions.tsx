import React, { useMemo, useCallback, useRef, useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ImageBackground } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useNextMissionReleaseDate } from "@/hooks/useNextMissionReleaseDate";
import { useCountdownToUtcDate } from "@/hooks/useCountdownToUtcDate";
import { useLatestMissions } from "@/hooks/useLatestMissions";
import { useTutorialActive } from "@/hooks/useTutorialActive";
import { useRefreshWhenTutorialEnds } from "@/hooks/useRefreshWhenTutorialEnds";
import { usePlayer } from "@/contexts/PlayerContext";
import { MissionCard } from "@/components/MissionCard";
import { supabase } from "@/services/supabase";

const MISSIONS_BG = require("@/assets/images/missions-bg.png");

export default function MissionsScreen() {
  const { scaleW } = useLayoutScale();
  const { profiles } = usePlayer();
  const { missions, completedActivityIds, loading, error, refetch } = useLatestMissions(null);
  const {
    nextReleaseDate,
    loading: nextReleaseLoading,
    refetch: refetchNextRelease,
  } = useNextMissionReleaseDate();

  const handleCountdownComplete = React.useCallback(async () => {
    await refetch();
    await refetchNextRelease();
  }, [refetch, refetchNextRelease]);

  const { label: countdownLabel } = useCountdownToUtcDate(nextReleaseDate, {
    onComplete: handleCountdownComplete });

  const scrollRef = useRef<ScrollView>(null);
  const [completionCountByActivityId, setCompletionCountByActivityId] = React.useState<Record<string, number>>({});
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const isTutorialActive = useTutorialActive();

  const refreshMissionsData = useCallback(() => {
    void refetch();
    void refetchNextRelease();
  }, [refetch, refetchNextRelease]);

  useFocusEffect(
    useCallback(() => {
      if (!isTutorialActive) {
        refreshMissionsData();
      }
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [isTutorialActive, refreshMissionsData])
  );

  useRefreshWhenTutorialEnds(refreshMissionsData);

  React.useEffect(() => {
    if (isTutorialActive) return;
    const profileIds = profiles.map((p) => p.id);
    const activityIds = missions.map((a) => parseInt(a.id, 10));
    if (profileIds.length === 0 || activityIds.length === 0) {
      setCompletionCountByActivityId({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: progressError } = await supabase
        .from("user_activity_progress")
        .select("activity_id, profile_id, completed_at")
        .in("activity_id", activityIds)
        .in("profile_id", profileIds)
        .not("completed_at", "is", null);
      if (cancelled || progressError) return;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const key = String(row.activity_id);
        counts[key] = (counts[key] ?? 0) + 1;
      }
      setCompletionCountByActivityId(counts);
    })();
    return () => { cancelled = true; };
  }, [missions, profiles, isTutorialActive]);

  useEffect(() => {
    if (!hasLoadedOnce && !loading && !error) {
      setHasLoadedOnce(true);
    }
  }, [loading, error, hasLoadedOnce]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        background: { flex: 1 },
        scrollContent: {
          flexGrow: 1,
          paddingTop: scaleW(12),
          paddingBottom: scaleW(32) },
        title: {
          fontSize: scaleW(24),
          lineHeight: scaleW(32),
          fontWeight: "600",
          color: "#FFF",
          textAlign: "center" as const,
          marginBottom: scaleW(12) },
        countdownContainer: {
          alignItems: "center" as const,
          marginBottom: scaleW(10),
          alignSelf: "stretch",
          paddingHorizontal: scaleW(20),
          paddingVertical: scaleW(8),
          backgroundColor: "rgba(244, 240, 235, 0.18)",
          borderRadius: 0 },
        countdownValue: {
          fontSize: scaleW(18),
          fontWeight: "700",
          color: "#FFF",
          textAlign: "center" as const,
          marginBottom: 0 },
        sectionBlock: {
          marginBottom: scaleW(28) },
        cardRow: {
          flexDirection: "row",
          paddingHorizontal: scaleW(20),
          paddingRight: scaleW(32) },
        cardWrap: {},
        loadingContainer: {
          paddingVertical: scaleW(48),
          alignItems: "center" as const },
        errorContainer: {
          paddingVertical: scaleW(24),
          paddingHorizontal: scaleW(24),
          alignItems: "center" as const },
        errorText: { fontSize: scaleW(16), color: "#FFF", textAlign: "center" as const, marginBottom: scaleW(16) },
        retryButton: {
          backgroundColor: "#F4F0EB",
          borderRadius: scaleW(28),
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(32) },
        emptyText: { fontSize: scaleW(16), color: "#FFF", textAlign: "center" as const, opacity: 0.9 } }),
    [scaleW]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ImageBackground source={MISSIONS_BG} style={styles.background} resizeMode="cover">
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {!!nextReleaseDate && !nextReleaseLoading && countdownLabel != null && (
          <View style={styles.countdownContainer}>
            <ThemedText style={styles.countdownValue}>Next mission unlocks in {countdownLabel}</ThemedText>
          </View>
        )}

        <Animated.View entering={FadeInDown.duration(500).delay(0)}>
          <ThemedText type="heading" style={styles.title}>Current Missions</ThemedText>
        </Animated.View>

        {(!hasLoadedOnce && loading) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFF" />
            <ThemedText style={[styles.emptyText, { marginTop: scaleW(16) }]}>Finding your missions…</ThemedText>
          </View>
        )}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>Something went wrong loading your missions.</ThemedText>
            <Pressable style={styles.retryButton} onPress={refetch}>
              <ThemedText type="heading" style={{ fontSize: scaleW(16), fontWeight: "600", color: "#2D5A27" }}>
                Try again
              </ThemedText>
            </Pressable>
          </View>
        )}

        {(!loading || hasLoadedOnce) && !error && (
          <>
            {missions.length === 0 ? (
              <View style={[styles.loadingContainer, { paddingVertical: scaleW(24) }]}>
                <ThemedText style={styles.emptyText}>New adventures are on the way. Check back soon!</ThemedText>
              </View>
            ) : (
              <Animated.View style={styles.sectionBlock}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardRow}
                >
                  {missions.map((card) => (
                    <View key={card.id} style={styles.cardWrap}>
                      <MissionCard
                        card={card}
                        xp={card.xp}
                        tiltDeg={0}
                        completed={completedActivityIds.has(card.id)}
                        completionCount={completionCountByActivityId[card.id] ?? 0}
                        totalExplorers={profiles.length}
                      />
                    </View>
                  ))}
                </ScrollView>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}
