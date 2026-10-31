import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  AdventureHeroCard,
  ClubhouseHeader,
  GuideMessageCard,
  PlanBanner,
  type PlanBannerState,
  SecretMessageCard,
  TeamRaceStrip,
  YourWeekCard,
} from "@/components/clubhouse/ClubhouseCards";
import { FKButton } from "@/components/fieldkit";
import { SecretMessage } from "@/components/onboarding/SecretMessage";
import { FK } from "@/constants/fieldKit";
import { guideForTeamName, GUIDES } from "@/constants/guides";
import { useAuth } from "@/contexts/AuthContext";
import { useHomeBootstrap } from "@/contexts/HomeBootstrapContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useProfileDashboard } from "@/contexts/ProfileDashboardContext";
import { useUser } from "@/contexts/UserContext";
import { useAdventurePlan } from "@/hooks/useAdventurePlan";
import { useClubhouseStats } from "@/hooks/useClubhouseStats";
import { useExploreRegionSupport } from "@/hooks/useExploreRegionSupport";
import { useLatestMissions, type MissionActivityCard } from "@/hooks/useLatestMissions";
import { useTutorialActive } from "@/hooks/useTutorialActive";
import {
  type AdventurePlan,
  friendlyTime,
  friendlyWhen,
  isFirstSlotMissed,
  markReschedulePrompted,
  nextWeekdayAt,
  shortWeekday,
} from "@/services/adventurePlanService";
import { shortDuration } from "@/services/firstMissionService";
import { getLocationPermissionStatus } from "@/services/locationService";
import { getSecretMessagePending, setSecretMessagePending } from "@/services/secretMessageService";
import { supabase } from "@/services/supabase";
import { getAllTeamsWithXp, getTeamAchievementTotals } from "@/services/teamActivityService";

const MISSIONS_PER_WEEK = 2;

type NextMission = { id: number; title: string; image: string | null; xp: number | null; completed: boolean };

function imageUrl(card: MissionActivityCard): string | null {
  const img = card.image as { uri?: string } | number;
  return typeof img === "object" && img?.uri ? img.uri : null;
}

/** Oldest uncompleted mission among the latest releases; falls back to the newest once everything is done. */
function pickNextMission(missions: MissionActivityCard[], completed: Set<string>): NextMission | null {
  if (missions.length === 0) return null;
  for (let i = missions.length - 1; i >= 0; i -= 1) {
    const card = missions[i];
    if (!completed.has(card.id)) {
      return { id: parseInt(card.id, 10), title: card.title, image: imageUrl(card), xp: card.xp, completed: false };
    }
  }
  const newest = missions[0];
  return { id: parseInt(newest.id, 10), title: newest.title, image: imageUrl(newest), xp: newest.xp, completed: true };
}

/** Upcoming slot for the plan banner: the booked first slot, else the next weekly one. */
function upcomingSlot(plan: AdventurePlan | null, now = new Date()): Date | null {
  if (!plan) return null;
  if (plan.firstAt && plan.choice !== "skipped") {
    const first = new Date(plan.firstAt);
    if (first.getTime() > now.getTime() - 3 * 60 * 60 * 1000) return first;
  }
  if (plan.weeklyDays.length && plan.weeklyTime) {
    const candidates = plan.weeklyDays.map((d) => nextWeekdayAt(now, d, plan.weeklyTime!));
    return candidates.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  }
  return null;
}

function isAdventureTime(slot: Date | null, now = new Date()): boolean {
  if (!slot) return false;
  const diff = now.getTime() - slot.getTime();
  return diff > -45 * 60 * 1000 && diff < 3 * 60 * 60 * 1000;
}

