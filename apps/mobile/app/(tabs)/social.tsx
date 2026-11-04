import React, { useCallback, useMemo, useRef } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  FKButton,
  FKCard,
  FKLoading,
  FKPageHeader,
} from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { GUIDES } from "@/constants/guides";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUser } from "@/contexts/UserContext";
import { useTeamGuide } from "@/hooks/useTeamGuide";
import { raceHeadline, type RaceRow, useTeamRace } from "@/hooks/useTeamRace";
import { formatMonthYear } from "@/services/teamActivityService";

const PODIUM_MIN = 70;
const PODIUM_EXTRA = 110;

function timeAgo(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

/** The monthly team race: standings, the family's part in it, and what's been happening. */
export default function TeamRaceScreen() {
  const { team, teamId } = useUser();
  const { profiles } = usePlayer();
  const { guide } = useTeamGuide();
  const ids = useMemo(() => profiles.map((p) => p.id), [profiles]);
  const { race, loading, error, load } = useTeamRace(team?.name, teamId, ids, {
    detail: true,
  });
  const [refreshing, setRefreshing] = React.useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      void load();
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [load]),
  );

  const back = () =>
    router.canGoBack() ? router.back() : router.navigate("/(tabs)");

  if ((loading && race.rows.length === 0) || !guide) return <FKLoading />;

  const podium = podiumOrder(race.rows);
  const max = Math.max(1, ...race.rows.map((r) => r.total));
  const winnerGuide = race.lastMonthWinner
    ? GUIDES.find((g) =>
        race
          .lastMonthWinner!.team_name.toLowerCase()
          .startsWith(g.team.slice(0, 3)),
      )
    : null;

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={FK.forest}
          />
        }
      >
        <FKPageHeader
          onBack={back}
          eyebrow={`TEAM RACE · ${race.monthName.toUpperCase()}`}
          title={raceHeadline(race)}
        />
        <Text style={[TYPE.bodySmall, { marginTop: -8 }]}>
          {race.daysLeft === 0
            ? "Today's the last day of the month. The winner is crowned at midnight."
            : `${race.daysLeft} ${race.daysLeft === 1 ? "day" : "days"} to go. The team with the most points at the end of the month wins.`}
        </Text>

        {error ? (
          <FKCard style={{ marginTop: 16 }}>
            <Text style={TYPE.body}>
              We couldn't load the race just now. Pull down to try again.
            </Text>
          </FKCard>
        ) : null}

        <Animated.View
          entering={FadeInDown.duration(350)}
          style={styles.podium}
        >
          {podium.map((r) => {
            const mine = race.mine?.team === r.team;
            const place = race.rows.filter((x) => x.total > r.total).length + 1;
            const height = race.allZero
              ? PODIUM_MIN + PODIUM_EXTRA / 3
              : PODIUM_MIN + (r.total / max) * PODIUM_EXTRA;
            return (
              <View key={r.team} style={styles.podiumCol}>
                <View
                  style={[
                    styles.podiumBadge,
                    { backgroundColor: r.guide.colour },
                    mine && styles.podiumBadgeMine,
                  ]}
                >
                  <Image
                    source={r.guide.badge}
                    style={{ width: 40, height: 40 }}
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.podiumTeam}>{r.guide.teamName}</Text>
                <Text style={styles.podiumPts}>{r.total.toLocaleString()}</Text>
                <View
                  style={[
                    styles.podiumBlock,
                    { height, backgroundColor: mine ? FK.ink : FK.paper },
                  ]}
                >
                  <Text
                    style={[
                      styles.podiumPlace,
                      { color: mine ? FK.sunbeam : FK.ink },
                    ]}
                  >
                    {race.allZero ? "–" : place}
                  </Text>
                  {mine ? <Text style={styles.podiumYou}>You</Text> : null}
                </View>
              </View>
            );
          })}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(350).delay(80)}>
          <FKCard style={styles.familyCard}>
            <View
              style={[styles.familyIcon, { backgroundColor: guide.colour }]}
            >
              <Image
                source={guide.badge}
                style={{ width: 30, height: 30 }}
                contentFit="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={TYPE.eyebrow}>YOUR FAMILY THIS MONTH</Text>
              <Text style={styles.familyPts}>
                {race.familyPoints.toLocaleString()}{" "}
                {race.familyPoints === 1 ? "point" : "points"}
              </Text>
              <Text style={TYPE.bodySmall}>
                {race.familyPoints === 0
                  ? `Finish a mission to add your first points for the ${guide.teamName}.`
                  : `Added to the ${guide.teamName}' total. Nice work.`}
              </Text>
            </View>
          </FKCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(350).delay(120)}>
          <FKCard style={{ marginTop: 12 }}>
            <Text style={TYPE.heading}>How to score</Text>
            <ScoreRow icon="flag" text="Finish a mission: the biggest points" />
            <ScoreRow icon="compass" text="Find cards on Explore walks" />
            <ScoreRow
              icon="people"
              text="Everyone in the family scores for the same team"
            />
          </FKCard>
        </Animated.View>

        {race.lastMonthWinner && winnerGuide ? (
          <FKCard style={styles.winnerCard}>
            <Ionicons name="trophy" size={26} color={FK.sunbeam} />
            <Text style={styles.winnerText}>
              The {winnerGuide.teamName} won{" "}
              {formatMonthYear(
                race.lastMonthWinner.year,
                race.lastMonthWinner.month,
              )}{" "}
              with {race.lastMonthWinner.total_xp.toLocaleString()} points.
            </Text>
          </FKCard>
        ) : null}

        <Text style={[TYPE.eyebrow, { marginTop: 24, marginBottom: 10 }]}>
          LATEST FOR THE {guide.teamName.toUpperCase()}
        </Text>
        {race.moments.length === 0 ? (
          <Text style={TYPE.bodySmall}>
            Nothing yet this month. Be the first on the board.
          </Text>
        ) : (
          race.moments.map((m) => {
            // Your own explorers by name; everyone else by their public explorer nickname.
            const own = profiles.find((p) => p.id === m.profile_id);
            const who = own?.name ?? m.profile_name;
            return (
              <View key={`${m.source}-${m.id}`} style={styles.moment}>
                <View
                  style={[
                    styles.momentDot,
                    own && { backgroundColor: own.colour || guide.colour },
                  ]}
                >
                  <Text
                    style={[styles.momentInitial, own && { color: FK.white }]}
                  >
                    {(who?.trim()[0] ?? "?").toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.momentText} numberOfLines={2}>
                    <Text style={{ fontFamily: FONT.bodyBold }}>{who}</Text>{" "}
                    {m.message}
                  </Text>
                  <Text style={styles.momentTime}>{timeAgo(m.created_at)}</Text>
                </View>
                {m.xp ? <Text style={styles.momentPts}>+{m.xp}</Text> : null}
              </View>
            );
          })
        )}

        <FKButton
          label="Score with a mission"
          onPress={() => router.navigate("/(tabs)/missions")}
          style={{ marginTop: 20 }}
          testID="race-missions"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Second, first, third: the classic podium shape. */
