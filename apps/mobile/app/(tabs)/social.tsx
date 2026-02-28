import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Image,
  StyleSheet,
  Animated as RNAnimated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import {
  getTeamInfo,
  getAllTeamsWithXp,
  getTeamAchievements,
  getTeamAchievementTotals,
  TeamInfo,
} from "@/services/teamActivityService";
import { usePlayer } from "@/contexts/PlayerContext";
import { getTeamCardConfig } from "@/utils/teamUtils";

const BEAR_FACE_IMAGE = require("@/assets/images/bear-face.png");
const FOX_FACE_IMAGE = require("@/assets/images/fox-face.png");
const OTTER_FACE_IMAGE = require("@/assets/images/otter-face.png");
const CELEBRATE_IMAGE = require("@/assets/images/celebrate.png");
const GET_STARTED_ICON_2_IMAGE = require("@/assets/images/get-started-icon-2.png");

const ACHIEVEMENTS_INITIAL = 4;
const ACHIEVEMENTS_PAGE_SIZE = 4;
const LOAD_MORE_THRESHOLD = 40;

const HEADER_PURPLE = "#C3A4FF";
const PAGE_BG = "#F3ECFF";
const CHART_BASELINE = "#6B4BB6";
const BAR_WHITE = "#FFFFFF";
const BAR_BLUE = "#D3C2FF";
const BAR_GREEN = "#B6A0F5";

const ACHIEVEMENT_CARD_COLORS = [
  "#FFF5E8",
  "#E8F5F0",
  "#F0E8FF",
  "#E8F0FF",
  "#FFF0F0",
];
const ACHIEVEMENT_ICON_BG = ["#F7A676", "#7FAF8A", "#A8D5E5", "#D4A05A", "#C97B6C"];
const POINTS_PURPLE = "#5B3AAE";

type AchievementItem = {
  id: string;
  type: "badge" | "activity";
  title: string;
  points: number;
};

function mapAchievementsToItems(achievements: { id: number; profile_name: string; message: string; xp: number }[]): AchievementItem[] {
  return achievements.slice(0, 10).map((a) => ({
    id: `ach-${a.id}`,
    type: "activity" as const,
    title: `${a.profile_name} ${a.message}`,
    points: a.xp,
  }));
}

