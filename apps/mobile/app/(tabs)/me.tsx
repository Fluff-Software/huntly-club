import React, { useCallback, useMemo, useState } from "react";
import { Image as RNImage, Modal, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { FKLoading, FKScreen } from "@/components/fieldkit";
import { ParentPinModal } from "@/components/ParentPinModal";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUser } from "@/contexts/UserContext";
import { useClubhouseStats } from "@/hooks/useClubhouseStats";
import { useExploreRegionSupport } from "@/hooks/useExploreRegionSupport";
import { useTeamGuide } from "@/hooks/useTeamGuide";
import { raceHeadline, useTeamRace } from "@/hooks/useTeamRace";
import { getLocationPermissionStatus } from "@/services/locationService";
import { markParentGatePassed } from "@/services/parentGateSession";
import { supabase } from "@/services/supabase";
import { familyHeading } from "@/utils/familyNames";

const BINDER = require("@/assets/images/backpack-card-binder.png");
const BADGES = require("@/assets/images/backpack-badges-v2.png");
const JOURNAL = require("@/assets/images/journal-bg.png");
const PRINTABLES = require("@/assets/images/backpack-resources.png");

type GrownUpLink = { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; href: string };

const GROWN_UP_LINKS: GrownUpLink[] = [
  { icon: "alarm-outline", title: "Adventure time & reminders", sub: "Your slot, nudges and quiet hours", href: "/(tabs)/reminders" },
  { icon: "people-outline", title: "Explorers & account", sub: "Add explorers, team, sign out", href: "/(tabs)/profile" },
  { icon: "settings-outline", title: "Settings", sub: "Emails, location, privacy", href: "/(tabs)/settings" },
  { icon: "book-outline", title: "Grown-up guides", sub: "Ideas and resources for you", href: "/(tabs)/parents" },
];

type Tile = { key: string; title: string; sub: string; art: ImageSourcePropType; colour: string; href: string };

