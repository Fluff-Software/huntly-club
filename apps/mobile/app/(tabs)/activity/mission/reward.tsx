import React, { useMemo, useEffect, useState, useRef } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Text,
  StyleSheet,
  Dimensions,
  InteractionManager,
  Modal,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useRouter, useNavigation, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { FKButton, FKScreen } from "@/components/fieldkit";
import { SlotPicker } from "@/components/onboarding/SlotPicker";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { guideForTeamName } from "@/constants/guides";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUser } from "@/contexts/UserContext";
import { getActivityById } from "@/services/packService";
import type { MissionCardData } from "@/constants/missionCards";
import { hasOtherApprovedMissionPhotos } from "@/services/activityProgressService";
import {
  type AdventurePlan,
  type AdventurePlanDraft,
  DEFAULT_WEEKLY_TIME,
  getAdventurePlan,
  updateAdventurePlanPrefs,
} from "@/services/adventurePlanService";
import { requestReminderPermission, syncAdventureReminders } from "@/services/adventureReminderService";
import { buildRewardCardSnapshot, missionCardFromSnapshot } from "@/utils/missionRewardParams";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const CHEERS = ["Brilliant work", "What an adventure", "Nailed it", "Legendary stuff", "Best one yet"];

type RewardAchievement = { profile_name: string; message: string; xp: number };
type UnlockedBadgePayload = {
  badge_id: number;
  badge_name: string;
  profile_id: number;
};

type RewardRouteParams = {
  activityId?: string;
  cardSnapshot?: string;
  achievements?: string;
  unlockedBadges?: string;
};