function podiumOrder(rows: RaceRow[]): RaceRow[] {
  if (rows.length < 3) return rows;
  return [rows[1], rows[0], rows[2]];
}

function ScoreRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreIcon}>
        <Ionicons name={icon} size={16} color={FK.ink} />
      </View>
      <Text style={[TYPE.body, { flex: 1, fontSize: 16 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FK.moss },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 22,
  },
  podiumCol: { flex: 1, alignItems: "center" },
  podiumBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: FK.moss,
  },
  podiumBadgeMine: { borderColor: FK.sunbeam },
  podiumTeam: {
    fontFamily: FONT.display,
    fontSize: 16,
    color: FK.ink,
    marginTop: 6,
  },
  podiumPts: {
    fontFamily: FONT.displayBold,
    fontSize: 14,
    color: FK.muted,
    marginBottom: 8,
  },
  podiumBlock: {
    width: "100%",
    borderTopLeftRadius: RADIUS.md,
    borderTopRightRadius: RADIUS.md,
    alignItems: "center",
    paddingTop: 10,
  },
  podiumPlace: { fontFamily: FONT.display, fontSize: 30 },
  podiumYou: {
    fontFamily: FONT.display,
    fontSize: 13,
    color: FK.sunbeam,
    letterSpacing: 1,
  },
  familyCard: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    marginTop: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  familyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  familyPts: {
    fontFamily: FONT.display,
    fontSize: 26,
    color: FK.ink,
    marginTop: 2,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  scoreIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: FK.sunbeam,
    alignItems: "center",
    justifyContent: "center",
  },
  winnerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    backgroundColor: FK.forest,
  },
  winnerText: {
    flex: 1,
    fontFamily: FONT.displayBold,
    fontSize: 16,
    lineHeight: 22,
    color: FK.white,
  },
  moment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: FK.line,
  },
  momentDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: FK.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  momentInitial: { fontFamily: FONT.display, fontSize: 15, color: FK.ink },
  momentText: {
    fontFamily: FONT.body,
    fontSize: 15,
    lineHeight: 20,
    color: FK.ink,
  },
  momentTime: {
    fontFamily: FONT.body,
    fontSize: 13,
    color: FK.muted,
    marginTop: 2,
  },
  momentPts: { fontFamily: FONT.display, fontSize: 16, color: FK.forest },
});
