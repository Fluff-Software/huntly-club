import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { FKButton } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { guideForTeamName } from "@/constants/guides";
import { getActivityById, getActivityImageSource } from "@/services/packService";
import { shortDuration } from "@/services/firstMissionService";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUser } from "@/contexts/UserContext";
import type { Activity } from "@/types/activity";
import { hasOtherApprovedMissionPhotos } from "@/services/activityProgressService";

const CAPTAIN_ASSETS = {
  bella: require("@/assets/images/bella-close-smiling.png"),
  felix: require("@/assets/images/felix-close-smiling.png"),
  oli: require("@/assets/images/oli-close-smiling.png"),
} as const;
type CaptainKey = keyof typeof CAPTAIN_ASSETS;

function itemsList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

/** Grown-up note: explicit safety notes, else checklist lines that mention a grown-up. */
function grownUpNote(activity: Activity): string | null {
  const safety = (activity as { safety_notes?: string | null }).safety_notes;
  if (safety?.trim()) return safety.trim();
  const checklist = ((activity as { prep_checklist?: { title?: string; description?: string }[] }).prep_checklist ?? []).filter(
    (c) => /grown-?up|permission|adult/i.test(`${c.title} ${c.description}`)
  );
  if (checklist.length) return checklist.map((c) => c.description || c.title).join(" ");
  return null;
}

