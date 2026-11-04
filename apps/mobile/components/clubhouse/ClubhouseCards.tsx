import React from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { FKButton, FKChip } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import type { Guide } from "@/constants/guides";
import { raceHeadline, type TeamRace } from "@/hooks/useTeamRace";

const DEFAULT_MISSION_IMAGE = require("@/assets/images/laser-fortress.jpg");

export function ClubhouseHeader({
  guide,
  name,
  streakWeeks,
  onPressProfile,
}: {
  guide: Guide;
  name: string;
  streakWeeks: number;
  onPressProfile: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onPressProfile} style={styles.headerLeft} accessibilityRole="button" accessibilityLabel="Your profile">
        <View style={[styles.avatar, { backgroundColor: guide.colour }]}>
          <Image source={guide.badge} style={styles.avatarImg} contentFit="contain" />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.headerName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {name}
          </Text>
          <Text style={[styles.headerTeam, { color: guide.colour }]}>{guide.teamName.toUpperCase()}</Text>
        </View>
      </Pressable>
      {streakWeeks > 0 ? (
        <View style={styles.streak} accessibilityLabel={`${streakWeeks} week streak`}>
          <Ionicons name="flame" size={18} color={FK.ember} />
          <Text style={styles.streakText}>
            {streakWeeks} {streakWeeks === 1 ? "week" : "weeks"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** "Psst!" — the guide talks to the child. */
export function GuideMessageCard({ guide, line, onPress }: { guide: Guide; line: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.guideCard}>
      <View style={[styles.guidePortrait, { backgroundColor: "#E7ECD8" }]}>
        <Image source={guide.portrait} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
      </View>
      <View style={styles.guideBody}>
        <Text style={styles.guideLine}>{line}</Text>
        <Text style={styles.guideName}>{guide.guideName}</Text>
      </View>
    </Pressable>
  );
}

export function SecretMessageCard({ guide, onOpen }: { guide: Guide; onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} style={styles.secretCard} accessibilityRole="button" testID="clubhouse-secret">
      <View style={styles.secretIcon}>
        <Ionicons name="mail-unread" size={26} color={FK.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.secretEyebrow}>TOP SECRET</Text>
        <Text style={styles.secretTitle}>{guide.guideName} left you a message</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={FK.sunbeam} />
    </Pressable>
  );
}

export type PlanBannerState =
  | { kind: "booked"; headline: string; sub?: string }
  | { kind: "missed"; headline: string }
  | { kind: "none" };

/** For grown-ups: the booked slot, a gentle reschedule, or an invitation to pick one. */
export function PlanBanner({ state, onPress }: { state: PlanBannerState; onPress: () => void }) {
  if (state.kind === "booked") {
    return (
      <Pressable onPress={onPress} style={styles.plan} accessibilityRole="button" testID="plan-banner">
        <Ionicons name="calendar" size={20} color={FK.forest} />
        <View style={{ flex: 1 }}>
          <Text style={styles.planTitle}>{state.headline}</Text>
          {state.sub ? <Text style={styles.planSub}>{state.sub}</Text> : null}
        </View>
        <Text style={styles.planLink}>Change</Text>
      </Pressable>
    );
  }
  if (state.kind === "missed") {
    return (
      <Pressable onPress={onPress} style={[styles.plan, { backgroundColor: "#FFF3D6" }]} accessibilityRole="button" testID="plan-banner">
        <Ionicons name="refresh-circle" size={22} color={FK.ink} />
        <View style={{ flex: 1 }}>
          <Text style={styles.planTitle}>{state.headline}</Text>
          <Text style={styles.planSub}>No problem: pick another time that works.</Text>
        </View>
        <Text style={styles.planLink}>Pick</Text>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} style={styles.plan} accessibilityRole="button" testID="plan-banner">
      <Ionicons name="alarm-outline" size={20} color={FK.forest} />
      <View style={{ flex: 1 }}>
        <Text style={styles.planTitle}>When's your next adventure?</Text>
        <Text style={styles.planSub}>Pick a time and we'll send one friendly nudge.</Text>
      </View>
      <Text style={styles.planLink}>Pick</Text>
    </Pressable>
  );
}

export function AdventureHeroCard({
  eyebrow,
  title,
  image,
  chips,
  points,
  onPress,
  completed,
}: {
  eyebrow: string;
  title: string;
  image: string | null;
  chips: string[];
  points: string | null;
  onPress: () => void;
  completed?: boolean;
}) {
  const source: ImageSourcePropType = image ? { uri: image } : DEFAULT_MISSION_IMAGE;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${eyebrow}`} testID="clubhouse-hero">
      <ImageBackground source={source} style={styles.hero} imageStyle={{ borderRadius: RADIUS.lg }} resizeMode="cover">
        <LinearGradient
          colors={["rgba(16,37,27,0.15)", "rgba(16,37,27,0.35)", "rgba(16,37,27,0.92)"]}
          locations={[0, 0.4, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.lg }]}
        />
        <View style={styles.heroEyebrow}>
          <Ionicons name={completed ? "checkmark-circle" : "time-outline"} size={16} color={FK.ink} />
          <Text style={styles.heroEyebrowText}>{eyebrow}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={styles.chipRow}>
          {chips.map((c) => (
            <FKChip key={c} label={c} dark />
          ))}
        </View>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.heroFooter}>
          <FKButton label={completed ? "Play again" : "Let's go"} onPress={onPress} style={styles.heroButton} testID="hero-lets-go" />
          {points ? <Text style={styles.heroPoints}>{points}</Text> : null}
        </View>
      </ImageBackground>
    </Pressable>
  );
}

/**
 * Explains the balance between the two halves of Huntly World:
 * Missions move the story on (new ones each week), Explore is the bonus you
 * can do any time you're out.
 */
export function YourWeekCard({
  missionsThisWeek,
  missionsGoal,
  cardsThisWeek,
  exploreAvailable,
  onMissions,
  onExplore,
}: {
  missionsThisWeek: number;
  missionsGoal: number;
  cardsThisWeek: number;
  exploreAvailable: boolean;
  onMissions: () => void;
  onExplore: () => void;
}) {
  const done = Math.min(missionsThisWeek, missionsGoal);
  return (
    <View style={styles.week}>
      <View style={styles.weekHeader}>
        <Text style={styles.weekEyebrow}>THIS WEEK IN HUNTLY WORLD</Text>
      </View>
      <View style={styles.weekRow}>
        <Pressable onPress={onMissions} style={styles.weekHalf} accessibilityRole="button" testID="week-missions">
          <View style={styles.weekIconRow}>
            <Ionicons name="flag" size={18} color={FK.sunbeam} />
            <Text style={styles.weekLabel}>Missions</Text>
          </View>
          <View style={styles.boxes}>
            {Array.from({ length: missionsGoal }).map((_, i) => (
              <View key={i} style={[styles.box, i < done && styles.boxDone]}>
                {i < done ? <Ionicons name="checkmark" size={18} color={FK.ink} /> : null}
              </View>
            ))}
          </View>
          <Text style={styles.weekText}>The story. New ones drop every week.</Text>
        </Pressable>
        <View style={styles.weekDivider} />
        <Pressable onPress={onExplore} style={styles.weekHalf} accessibilityRole="button" testID="week-explore">
          <View style={styles.weekIconRow}>
            <Ionicons name="compass" size={18} color={FK.sunbeam} />
            <Text style={styles.weekLabel}>Explore</Text>
          </View>
          <Text style={styles.weekBig}>
            {cardsThisWeek}
            <Text style={styles.weekBigUnit}> {cardsThisWeek === 1 ? "card" : "cards"}</Text>
          </Text>
          <Text style={styles.weekText}>
            {exploreAvailable ? "Bonus finds on any walk, any day." : "Bonus cards to find on walks with a grown-up."}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The monthly team race, told from the family's side. Central on the Clubhouse. */
export function TeamRaceCard({ race, onPress }: { race: TeamRace; onPress: () => void }) {
  const max = Math.max(1, ...race.rows.map((r) => r.total));
  const mine = race.mine;
  const sub = race.allZero
    ? "A fresh race every month. Your next mission puts your team on the board."
    : mine && race.myPlace === 1
      ? `Keep going: every mission adds points for the ${mine.guide.teamName}.`
      : mine
        ? `Every mission you finish closes the gap.`
        : null;
  return (
    <Pressable onPress={onPress} style={styles.raceCard} accessibilityRole="button" testID="team-race">
      <View style={styles.raceHeader}>
        <Text style={[TYPE.eyebrow, { color: FK.mutedOnDark }]}>TEAM RACE · {race.monthName.toUpperCase()}</Text>
        <View style={styles.daysChip}>
          <Ionicons name="time-outline" size={14} color={FK.ink} />
          <Text style={styles.daysText}>
            {race.daysLeft === 0 ? "Last day" : `${race.daysLeft} ${race.daysLeft === 1 ? "day" : "days"} left`}
          </Text>
        </View>
      </View>
      <Text style={styles.raceHeadline}>{raceHeadline(race)}</Text>
      {sub ? <Text style={styles.raceSub}>{sub}</Text> : null}
      <View style={{ gap: 10, marginTop: 14 }}>
        {race.rows.map((r) => {
          const isMine = mine?.team === r.team;
          const place = race.rows.filter((x) => x.total > r.total).length + 1;
          return (
            <View key={r.team} style={[styles.raceRow, isMine && styles.raceRowMine]}>
              <Text style={styles.racePlace}>{race.allZero ? "–" : place}</Text>
              <View style={[styles.raceBadge, { backgroundColor: r.guide.colour }]}>
                <Image source={r.guide.badge} style={{ width: 24, height: 24 }} contentFit="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.raceNameRow}>
                  <Text style={[styles.raceName, isMine && { color: FK.sunbeam }]}>
                    {r.guide.teamName}
                    {isMine ? "  ·  You" : ""}
                  </Text>
                  <Text style={styles.racePts}>{r.total.toLocaleString()}</Text>
                </View>
                <View style={styles.raceTrack}>
                  <View
                    style={[
                      styles.raceBar,
                      { width: `${race.allZero ? 4 : Math.max(4, (r.total / max) * 100)}%`, backgroundColor: r.guide.colour },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.raceFooter}>
        <Text style={styles.raceFooterText}>See the race</Text>
        <Ionicons name="arrow-forward" size={18} color={FK.sunbeam} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 4,
    borderColor: FK.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 50, height: 50 },
  headerName: { fontFamily: FONT.display, fontSize: 28, color: FK.ink, letterSpacing: -0.6 },
  headerTeam: { fontFamily: FONT.display, fontSize: 15, letterSpacing: 1.4, marginTop: -2 },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: FK.ink,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  streakText: { fontFamily: FONT.display, fontSize: 16, color: FK.sunbeam },
  guideCard: {
    flexDirection: "row",
    backgroundColor: FK.paper,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    marginBottom: 14,
    minHeight: 120,
  },
  guidePortrait: { width: 108 },
  guideBody: { flex: 1, padding: 16, justifyContent: "center" },
  guideLine: { fontFamily: FONT.display, fontSize: 20, lineHeight: 24, color: FK.ink },
  guideName: { fontFamily: FONT.displayBold, fontSize: 14, color: FK.muted, marginTop: 8 },
  secretCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: FK.forest,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 14,
  },
  secretIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: FK.sunbeam,
    alignItems: "center",
    justifyContent: "center",
  },
  secretEyebrow: { fontFamily: FONT.display, fontSize: 12, letterSpacing: 1.6, color: FK.sunbeam },
  secretTitle: { fontFamily: FONT.display, fontSize: 18, color: FK.white, marginTop: 2 },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#E3ECD9",
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  planTitle: { fontFamily: FONT.display, fontSize: 16, color: FK.ink },
  planSub: { fontFamily: FONT.body, fontSize: 14, color: FK.muted, marginTop: 2 },
  planLink: { fontFamily: FONT.displayBold, fontSize: 15, color: FK.forest, textDecorationLine: "underline" },
  hero: { minHeight: 360, borderRadius: RADIUS.lg, padding: 20, marginBottom: 14, overflow: "hidden" },
  heroEyebrow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: FK.sunbeam,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heroEyebrowText: { fontFamily: FONT.display, fontSize: 13, letterSpacing: 1.2, color: FK.ink },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  heroTitle: { fontFamily: FONT.display, fontSize: 36, lineHeight: 38, color: FK.white, letterSpacing: -0.8 },
  heroFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  heroButton: { minHeight: 56, paddingHorizontal: 24 },
  heroPoints: { fontFamily: FONT.display, fontSize: 16, color: FK.sunbeam },
  week: { backgroundColor: FK.forest, borderRadius: RADIUS.lg, padding: 18, marginBottom: 14 },
  weekHeader: { marginBottom: 12 },
  weekEyebrow: { fontFamily: FONT.display, fontSize: 12, letterSpacing: 1.6, color: "#A9C79A" },
  weekRow: { flexDirection: "row" },
  weekHalf: { flex: 1 },
  weekDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.14)", marginHorizontal: 14 },
  weekIconRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  weekLabel: { fontFamily: FONT.display, fontSize: 18, color: FK.white },
  boxes: { flexDirection: "row", gap: 8, marginBottom: 10 },
  box: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#6E8F72",
    alignItems: "center",
    justifyContent: "center",
  },
  boxDone: { backgroundColor: FK.sunbeam, borderColor: FK.sunbeam, borderStyle: "solid" },
  weekBig: { fontFamily: FONT.display, fontSize: 28, color: FK.white, marginBottom: 6, lineHeight: 34 },
  weekBigUnit: { fontFamily: FONT.displayBold, fontSize: 16, color: FK.mutedOnDark },
  weekText: { fontFamily: FONT.body, fontSize: 14, lineHeight: 19, color: FK.mutedOnDark },
  raceCard: { backgroundColor: FK.ink, borderRadius: RADIUS.lg, padding: 18, marginBottom: 14 },
  raceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  daysChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: FK.sunbeam,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  daysText: { fontFamily: FONT.display, fontSize: 13, color: FK.ink },
  raceHeadline: { fontFamily: FONT.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.4, color: FK.white, marginTop: 12 },
  raceSub: { fontFamily: FONT.body, fontSize: 15, lineHeight: 21, color: FK.mutedOnDark, marginTop: 4 },
  raceRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: RADIUS.md, padding: 8 },
  raceRowMine: { backgroundColor: "rgba(255,255,255,0.08)" },
  racePlace: { width: 16, textAlign: "center", fontFamily: FONT.display, fontSize: 16, color: FK.mutedOnDark },
  raceBadge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  raceNameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 },
  raceName: { fontFamily: FONT.display, fontSize: 16, color: FK.white },
  raceTrack: { height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  raceBar: { height: "100%", borderRadius: 5 },
  racePts: { fontFamily: FONT.displayBold, fontSize: 15, color: FK.white },
  raceFooter: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, alignSelf: "flex-end" },
  raceFooterText: { fontFamily: FONT.display, fontSize: 15, color: FK.sunbeam },
});
