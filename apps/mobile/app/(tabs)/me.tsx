import React, { useCallback, useState } from "react";
import { ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { TeamRaceStrip } from "@/components/clubhouse/ClubhouseCards";
import { FKScreen } from "@/components/fieldkit";
import { ParentPinModal } from "@/components/ParentPinModal";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { guideForTeamName, GUIDES } from "@/constants/guides";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUser } from "@/contexts/UserContext";
import { useClubhouseStats } from "@/hooks/useClubhouseStats";
import { markParentGatePassed } from "@/services/parentGateSession";
import { supabase } from "@/services/supabase";
import { getAllTeamsWithXp, getTeamAchievementTotals } from "@/services/teamActivityService";

const BINDER = require("@/assets/images/backpack-card-binder.png");
const BADGES = require("@/assets/images/backpack-badges-v2.png");
const JOURNAL = require("@/assets/images/journal-bg.png");

type GrownUpLink = { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; href: string };

const GROWN_UP_LINKS: GrownUpLink[] = [
  { icon: "alarm-outline", title: "Adventure time & reminders", sub: "Your slot, nudges and quiet hours", href: "/(tabs)/reminders" },
  { icon: "people-outline", title: "Explorers & account", sub: "Add explorers, team, sign out", href: "/(tabs)/profile" },
  { icon: "settings-outline", title: "Settings", sub: "Emails, location, privacy", href: "/(tabs)/settings" },
  { icon: "book-outline", title: "Grown-up guides", sub: "Ideas and resources for you", href: "/(tabs)/parents" },
];