export default function IntroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { profiles } = usePlayer();
  const { team } = useUser();
  const guide = guideForTeamName(team?.name);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInspirationGallery, setShowInspirationGallery] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);

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
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    const activityId = activity?.id ?? null;
    if (!activityId || profiles.length === 0) {
      setShowInspirationGallery(false);
      return;
    }
    let cancelled = false;
    hasOtherApprovedMissionPhotos(activityId, profiles.map((p) => p.id))
      .then((hasAny) => !cancelled && setShowInspirationGallery(Boolean(hasAny)))
      .catch(() => !cancelled && setShowInspirationGallery(false));
    return () => {
      cancelled = true;
    };
  }, [activity?.id, profiles]);

  const handleAccept = () => {
    if (!activity?.id) return;
    router.push({ pathname: "/(tabs)/activity/mission/prep", params: { id: String(activity.id) } });
  };

  if (loading || error || !activity) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <StatusBar style="dark" />
        {loading ? <ActivityIndicator color={FK.forest} size="large" /> : <Text style={TYPE.body}>{error}</Text>}
      </SafeAreaView>
    );
  }

  const captainKey = (activity.intro_captain ?? null) as CaptainKey | null;
  const captainName = captainKey ? captainKey[0].toUpperCase() + captainKey.slice(1) : guide.guideName;
  const captainImage = captainKey && CAPTAIN_ASSETS[captainKey] ? CAPTAIN_ASSETS[captainKey] : guide.portrait;
  const items = itemsList((activity as { optional_items?: unknown }).optional_items);
  const steps = activity.steps?.length ?? 0;
  const missionType = (activity as { mission_type?: string | null }).mission_type;
  const note = grownUpNote(activity);
  const facts = [
    { icon: "time-outline" as const, label: shortDuration(activity.estimated_duration) ?? "Any time" },
    {
      icon: missionType === "outdoor" ? ("leaf-outline" as const) : ("home-outline" as const),
      label: missionType === "outdoor" ? "Outdoors" : missionType === "indoor" ? "Indoors" : "Anywhere",
    },
    { icon: "bag-handle-outline" as const, label: items.length ? `${items.length} things` : "No kit" },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.hero}>
          <Image source={getActivityImageSource(activity.image ?? null)} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[styles.heroTop, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8} accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={24} color={FK.white} />
            </Pressable>
            {activity.intro_urgent_message?.trim() ? (
              <View style={styles.urgent}>
                <Text style={styles.urgentText} numberOfLines={2}>
                  {activity.intro_urgent_message.trim()}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.sheet}>
          <Animated.View entering={FadeInDown.duration(350)}>
            <Pressable onPress={() => setBriefingOpen((o) => !o)} style={styles.briefing} accessibilityRole="button">
              <Image source={captainImage} style={styles.briefingAvatar} contentFit="cover" contentPosition="top" />
              <View style={{ flex: 1 }}>
                <Text style={styles.briefingTitle}>{captainName}'s briefing</Text>
                <Text style={styles.briefingSub}>{briefingOpen ? "Tap to close" : "Read it together"}</Text>
              </View>
              <View style={styles.briefingPlay}>
                <Ionicons name={briefingOpen ? "chevron-up" : "chatbubble-ellipses"} size={22} color={FK.white} />
              </View>
            </Pressable>
            {briefingOpen && activity.intro_dialogue ? (
              <Text style={styles.dialogue}>"{activity.intro_dialogue}"</Text>
            ) : null}
          </Animated.View>

          <Text style={styles.title}>{activity.title}</Text>
          {activity.description ? <Text style={styles.desc}>{activity.description}</Text> : null}

          <View style={styles.facts}>
            {facts.map((f) => (
              <View key={f.label} style={styles.fact}>
                <Ionicons name={f.icon} size={24} color={FK.forest} />
                <Text style={styles.factText}>{f.label}</Text>
              </View>
            ))}
          </View>

          {items.length ? (
            <Text style={styles.items}>
              <Text style={{ fontFamily: FONT.bodyBold, color: FK.ink }}>You'll need: </Text>
              {items.join(", ")}
            </Text>
          ) : null}

          {note ? (
            <View style={styles.grownUps}>
              <Ionicons name="shield-outline" size={22} color={FK.skyInk} />
              <Text style={styles.grownUpsText}>
                <Text style={{ fontFamily: FONT.bodyBold }}>For grown-ups: </Text>
                {note}
              </Text>
            </View>
          ) : null}

          {showInspirationGallery ? (
            <FKButton
              label="See what other explorers made"
              variant="link"
              onPress={() => router.push({ pathname: "/(tabs)/activity/mission/gallery", params: { activityId: String(activity.id) } })}
            />
          ) : null}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <FKButton label="Accept the mission" variant="ink" onPress={handleAccept} testID="intro-accept" />
        <Text style={styles.footnote}>
          {[activity.xp ? `+${activity.xp} for ${guide.teamName}` : null, steps ? `${steps} steps` : null]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FK.moss },
  center: { alignItems: "center", justifyContent: "center" },
  hero: { height: 330, backgroundColor: FK.forest },
  heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 20, gap: 12 },
  back: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(16,37,27,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  urgent: { flexShrink: 1, backgroundColor: FK.ember, borderRadius: RADIUS.pill, paddingHorizontal: 16, paddingVertical: 10 },
  urgentText: { fontFamily: FONT.display, fontSize: 15, color: FK.ink },
  sheet: {
    marginTop: -30,
    backgroundColor: FK.moss,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  briefing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: FK.paper,
    borderRadius: RADIUS.pill,
    padding: 8,
    paddingRight: 8,
  },
  briefingAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: FK.forest },
  briefingTitle: { fontFamily: FONT.display, fontSize: 17, color: FK.ink },
  briefingSub: { fontFamily: FONT.displayBold, fontSize: 14, color: FK.muted },
  briefingPlay: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: FK.ember,
    alignItems: "center",
    justifyContent: "center",
  },
  dialogue: { ...TYPE.body, marginTop: 12, paddingHorizontal: 6, color: FK.ink, fontStyle: "italic" },
  title: { fontFamily: FONT.display, fontSize: 36, lineHeight: 38, color: FK.ink, letterSpacing: -0.8, marginTop: 20 },
  desc: { ...TYPE.body, color: "#33433A", marginTop: 8 },
  facts: { flexDirection: "row", gap: 10, marginTop: 18 },
  fact: { flex: 1, backgroundColor: FK.paper, borderRadius: RADIUS.md, padding: 14, gap: 8 },
  factText: { fontFamily: FONT.display, fontSize: 16, color: FK.ink },
  items: { ...TYPE.bodySmall, marginTop: 14 },
  grownUps: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: FK.sky,
    borderRadius: RADIUS.md,
    padding: 16,
    marginTop: 14,
    alignItems: "flex-start",
  },
  grownUpsText: { flex: 1, fontFamily: FONT.body, fontSize: 15, lineHeight: 21, color: FK.skyInk },
  footer: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: FK.moss },
  footnote: { fontFamily: FONT.displayBold, fontSize: 14, color: FK.muted, textAlign: "center", marginTop: 8 },
});