function parseAchievements(raw?: string): RewardAchievement[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RewardAchievement[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseUnlockedBadges(raw?: string): UnlockedBadgePayload[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as UnlockedBadgePayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const CONFETTI_PARTICLE_COUNT = 100;

export default function RewardScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<RewardRouteParams>();
  const { profiles } = usePlayer();
  const { team } = useUser();
  const { user } = useAuth();
  const guide = guideForTeamName(team?.name);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      e.preventDefault();
    });
    return unsubscribe;
  }, [navigation]);

  const initialCard = useMemo(() => missionCardFromSnapshot(params.cardSnapshot), [params.cardSnapshot]);
  const cheer = useMemo(() => CHEERS[Math.floor(Math.random() * CHEERS.length)], []);
  const achievements = useMemo(() => parseAchievements(params.achievements), [params.achievements]);
  const unlockedBadges = useMemo(() => parseUnlockedBadges(params.unlockedBadges), [params.unlockedBadges]);

  const [activityCard, setActivityCard] = useState<MissionCardData | null>(initialCard.card);
  const [activityXp, setActivityXp] = useState<number | null>(initialCard.xp);
  const [goingHome, setGoingHome] = useState(false);
  const [showOthersButton, setShowOthersButton] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [plan, setPlan] = useState<AdventurePlan | null | undefined>(undefined);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [weeklyDraft, setWeeklyDraft] = useState<AdventurePlanDraft>({
    choice: "skipped",
    firstAt: null,
    weeklyDays: [6],
    weeklyTime: DEFAULT_WEEKLY_TIME,
  });
  const [weeklySaved, setWeeklySaved] = useState<string | null>(null);

  useEffect(() => {
    if (activityCard) return;
    const activityId = params.activityId ? Number(params.activityId) : null;
    if (!activityId) return;
    let cancelled = false;
    getActivityById(activityId)
      .then((activity) => {
        if (cancelled || !activity) return;
        const parsed = missionCardFromSnapshot(buildRewardCardSnapshot(activity));
        setActivityCard(parsed.card);
        setActivityXp(parsed.xp);
      })
      .catch(() => {
        if (!cancelled) {
          setActivityCard(null);
          setActivityXp(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.activityId, activityCard]);

  useEffect(() => {
    const activityId = params.activityId ? Number(params.activityId) : null;
    if (!activityId || profiles.length === 0) {
      setShowOthersButton(false);
      return;
    }
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      hasOtherApprovedMissionPhotos(activityId, profiles.map((p) => p.id))
        .then((hasAny) => !cancelled && setShowOthersButton(Boolean(hasAny)))
        .catch(() => !cancelled && setShowOthersButton(false));
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [params.activityId, profiles]);

  // A weekly slot is offered after a mission if the family hasn't got one yet.
  useEffect(() => {
    if (!user?.id) return;
    void getAdventurePlan(user.id).then((p) => {
      setPlan(p);
      if (p?.weeklyDays.length) setWeeklyDraft((d) => ({ ...d, weeklyDays: p.weeklyDays, weeklyTime: p.weeklyTime }));
    });
  }, [user?.id]);

  const confettiRef = useRef<ConfettiCannon>(null);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setShowConfetti(true));
    return () => task.cancel();
  }, []);
  useEffect(() => {
    if (!showConfetti) return;
    const t = setTimeout(() => confettiRef.current?.start?.(), 16);
    return () => clearTimeout(t);
  }, [showConfetti]);

  const handleGoHome = () => {
    if (goingHome) return;
    setGoingHome(true);
    InteractionManager.runAfterInteractions(() => {
      router.replace("/(tabs)");
    });
  };

  const handleSeeHowOthersDid = () => {
    const activityId = params.activityId ? Number(params.activityId) : null;
    if (!activityId) return;
    router.push({ pathname: "/(tabs)/activity/mission/gallery", params: { activityId: String(activityId) } });
  };

  const handleViewUnlockedBadge = () => {
    const firstUnlocked = unlockedBadges[0];
    if (!firstUnlocked) return;
    router.replace({
      pathname: "/(tabs)/badges",
      params: { autoOpenBadgeId: String(firstUnlocked.badge_id), profileId: String(firstUnlocked.profile_id) },
    });
  };

  const saveWeekly = async () => {
    if (!user?.id) return;
    const granted = await requestReminderPermission();
    const next = await updateAdventurePlanPrefs(user.id, {
      weeklyDays: weeklyDraft.weeklyDays,
      weeklyTime: weeklyDraft.weeklyTime ?? DEFAULT_WEEKLY_TIME,
    }).catch(() => null);
    if (next) {
      setPlan(next);
      if (granted) await syncAdventureReminders(next, guide.guideName);
    }
    setWeeklyOpen(false);
    setWeeklySaved(granted ? "Weekly adventure booked. See you then!" : "Saved. Turn on notifications to get the nudge.");
  };

  const totalXp = achievements.length > 0 ? achievements.reduce((sum, a) => sum + (a.xp ?? 0), 0) : activityXp ?? 0;
  const names = achievements.length ? [...new Set(achievements.map((a) => a.profile_name))] : profiles.slice(0, 1).map((p) => p.name);
  const who = names.length === 1 ? names[0] : names.length > 1 ? "team" : "explorer";
  const offerWeekly = plan !== undefined && !(plan?.weeklyDays.length ?? 0) && !weeklySaved;
  const badge = unlockedBadges[0];

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.Text entering={ZoomIn.duration(450)} style={styles.title}>
          Mission complete!
        </Animated.Text>
        {activityCard ? <Text style={styles.missionName}>{activityCard.title}</Text> : null}

        <Animated.View entering={ZoomIn.duration(500).delay(150)} style={styles.archWrap}>
          <View style={styles.arch}>
            <Image source={guide.waving} style={styles.archImg} contentFit="contain" contentPosition="bottom" />
          </View>
          <View style={styles.speech}>
            <Text style={styles.speechText}>
              {cheer}, {who}!
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(350).delay(300)} style={styles.statRow}>
          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <Text style={styles.statBig}>+{totalXp}</Text>
              <View style={[styles.statBadge, { backgroundColor: guide.colour }]}>
                <Image source={guide.badge} style={{ width: 30, height: 30 }} contentFit="contain" />
              </View>
            </View>
            <Text style={styles.statLabel}>Points for {guide.teamName}</Text>
          </View>
          {badge ? (
            <Pressable style={styles.statCard} onPress={handleViewUnlockedBadge} accessibilityRole="button">
              <View style={styles.statTop}>
                <View style={[styles.statBadge, { backgroundColor: FK.ink }]}>
                  <Ionicons name="star" size={20} color={FK.sunbeam} />
                </View>
                <Text style={styles.statNew}>New badge</Text>
              </View>
              <Text style={styles.statLabel} numberOfLines={2}>
                {badge.badge_name}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.statCard}>
              <View style={styles.statTop}>
                <View style={[styles.statBadge, { backgroundColor: FK.ink }]}>
                  <Ionicons name="flag" size={20} color={FK.sunbeam} />
                </View>
                <Text style={styles.statNew}>Story</Text>
              </View>
              <Text style={styles.statLabel}>One step closer to the chapter's end</Text>
            </View>
          )}
        </Animated.View>

        {offerWeekly ? (
          <Animated.View entering={FadeInDown.duration(350).delay(420)} style={styles.inkCard}>
            <View style={styles.inkIcon}>
              <Ionicons name="calendar" size={26} color={FK.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inkTitle}>Make it a weekly adventure?</Text>
              <Text style={styles.inkText}>Pick a day and we'll nudge you when it comes round.</Text>
              <FKButton label="Pick a day" onPress={() => setWeeklyOpen(true)} style={styles.inkButton} icon={null} testID="reward-weekly" />
            </View>
          </Animated.View>
        ) : weeklySaved ? (
          <View style={[styles.inkCard, { alignItems: "center" }]}>
            <Ionicons name="checkmark-circle" size={28} color={FK.sunbeam} />
            <Text style={[styles.inkTitle, { flex: 1 }]}>{weeklySaved}</Text>
          </View>
        ) : null}

        <Text style={styles.note}>Photos you shared appear in the Clubhouse once a grown-up at Huntly has checked them.</Text>
      </ScrollView>

      <View style={styles.footer}>
        <FKButton label="Back to the Clubhouse" variant="ink" onPress={handleGoHome} loading={goingHome} testID="reward-home" />
        {showOthersButton ? <FKButton label="See how others did" variant="link" onPress={handleSeeHowOthersDid} /> : null}
      </View>

      <Modal visible={weeklyOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setWeeklyOpen(false)}>
        <FKScreen footer={<FKButton label="Book it" onPress={saveWeekly} disabled={weeklyDraft.weeklyDays.length === 0} />}>
          <Text style={[TYPE.eyebrow, { marginTop: 8 }]}>FOR GROWN-UPS</Text>
          <Text style={[TYPE.title, { marginTop: 6, marginBottom: 8 }]}>Your weekly adventure</Text>
          <Text style={[TYPE.bodySmall, { marginBottom: 20, fontSize: 16 }]}>
            A regular slot turns a good afternoon into a habit. One nudge, never between 8pm and 7am.
          </Text>
          <SlotPicker value={weeklyDraft} onChange={setWeeklyDraft} showFirst={false} />
          <FKButton label="Not now" variant="link" onPress={() => setWeeklyOpen(false)} style={{ marginTop: 16 }} />
        </FKScreen>
      </Modal>

      {showConfetti ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]} pointerEvents="none">
          <ConfettiCannon
            ref={confettiRef}
            count={CONFETTI_PARTICLE_COUNT}
            origin={{ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 - 40 }}
            explosionSpeed={350}
            fallSpeed={3500}
            fadeOut
            autoStart={false}
            colors={[FK.ink, FK.forest, FK.ember, FK.white, FK.team.foxes, FK.team.otters]}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FK.sunbeam },
  scroll: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 16 },
  title: { fontFamily: FONT.display, fontSize: 46, lineHeight: 48, color: FK.ink, textAlign: "center", letterSpacing: -1.5 },
  missionName: { fontFamily: FONT.displayBold, fontSize: 17, color: "#5C4A12", textAlign: "center", marginTop: 6 },
  archWrap: { alignItems: "center", marginTop: 14 },
  arch: {
    width: 190,
    height: 210,
    borderTopLeftRadius: 95,
    borderTopRightRadius: 95,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 6,
    borderColor: FK.ink,
    backgroundColor: FK.forest,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  archImg: { width: "100%", height: "108%" },
  speech: {
    backgroundColor: FK.paper,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: -26,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  speechText: { fontFamily: FONT.display, fontSize: 20, color: FK.ink, textAlign: "center" },
  statRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  statCard: { flex: 1, backgroundColor: FK.paper, borderRadius: RADIUS.md, padding: 14, minHeight: 100 },
  statTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  statBig: { fontFamily: FONT.display, fontSize: 36, color: FK.ink, letterSpacing: -1 },
  statBadge: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  statNew: { fontFamily: FONT.display, fontSize: 20, color: FK.ink, flexShrink: 1 },
  statLabel: { fontFamily: FONT.displayBold, fontSize: 15, color: FK.muted },
  inkCard: { flexDirection: "row", gap: 14, backgroundColor: FK.ink, borderRadius: RADIUS.lg, padding: 18, marginTop: 14 },
  inkIcon: {
    width: 56,
    height: 70,
    borderRadius: 12,
    backgroundColor: FK.sunbeam,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-6deg" }],
  },
  inkTitle: { fontFamily: FONT.display, fontSize: 20, lineHeight: 24, color: FK.white },
  inkText: { fontFamily: FONT.body, fontSize: 15, color: FK.mutedOnDark, marginTop: 4 },
  inkButton: { alignSelf: "flex-start", minHeight: 48, marginTop: 12, paddingHorizontal: 22 },
  note: { ...TYPE.bodySmall, color: "#6B5A1E", textAlign: "center", marginTop: 16 },
  footer: { paddingHorizontal: 22, paddingBottom: 8, paddingTop: 4 },
});