/** The explorer's own corner: their collection, badges, journal and team. */
export default function MeScreen() {
  const { profiles } = usePlayer();
  const { team } = useUser();
  const guide = guideForTeamName(team?.name);
  const ids = profiles.map((p) => p.id);
  const { stats, refetch } = useClubhouseStats(ids);
  const [cards, setCards] = useState(0);
  const [race, setRace] = useState<{ name: string; total: number; colour: string }[]>([]);
  const [gate, setGate] = useState(false);
  const [grownUpsOpen, setGrownUpsOpen] = useState(false);
  const names = profiles.map((p) => p.name);
  const name = names.length <= 1 ? names[0] ?? "Explorer" : `${names[0]} & co`;

  const load = useCallback(async () => {
    void refetch();
    if (ids.length) {
      const { count } = await supabase.from("explore_stop_claims").select("id", { count: "exact", head: true }).in("profile_id", ids);
      setCards(count ?? 0);
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(","), refetch]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      void load();
    }, [load])
  );

  const go = (href: string) => router.push(href as Parameters<typeof router.push>[0]);

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: guide.colour }]}>
            <Image source={guide.badge} style={{ width: 78, height: 78 }} contentFit="contain" />
          </View>
          <Pressable onPress={() => setGate(true)} style={styles.grownUps} accessibilityRole="button" testID="me-grownups">
            <Ionicons name="lock-closed-outline" size={18} color={FK.ink} />
            <Text style={styles.grownUpsText}>Grown-ups</Text>
          </Pressable>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.sub}>
          {guide.teamSingular} · {guide.guideName}'s team
        </Text>

        <View style={styles.stats}>
          <Stat value={stats.missionsTotal} label="Missions" />
          <Stat value={cards} label="Cards" />
          <Stat value={stats.streakWeeks} label={stats.streakWeeks === 1 ? "Week streak" : "Week streak"} />
        </View>

        <View style={styles.tiles}>
          <Pressable onPress={() => go("/(tabs)/activity/explore-collection")} style={[styles.tileBig, { backgroundColor: "#3F7A55" }]}>
            <ImageBackground source={BINDER} style={StyleSheet.absoluteFill} imageStyle={{ borderRadius: RADIUS.lg }} resizeMode="cover" />
            <View style={styles.tileLabel}>
              <Text style={styles.tileLabelText}>Binder</Text>
            </View>
          </Pressable>
          <View style={{ flex: 1, gap: 12 }}>
            <Pressable onPress={() => go("/(tabs)/badges")} style={[styles.tileSmall, { backgroundColor: "#5FA34B" }]}>
              <ImageBackground source={BADGES} style={StyleSheet.absoluteFill} imageStyle={{ borderRadius: RADIUS.lg }} resizeMode="cover" />
              <View style={styles.tileLabel}>
                <Text style={styles.tileLabelText}>Badges</Text>
              </View>
            </Pressable>
            <Pressable onPress={() => go("/(tabs)/journal")} style={[styles.tileSmall, { backgroundColor: "#5B7FA6" }]}>
              <ImageBackground source={JOURNAL} style={StyleSheet.absoluteFill} imageStyle={{ borderRadius: RADIUS.lg }} resizeMode="cover" />
              <View style={styles.tileLabel}>
                <Text style={styles.tileLabelText}>Journal</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {race.length ? <TeamRaceStrip rows={race} myTeam={team?.name ?? null} onPress={() => go("/(tabs)/social")} /> : null}
      </ScrollView>

      <ParentPinModal
        visible={gate}
        onSuccess={() => {
          markParentGatePassed();
          setGate(false);
          setGrownUpsOpen(true);
        }}
        onCancel={() => setGate(false)}
      />
      <Modal visible={grownUpsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setGrownUpsOpen(false)}>
        <FKScreen>
          <View style={styles.sheetTop}>
            <Text style={TYPE.title}>Grown-ups</Text>
            <Pressable onPress={() => setGrownUpsOpen(false)} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close-circle" size={32} color={FK.muted} />
            </Pressable>
          </View>
          {GROWN_UP_LINKS.map((l) => (
            <Pressable
              key={l.href}
              style={styles.link}
              onPress={() => {
                setGrownUpsOpen(false);
                setTimeout(() => go(l.href), 250);
              }}
            >
              <View style={styles.linkIcon}>
                <Ionicons name={l.icon} size={22} color={FK.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>{l.title}</Text>
                <Text style={styles.linkSub}>{l.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={FK.muted} />
            </Pressable>
          ))}
        </FKScreen>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FK.moss },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 6,
    borderColor: FK.white,
    alignItems: "center",
    justifyContent: "center",
  },
  grownUps: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: "#CBD3C2",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  grownUpsText: { fontFamily: FONT.display, fontSize: 15, color: FK.ink },
  name: { fontFamily: FONT.display, fontSize: 40, color: FK.ink, letterSpacing: -1, marginTop: 12 },
  sub: { fontFamily: FONT.displayBold, fontSize: 17, color: FK.muted },
  stats: { flexDirection: "row", gap: 10, marginTop: 18 },
  stat: { flex: 1, backgroundColor: FK.paper, borderRadius: RADIUS.md, padding: 14 },
  statValue: { fontFamily: FONT.display, fontSize: 30, color: FK.ink },
  statLabel: { fontFamily: FONT.displayBold, fontSize: 14, color: FK.muted },
  tiles: { flexDirection: "row", gap: 12, marginTop: 12, marginBottom: 14 },
  tileBig: { flex: 1, height: 232, borderRadius: RADIUS.lg, overflow: "hidden", justifyContent: "flex-end" },
  tileSmall: { flex: 1, borderRadius: RADIUS.lg, overflow: "hidden", justifyContent: "flex-end" },
  tileLabel: { alignSelf: "flex-start", backgroundColor: FK.ink, borderRadius: RADIUS.pill, paddingHorizontal: 16, paddingVertical: 8, margin: 12 },
  tileLabelText: { fontFamily: FONT.display, fontSize: 17, color: FK.white },
  sheetTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 16 },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: FK.paper,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 8,
  },
  linkIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: FK.sunbeam, alignItems: "center", justifyContent: "center" },
  linkTitle: { fontFamily: FONT.display, fontSize: 16, color: FK.ink },
  linkSub: { fontFamily: FONT.body, fontSize: 14, color: FK.muted, marginTop: 2 },
});
