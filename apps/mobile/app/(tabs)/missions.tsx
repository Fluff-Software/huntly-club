import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useNavigationReturn } from "@/contexts/NavigationReturnContext";
import { setStatusBarStyle } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { FKChip, FKSkeleton } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { useNextMissionReleaseDate } from "@/hooks/useNextMissionReleaseDate";
import { useCountdownToUtcDate } from "@/hooks/useCountdownToUtcDate";
import { useLatestMissions, type MissionActivityCard } from "@/hooks/useLatestMissions";
import { useTutorialActive } from "@/hooks/useTutorialActive";
import { useRefreshWhenTutorialEnds } from "@/hooks/useRefreshWhenTutorialEnds";
import { usePlayer } from "@/contexts/PlayerContext";
import { supabase } from "@/services/supabase";

/** Missions are the story: a couple drop each week; everything released stays playable. */
export default function MissionsScreen() {
  const { pushWithReturn } = useNavigationReturn();
  const { profiles } = usePlayer();
  const { missions, loading, error, refetch } = useLatestMissions(null);
  const { nextReleaseDate, refetch: refetchNextRelease } = useNextMissionReleaseDate();
  const handleCountdownComplete = useCallback(async () => {
    await refetch();
    await refetchNextRelease();
  }, [refetch, refetchNextRelease]);
  const { label: countdownLabel } = useCountdownToUtcDate(nextReleaseDate, { onComplete: handleCountdownComplete });
  const scrollRef = useRef<ScrollView>(null);
  const [completed, setCompleted] = useState<Record<string, number>>({});
  const isTutorialActive = useTutorialActive();

  const refresh = useCallback(() => {
    void refetch();
    void refetchNextRelease();
  }, [refetch, refetchNextRelease]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      if (!isTutorialActive) refresh();
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [isTutorialActive, refresh])
  );
  useRefreshWhenTutorialEnds(refresh);

  useEffect(() => {
    if (isTutorialActive) return;
    const profileIds = profiles.map((p) => p.id);
    const activityIds = missions.map((a) => parseInt(a.id, 10));
    if (profileIds.length === 0 || activityIds.length === 0) {
      setCompleted({});
      return;
    }
    let cancelled = false;
    void supabase
      .from("user_activity_progress")
      .select("activity_id, profile_id, completed_at")
      .in("activity_id", activityIds)
      .in("profile_id", profileIds)
      .not("completed_at", "is", null)
      .then(({ data, error: progressError }) => {
        if (cancelled || progressError) return;
        const counts: Record<string, number> = {};
        for (const row of data ?? []) counts[String(row.activity_id)] = (counts[String(row.activity_id)] ?? 0) + 1;
        setCompleted(counts);
      });
    return () => {
      cancelled = true;
    };
  }, [missions, profiles, isTutorialActive]);

  const open = (m: MissionActivityCard) =>
    pushWithReturn({ pathname: "/(tabs)/activity/mission", params: { id: m.id } });

  const thisWeek = missions.slice(0, 2);
  const earlier = missions.slice(2);

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={TYPE.hero}>Missions</Text>
        <Text style={[TYPE.bodySmall, { marginTop: 6, marginBottom: 18, fontSize: 16 }]}>
          The story of Huntly World, one mission at a time. New ones drop every week.
        </Text>

        {countdownLabel ? (
          <View style={styles.countdown}>
            <Ionicons name="hourglass-outline" size={18} color={FK.sunbeam} />
            <Text style={styles.countdownText}>Next mission drops in {countdownLabel}</Text>
          </View>
        ) : null}

        {loading && missions.length === 0 ? (
          <View style={{ gap: 14, marginTop: 8 }}>
            <FKSkeleton height={220} />
            <FKSkeleton height={220} />
            <FKSkeleton height={88} />
          </View>
        ) : error ? (
          <Text style={TYPE.bodySmall}>Couldn't load missions. Pull to try again.</Text>
        ) : (
          <>
            <Text style={[TYPE.eyebrow, styles.section]}>THIS WEEK</Text>
            {thisWeek.map((m, i) => (
              <Animated.View key={m.id} entering={FadeInDown.duration(300).delay(i * 60)}>
                <BigMissionCard mission={m} done={(completed[m.id] ?? 0) > 0} onPress={() => open(m)} />
              </Animated.View>
            ))}
            {earlier.length ? <Text style={[TYPE.eyebrow, styles.section]}>CATCH UP</Text> : null}
            {earlier.map((m, i) => (
              <Animated.View key={m.id} entering={FadeInDown.duration(300).delay(120 + i * 40)}>
                <SmallMissionRow mission={m} done={(completed[m.id] ?? 0) > 0} onPress={() => open(m)} />
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BigMissionCard({ mission, done, onPress }: { mission: MissionActivityCard; done: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={mission.title}>
      <ImageBackground source={mission.image} style={styles.big} imageStyle={{ borderRadius: RADIUS.lg }}>
        <LinearGradient
          colors={["rgba(16,37,27,0.05)", "rgba(16,37,27,0.9)"]}
          style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.lg }]}
        />
        {done ? (
          <View style={styles.doneBadge}>
            <Ionicons name="checkmark" size={16} color={FK.ink} />
            <Text style={styles.doneText}>DONE</Text>
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        <Text style={styles.bigTitle}>{mission.title}</Text>
        {mission.description ? (
          <Text style={styles.bigDesc} numberOfLines={2}>
            {mission.description}
          </Text>
        ) : null}
      </ImageBackground>
    </Pressable>
  );
}

function SmallMissionRow({ mission, done, onPress }: { mission: MissionActivityCard; done: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button" accessibilityLabel={mission.title}>
      <ImageBackground source={mission.image} style={styles.rowImg} imageStyle={{ borderRadius: 14 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {mission.title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {done ? "Done · play again any time" : mission.description}
        </Text>
      </View>
      {done ? <Ionicons name="checkmark-circle" size={24} color={FK.forest} /> : <Ionicons name="chevron-forward" size={20} color={FK.muted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FK.moss },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  countdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: FK.ink,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
  },
  countdownText: { fontFamily: FONT.displayBold, fontSize: 15, color: FK.white },
  section: { marginTop: 18, marginBottom: 10 },
  big: { minHeight: 240, borderRadius: RADIUS.lg, padding: 18, marginBottom: 12, overflow: "hidden" },
  bigTitle: { fontFamily: FONT.display, fontSize: 28, lineHeight: 31, color: FK.white, letterSpacing: -0.5 },
  bigDesc: { fontFamily: FONT.body, fontSize: 15, lineHeight: 20, color: "#DDE6D8", marginTop: 6 },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: FK.sunbeam,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  doneText: { fontFamily: FONT.display, fontSize: 12, letterSpacing: 1.2, color: FK.ink },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: FK.paper,
    borderRadius: RADIUS.md,
    padding: 10,
    paddingRight: 16,
    marginBottom: 8,
  },
  rowImg: { width: 64, height: 64 },
  rowTitle: { fontFamily: FONT.display, fontSize: 17, color: FK.ink },
  rowSub: { fontFamily: FONT.body, fontSize: 14, color: FK.muted, marginTop: 2 },
});