/** The explorers' own corner: everyone in the family, their collection, badges, journal and team. */
export default function MeScreen() {
  const { profiles } = usePlayer();
  const { team, teamId } = useUser();
  const { guide } = useTeamGuide();
  const ids = useMemo(() => profiles.map((p) => p.id), [profiles]);
  const { stats, refetch } = useClubhouseStats(ids);
  const { race, load: loadRace } = useTeamRace(team?.name, teamId, ids);
  const [cards, setCards] = useState(0);
  const [locationPermission, setLocationPermission] = useState<"loading" | "granted" | "denied" | "undetermined">("loading");
  const { isSupported: exploreSupported } = useExploreRegionSupport(locationPermission);
  const [gate, setGate] = useState(false);
  const [grownUpsOpen, setGrownUpsOpen] = useState(false);
  const names = profiles.map((p) => p.name);

  const load = useCallback(async () => {
    if (ids.length === 0) return;
    void refetch();
    void loadRace();
    void getLocationPermissionStatus().then(setLocationPermission);
    const { count } = await supabase.from("explore_stop_claims").select("id", { count: "exact", head: true }).in("profile_id", ids);
    setCards(count ?? 0);
  }, [ids, refetch, loadRace]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      void load();
    }, [load])
  );

  const go = (href: string) => router.push(href as Parameters<typeof router.push>[0]);

  if (!guide) return <FKLoading />;

  // Binder shows wherever Explore runs, or once a family already has cards.
  const showBinder = exploreSupported || cards > 0;
  const tiles: Tile[] = [
    ...(showBinder
      ? [{ key: "binder", title: "Card binder", sub: cards === 1 ? "1 card" : `${cards} cards`, art: BINDER, colour: "#3F7A55", href: "/(tabs)/activity/explore-collection" }]
      : []),
    { key: "badges", title: "Badges", sub: "What you've earned", art: BADGES, colour: "#5FA34B", href: "/(tabs)/badges" },
    { key: "journal", title: "Journal", sub: "Your adventures", art: JOURNAL, colour: "#5B7FA6", href: "/(tabs)/journal-book" },
    { key: "printables", title: "Printables", sub: "Sheets and extras", art: PRINTABLES, colour: "#3A5248", href: "/(tabs)/resources" },
  ];

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: guide.colour }]}>
            <Image source={guide.badge} style={{ width: 70, height: 70 }} contentFit="contain" />
          </View>
          <Pressable onPress={() => setGate(true)} style={styles.grownUps} accessibilityRole="button" testID="me-grownups">
            <Ionicons name="lock-closed-outline" size={18} color={FK.ink} />
            <Text style={styles.grownUpsText}>Grown-ups</Text>
          </Pressable>
        </View>
        <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
          {familyHeading(names)}
        </Text>
        <Text style={styles.sub}>
          {profiles.length > 1 ? guide.teamName : guide.teamSingular} · {guide.guideName}'s team
        </Text>

        {profiles.length > 1 ? (
          <View style={[styles.explorers, profiles.length > 4 && { gap: 6, justifyContent: "space-between" }]}>
            {profiles.map((p) => (
              <View key={p.id} style={[styles.explorer, profiles.length > 4 && { width: 52 }]}>
                <View
                  style={[
                    styles.explorerDot,
                    { backgroundColor: p.colour || guide.colour },
                    profiles.length > 4 && { width: 44, height: 44, borderRadius: 22 },
                  ]}
                >
                  <Text style={styles.explorerInitial}>{(p.name?.trim()[0] ?? "?").toUpperCase()}</Text>
                </View>
                <Text style={styles.explorerName} numberOfLines={1}>
                  {p.name}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.stats}>
          <Stat value={stats.missionsTotal} label={stats.missionsTotal === 1 ? "Mission" : "Missions"} />
          <Stat value={cards} label={cards === 1 ? "Card" : "Cards"} />
          <Stat value={stats.streakWeeks} label="Week streak" />
        </View>

        <View style={styles.grid}>
          {tiles.map((t, i) => (
            <Pressable
              key={t.key}
              onPress={() => go(t.href)}
              // An odd tile out spans the row so the grid never leaves a gap.
              style={[styles.tile, { backgroundColor: t.colour }, tiles.length % 2 === 1 && i === tiles.length - 1 && styles.tileWide]}
              accessibilityRole="button"
              accessibilityLabel={`${t.title}. ${t.sub}`}
              testID={`me-${t.key}`}
            >
              <RNImage source={t.art} style={styles.tileArt} resizeMode="contain" />
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>{t.title}</Text>
                <Text style={styles.tileSub}>{t.sub}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {race.rows.length ? (
          <Pressable onPress={() => go("/(tabs)/social")} style={styles.raceRow} accessibilityRole="button" testID="me-race">
            <Ionicons name="trophy" size={22} color={FK.sunbeam} />
            <View style={{ flex: 1 }}>
              <Text style={styles.raceEyebrow}>TEAM RACE · {race.monthName.toUpperCase()}</Text>
              <Text style={styles.raceText}>{raceHeadline(race)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={FK.mutedOnDark} />
          </Pressable>
        ) : null}
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
    width: 96,
    height: 96,
    borderRadius: 48,
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
  name: { fontFamily: FONT.display, fontSize: 38, lineHeight: 42, color: FK.ink, letterSpacing: -1, marginTop: 12 },
  sub: { fontFamily: FONT.displayBold, fontSize: 17, color: FK.muted, marginTop: 2 },
  // Up to six explorers always fit on one row, so nobody is hidden off-screen.
  explorers: { flexDirection: "row", gap: 14, paddingTop: 16 },
  explorer: { alignItems: "center", width: 64 },
  explorerDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: FK.white,
  },
  explorerInitial: { fontFamily: FONT.display, fontSize: 20, color: FK.white },
  explorerName: { fontFamily: FONT.displayBold, fontSize: 13, color: FK.ink, marginTop: 4, maxWidth: "100%" },
  stats: { flexDirection: "row", gap: 10, marginTop: 18 },
  stat: { flex: 1, backgroundColor: FK.paper, borderRadius: RADIUS.md, padding: 14 },
  statValue: { fontFamily: FONT.display, fontSize: 30, color: FK.ink },
  statLabel: { fontFamily: FONT.displayBold, fontSize: 14, color: FK.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12, marginTop: 12 },
  tile: { width: "48.5%", aspectRatio: 1, borderRadius: RADIUS.lg, overflow: "hidden", justifyContent: "flex-end" },
  tileWide: { width: "100%", aspectRatio: 2.3 },
  tileArt: { position: "absolute", top: 10, right: -6, width: "78%", height: "62%" },
  tileText: { padding: 14 },
  tileTitle: { fontFamily: FONT.display, fontSize: 19, color: FK.white },
  tileSub: { fontFamily: FONT.displayBold, fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 1 },
  raceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: FK.ink,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginTop: 14,
  },
  raceEyebrow: { ...TYPE.eyebrow, color: FK.mutedOnDark },
  raceText: { fontFamily: FONT.display, fontSize: 17, color: FK.white, marginTop: 2 },
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