export default function ClubhouseScreen() {
  const { clubhouseActivityReady, requireClubhouseActivityReady, markClubhouseActivityReady } = useHomeBootstrap();
  const { profiles, loading: profilesLoading } = usePlayer();
  const { preload: preloadProfileDashboard } = useProfileDashboard();
  const { team } = useUser();
  const { user } = useAuth();
  const isTutorialActive = useTutorialActive();
  const guide = guideForTeamName(team?.name);
  const allProfileIds = useMemo(() => profiles.map((p) => p.id), [profiles]);
  const firstProfileId = profiles[0]?.id ?? null;
  const names = profiles.map((p) => p.name);
  const displayName = names.length <= 1 ? names[0] ?? "Explorer" : names.length === 2 ? `${names[0]} & ${names[1]}` : `${names[0]} & co`;

  const { missions, completedByAnyProfileActivityIds, loading: missionsLoading, refetch: refetchMissions } =
    useLatestMissions(firstProfileId, { allProfileIds });
  const next = useMemo(
    () => pickNextMission(missions, completedByAnyProfileActivityIds),
    [missions, completedByAnyProfileActivityIds]
  );
  const { stats, loading: statsLoading, refetch: refetchStats } = useClubhouseStats(allProfileIds);
  const { plan, refetch: refetchPlan, setPlan } = useAdventurePlan(team?.name);
  const [locationPermission, setLocationPermission] = useState<"loading" | "granted" | "denied" | "undetermined">("loading");
  const { isSupported: exploreSupported } = useExploreRegionSupport(locationPermission);
  const [secretPending, setSecretPendingState] = useState(false);
  const [secretOpen, setSecretOpen] = useState(false);
  const [missionMeta, setMissionMeta] = useState<{ duration: string | null; type: string | null; captain: string | null } | null>(null);
  const [race, setRace] = useState<{ name: string; total: number; colour: string }[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!profilesLoading && profiles.length > 0) preloadProfileDashboard();
  }, [profilesLoading, profiles.length, preloadProfileDashboard]);

  useEffect(() => {
    void getLocationPermissionStatus().then(setLocationPermission);
    void getSecretMessagePending().then(setSecretPendingState);
  }, []);

  // Duration / indoors / guide chips for the hero card.
  useEffect(() => {
    if (!next) return;
    let cancelled = false;
    supabase
      .from("activities")
      .select("estimated_duration, mission_type, intro_captain")
      .eq("id", next.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const row = data as { estimated_duration: string | null; mission_type: string | null; intro_captain: string | null };
        setMissionMeta({ duration: row.estimated_duration, type: row.mission_type, captain: row.intro_captain });
      });
    return () => {
      cancelled = true;
    };
  }, [next?.id]);

  const loadRace = useCallback(async () => {
    try {
      const teams = await getAllTeamsWithXp();
      let totals: Record<number, number> = {};
      try {
        totals = await getTeamAchievementTotals();
      } catch {
        totals = Object.fromEntries(teams.map((t) => [t.id, t.team_xp ?? 0]));
      }
      setRace(
        GUIDES.map((g) => {
          const t = teams.find((x) => x.name.toLowerCase() === g.teamName.toLowerCase());
          return { name: g.teamName, total: t ? totals[t.id] ?? 0 : 0, colour: g.colour };
        }).sort((a, b) => b.total - a.total)
      );
    } catch {
      setRace([]);
    }
  }, []);

  const ready = !missionsLoading && !statsLoading;

  useLayoutEffect(() => {
    requireClubhouseActivityReady();
  }, [requireClubhouseActivityReady]);

  useEffect(() => {
    if (ready) markClubhouseActivityReady();
  }, [ready, markClubhouseActivityReady]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      if (!isTutorialActive) {
        void refetchMissions();
        void refetchStats();
        void refetchPlan();
      }
      void loadRace();
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [isTutorialActive, refetchMissions, refetchStats, refetchPlan, loadRace])
  );

  const now = new Date();
  const slot = upcomingSlot(plan, now);
  const adventureTime = isAdventureTime(slot, now);
  const missed = isFirstSlotMissed(plan, stats.lastMissionAt, now);

  const planState: PlanBannerState = missed
    ? { kind: "missed", headline: "We missed our adventure slot" }
    : slot
      ? {
          kind: "booked",
          headline: `${guide.teamName} head out ${friendlyWhen(slot, now)}`,
          sub:
            plan?.weeklyDays.length && plan.weeklyTime
              ? `Then every ${plan.weeklyDays.map(shortWeekday).join(", ")} at ${friendlyTime(nextWeekdayAt(now, plan.weeklyDays[0], plan.weeklyTime))}`
              : "We'll send one reminder on the day.",
        }
      : { kind: "none" };

  const guideLine = (() => {
    if (adventureTime) return `It's adventure time! I'm ready when you are.`;
    if (stats.missionsTotal === 0) return `Your first mission is ready. I picked it just for you!`;
    if (stats.missionsThisWeek >= MISSIONS_PER_WEEK && exploreSupported)
      return `Missions done this week! Psst: cards are hiding near you.`;
    if (stats.missionsThisWeek >= MISSIONS_PER_WEEK) return `Both missions done this week. You're a legend!`;
    if (exploreSupported && stats.cardsThisWeek === 0) return `Psst! A card is hiding somewhere near you today.`;
    return `A new mission is waiting. Shall we?`;
  })();

  const heroEyebrow = adventureTime
    ? "IT'S ADVENTURE TIME"
    : next?.completed
      ? "ALL CAUGHT UP"
      : stats.missionsTotal === 0
        ? "YOUR FIRST MISSION"
        : "NEXT MISSION";

  const chips = [
    shortDuration(missionMeta?.duration),
    missionMeta?.type === "indoor" ? "Indoors" : missionMeta?.type === "outdoor" ? "Outdoors" : null,
    missionMeta?.captain ? missionMeta.captain[0].toUpperCase() + missionMeta.captain.slice(1) : null,
  ].filter(Boolean) as string[];

  const openMission = () => {
    if (!next) return;
    router.push({ pathname: "/(tabs)/activity/mission", params: { id: String(next.id) } } as Parameters<typeof router.push>[0]);
  };

  const openPlan = () => {
    if (missed && plan && user?.id) {
      void markReschedulePrompted(user.id).catch(() => undefined);
      setPlan({ ...plan, reschedulePromptedAt: new Date().toISOString() });
    }
    router.push("/(tabs)/reminders" as Parameters<typeof router.push>[0]);
  };

  return (
    <View style={styles.root}>
      {!clubhouseActivityReady ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator size="large" color={FK.forest} />
        </View>
      ) : null}
      <SafeAreaView edges={["top", "left", "right"]} style={[{ flex: 1 }, !clubhouseActivityReady && { opacity: 0 }]}>
        <View style={styles.blob} pointerEvents="none" />
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ClubhouseHeader
            guide={guide}
            name={displayName}
            streakWeeks={stats.streakWeeks}
            onPressProfile={() => router.push("/(tabs)/profile")}
          />

          {secretPending ? (
            <Animated.View entering={FadeInDown.duration(350)}>
              <SecretMessageCard guide={guide} onOpen={() => setSecretOpen(true)} />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(350)}>
              <GuideMessageCard guide={guide} line={guideLine} onPress={next ? openMission : undefined} />
            </Animated.View>
          )}

          {next ? (
            <Animated.View entering={FadeInDown.duration(350).delay(60)}>
              <AdventureHeroCard
                eyebrow={heroEyebrow}
                title={next.title}
                image={next.image}
                chips={chips}
                points={next.xp ? `+${next.xp} for ${guide.teamName}` : null}
                onPress={openMission}
                completed={next.completed}
              />
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.duration(350).delay(120)}>
            <PlanBanner state={planState} onPress={openPlan} />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(160)}>
            <YourWeekCard
              missionsThisWeek={stats.missionsThisWeek}
              missionsGoal={MISSIONS_PER_WEEK}
              cardsThisWeek={stats.cardsThisWeek}
              exploreAvailable={exploreSupported}
              onMissions={() => router.push("/(tabs)/missions")}
              onExplore={() => router.push("/(tabs)/activity/explore" as Parameters<typeof router.push>[0])}
            />
          </Animated.View>

          {race.length ? (
            <Animated.View entering={FadeInDown.duration(350).delay(200)}>
              <TeamRaceStrip rows={race} myTeam={team?.name ?? null} onPress={() => router.push("/(tabs)/social")} />
            </Animated.View>
          ) : null}

          <FKButton
            label="More ways to play"
            variant="link"
            onPress={() => router.push("/(tabs)/activity/pick-activity" as Parameters<typeof router.push>[0])}
          />
        </ScrollView>
      </SafeAreaView>

      <Modal visible={secretOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSecretOpen(false)}>
        <SecretMessage
          guide={guide}
          childName={profiles[0]?.name ?? null}
          onDone={() => {
            setSecretOpen(false);
            setSecretPendingState(false);
            void setSecretMessagePending(false);
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FK.moss },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: FK.moss },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  blob: {
    position: "absolute",
    top: -160,
    right: -140,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "#DDE8CC",
  },
});