export default function SocialScreen() {
  const { scaleW, width } = useLayoutScale();
  const { currentPlayer } = usePlayer();
  const [teamAchievements, setTeamAchievements] = useState<Awaited<ReturnType<typeof getTeamAchievements>>>([]);
  const [teamAchievementTotals, setTeamAchievementTotals] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [allTeams, setAllTeams] = useState<TeamInfo[]>([]);
  const [visibleAchievementsCount, setVisibleAchievementsCount] = useState(ACHIEVEMENTS_INITIAL);

  const bearSlideAnim = useRef(new RNAnimated.Value(400)).current;
  const chartProgress = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);

  const TEAM_ORDER = ["bears", "foxes", "otters"] as const;
  const TEAM_FACE_BY_NAME: Record<string, typeof BEAR_FACE_IMAGE> = {
    bears: BEAR_FACE_IMAGE,
    foxes: FOX_FACE_IMAGE,
    otters: OTTER_FACE_IMAGE,
  };

  /** Teams sorted by points (highest first) for the chart. */
  const sortedTeamsForChart = useMemo(() => {
    const teamIdByName = Object.fromEntries(
      allTeams.map((t) => [t.name.toLowerCase(), t.id])
    );
    const colourByName: Record<string, string> = {};
    for (const team of allTeams) {
      if (team.colour) colourByName[team.name.toLowerCase()] = team.colour;
    }
    const withTotals = TEAM_ORDER.map((name) => {
      const id = teamIdByName[name];
      const total = teamAchievementTotals[id] ?? 0;
      const color =
        colourByName[name] ??
        (name === "bears" ? BAR_WHITE : name === "foxes" ? BAR_BLUE : BAR_GREEN);
      return {
        name,
        total,
        face: TEAM_FACE_BY_NAME[name],
        color,
      };
    });
    return withTotals.sort((a, b) => b.total - a.total);
  }, [allTeams, teamAchievementTotals]);

  const barHeights = useMemo(() => {
    const maxTotal = Math.max(1, ...sortedTeamsForChart.map((t) => t.total));
    const minDesign = 20;
    const maxDesign = 220;
    return sortedTeamsForChart.map((t) => {
      const designHeight = minDesign + (t.total / maxTotal) * (maxDesign - minDesign);
      return scaleW(designHeight);
    });
  }, [scaleW, sortedTeamsForChart]);

  const barColors = useMemo(
    () => sortedTeamsForChart.map((t) => t.color),
    [sortedTeamsForChart]
  );

  const bar1Style = useAnimatedStyle(() => ({
    height: chartProgress.value * barHeights[0],
    backgroundColor: barColors[0],
  }));
  const bar2Style = useAnimatedStyle(() => ({
    height: chartProgress.value * barHeights[1],
    backgroundColor: barColors[1],
  }));
  const bar3Style = useAnimatedStyle(() => ({
    height: chartProgress.value * barHeights[2],
    backgroundColor: barColors[2],
  }));

  useEffect(() => {
    if (width === 0) return;
    bearSlideAnim.setValue(-width);
    RNAnimated.spring(bearSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 45,
      friction: 8,
    }).start();
  }, [width]);

  useEffect(() => {
    chartProgress.value = withSpring(1, { damping: 18, stiffness: 80 });
  }, []);

  const fetchTeamActivities = useCallback(async () => {
    if (!currentPlayer?.team) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [teamData, teamsData, achievements, totals] = await Promise.all([
        getTeamInfo(currentPlayer.team),
        getAllTeamsWithXp(),
        getTeamAchievements(currentPlayer.team),
        getTeamAchievementTotals(),
      ]);
      setTeamInfo(teamData);
      setAllTeams(teamsData);
      setTeamAchievements(achievements);
      setTeamAchievementTotals(totals);
    } catch (err) {
      setError("Failed to load team activities");
    } finally {
      setLoading(false);
    }
  }, [currentPlayer?.team]);

  useEffect(() => {
    fetchTeamActivities();
  }, [fetchTeamActivities]);

  useFocusEffect(
    useCallback(() => {
      fetchTeamActivities();
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [fetchTeamActivities])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTeamActivities();
    setRefreshing(false);
  }, [fetchTeamActivities]);

  const achievements = useMemo(
    () => mapAchievementsToItems(teamAchievements),
    [teamAchievements]
  );

  useEffect(() => {
    setVisibleAchievementsCount(ACHIEVEMENTS_INITIAL);
  }, [teamAchievements]);

  const visibleAchievements = useMemo(
    () => achievements.slice(0, visibleAchievementsCount),
    [achievements, visibleAchievementsCount]
  );
  const hasMoreAchievements = visibleAchievementsCount < achievements.length;
  const showNoMoreMessage = achievements.length > ACHIEVEMENTS_INITIAL && !hasMoreAchievements;

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const scrollEnd = contentOffset.y + layoutMeasurement.height;
      if (contentSize.height - scrollEnd < LOAD_MORE_THRESHOLD && hasMoreAchievements) {
        setVisibleAchievementsCount((prev) => Math.min(prev + ACHIEVEMENTS_PAGE_SIZE, achievements.length));
      }
    },
    [hasMoreAchievements, achievements.length]
  );

  const teamCardConfig = useMemo(
    () => getTeamCardConfig(teamInfo?.name),
    [teamInfo?.name]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: PAGE_BG },
        header: {
          backgroundColor: HEADER_PURPLE,
          paddingHorizontal: scaleW(24),
          overflow: "hidden",
        },
        headerRow: {
          flexDirection: "row",
          alignItems: "flex-end",
          paddingVertical: scaleW(70),
        },
        headerBearWrap: {
          bottom: scaleW(-27),
          width: scaleW(140),
          alignItems: "center",
          justifyContent: "center",
        },
        headerBear: {
          position: "absolute",
          width: scaleW(140),
          height: scaleW(200),
        },
        headerText: {
          flex: 1,
          marginLeft: scaleW(16),
          paddingBottom: scaleW(8),
        },
        headerTitle: {
          marginHorizontal: scaleW(12),
          fontSize: scaleW(22),
          fontWeight: "600",
          color: "#000",
          lineHeight: scaleW(26),
        },
        sectionTitle: {
          fontSize: scaleW(22),
          fontWeight: "700",
          color: "#000",
          textAlign: "center",
          marginTop: scaleW(32),
          marginBottom: scaleW(24),
        },
        chartRow: {
          flexDirection: "row",
          justifyContent: "center",
          paddingHorizontal: scaleW(24),
          gap: scaleW(20),
        },
        chartBarWrap: {
          alignItems: "center",
          justifyContent: "flex-end",
          overflow: "hidden",
        },
        chartBar: {
          borderTopLeftRadius: scaleW(12),
          borderTopRightRadius: scaleW(12),
          alignItems: "center",
          padding: scaleW(16),
        },
        chartFace: {
          width: scaleW(48),
          height: scaleW(48),
          borderRadius: scaleW(28),
          backgroundColor: "#FFF",
          overflow: "hidden",
          padding: scaleW(6),
          zIndex: 1,
        },
        chartBaseline: {
          height: 10,
          backgroundColor: CHART_BASELINE,
          marginHorizontal: scaleW(40),
          borderRadius: 10,
        },
        chartSubtitle: {
          fontSize: scaleW(16),
          color: "#000",
          textAlign: "center",
          marginHorizontal: scaleW(64),
          marginTop: scaleW(32),
          marginBottom: scaleW(8),
          opacity: 0.85,
        },
        achievementsTitle: {
          fontSize: scaleW(24),
          fontWeight: "700",
          color: POINTS_PURPLE,
          marginTop: scaleW(40),
          marginBottom: scaleW(24),
          marginLeft: scaleW(24),
        },
        timeline: {
          paddingHorizontal: scaleW(20),
          paddingBottom: scaleW(64),
          alignItems: "center",
          gap: scaleW(20),
        },
        achievementCard: {
          width: "100%",
          maxWidth: scaleW(340),
          flexDirection: "row",
          borderRadius: scaleW(20),
          overflow: "hidden" as const,
          padding: scaleW(16),
          shadowColor: "#4F6F52",
          shadowOpacity: 0.12,
          shadowRadius: scaleW(12),
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
          borderWidth: 3,
          borderColor: "rgba(255,255,255,0.9)",
        },
        achievementIcon: {
          width: scaleW(56),
          height: scaleW(56),
          borderRadius: scaleW(28),
          alignItems: "center",
          justifyContent: "center",
          marginRight: scaleW(16),
        },
        achievementIconImage: {
          width: scaleW(32),
          height: scaleW(32),
        },
        achievementText: {
          flex: 1,
          justifyContent: "center",
          paddingVertical: scaleW(4),
        },
        achievementTitle: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: "#1a1a1a",
          marginBottom: scaleW(4),
          lineHeight: scaleW(22),
        },
        achievementPoints: {
          fontSize: scaleW(15),
          fontWeight: "700",
          color: POINTS_PURPLE,
        },
        emptyStateContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: scaleW(24),
        },
        emptyStateTitle: {
          fontSize: scaleW(24),
          fontWeight: "700",
          color: POINTS_PURPLE,
          textAlign: "center",
          marginBottom: scaleW(16),
        },
        emptyStateBody: {
          fontSize: scaleW(14),
          color: "#36454F",
          textAlign: "center",
        },
        loadingText: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: POINTS_PURPLE,
        },
        errorText: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: "#dc2626",
          textAlign: "center",
          marginBottom: scaleW(8),
        },
        loadingMoreWrap: {
          paddingVertical: scaleW(24),
          alignItems: "center",
          justifyContent: "center",
        },
        noMoreAchievements: {
          fontSize: scaleW(14),
          color: "#000",
          opacity: 0.6,
          textAlign: "center",
          marginTop: scaleW(16),
          marginBottom: scaleW(8),
        },
      }),
    [scaleW]
  );

  if (!currentPlayer) {
    return (
      <BaseLayout>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateTitle}>
            Select Your Explorer
          </Text>
          <Text style={styles.emptyStateBody}>
            Choose an explorer profile to view your team. Teams make exploring even more fun!
          </Text>
        </View>
      </BaseLayout>
    );
  }

  if (!currentPlayer.team) {
    return (
      <BaseLayout>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateTitle}>
            Join a Team
          </Text>
          <Text style={styles.emptyStateBody}>
            Your explorer needs to join a team to view team activities. Create an explorer in Clubhouse to get started!
          </Text>
        </View>
      </BaseLayout>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.page, { justifyContent: "center", alignItems: "center" }]} edges={["top", "left", "right"]}>
        <Text style={styles.loadingText}>
          Loading your team…
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <BaseLayout>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      </BaseLayout>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        onScroll={handleScroll}
        scrollEventThrottle={200}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Animated.View
          entering={FadeInDown.duration(600).delay(0)}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerBearWrap}>
              <RNAnimated.View
                style={[
                  styles.headerBear,
                  { transform: [{ translateX: bearSlideAnim }] },
                ]}
              >
                <Image
                  source={teamCardConfig.waveImage}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              </RNAnimated.View>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>
                {teamCardConfig.title} are doing great this month!
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(150)}>
          <Text style={styles.sectionTitle}>This month</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(280)}
          style={styles.chartRow}
        >
          {sortedTeamsForChart.map((bar, index) => {
            const barStyle = index === 0 ? bar1Style : index === 1 ? bar2Style : bar3Style;
            return (
              <View key={bar.name} style={styles.chartBarWrap}>
                <Animated.View style={[styles.chartBar, barStyle]}>
                  <View style={styles.chartFace}>
                    <Image
                      source={bar.face}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="contain"
                    />
                  </View>
                </Animated.View>
              </View>
            );
          })}
        </Animated.View>
        <View style={styles.chartBaseline} />
        <Text style={styles.chartSubtitle}>
          {teamCardConfig.title} are exploring brilliantly this month
        </Text>

        <Animated.View entering={FadeInDown.duration(500).delay(380)}>
          <Text style={styles.achievementsTitle}>Recent achievements</Text>
        </Animated.View>
        <View style={[styles.timeline, { position: "relative" }]}>
          {visibleAchievements.map((item, index) => {
            const cardBg = ACHIEVEMENT_CARD_COLORS[index % ACHIEVEMENT_CARD_COLORS.length];
            const iconBg = ACHIEVEMENT_ICON_BG[index % ACHIEVEMENT_ICON_BG.length];
            return (
              <Animated.View
                key={item.id}
                entering={FadeInDown.duration(400).delay(450 + index * 60)}
                style={{ zIndex: 1, width: "100%", alignItems: "center" }}
              >
                <View
                  style={[
                    styles.achievementCard,
                    {
                      backgroundColor: cardBg,
                      transform: [{ rotate: index % 2 === 0 ? "-1.5deg" : "1.5deg" }],
                    },
                  ]}
                >
                  <View style={[styles.achievementIcon, { backgroundColor: iconBg }]}>
                    <Image
                      source={item.type === "badge" ? GET_STARTED_ICON_2_IMAGE : CELEBRATE_IMAGE}
                      style={styles.achievementIconImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.achievementText}>
                    <Text style={styles.achievementTitle}>{item.title}</Text>
                    <Text style={styles.achievementPoints}>+ {item.points} points</Text>
                  </View>
                </View>
              </Animated.View>
            );
          })}
          {hasMoreAchievements && (
            <View style={styles.loadingMoreWrap}>
              <ActivityIndicator size="small" color={CHART_BASELINE} />
            </View>
          )}
          {showNoMoreMessage && (
            <Text style={styles.noMoreAchievements}>You're all caught up! More achievements will appear as your team explores.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
