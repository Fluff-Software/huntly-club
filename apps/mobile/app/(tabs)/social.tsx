import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Image,
  StyleSheet,
  Animated as RNAnimated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import {
  getTeamActivityLogs,
  TeamActivityLogEntry,
  getTeamInfo,
  getAllTeamsWithXp,
  TeamInfo,
} from "@/services/teamActivityService";
import { usePlayer } from "@/contexts/PlayerContext";
import Svg, { Polyline } from "react-native-svg";

const POLYLINE_COLOR = "#838383";

const BEAR_WAVE_IMAGE = require("@/assets/images/bear-wave.png");
const BEAR_FACE_IMAGE = require("@/assets/images/bear-face.png");
const FOX_FACE_IMAGE = require("@/assets/images/fox-face.png");
const OTTER_FACE_IMAGE = require("@/assets/images/otter-face.png");
const CELEBRATE_IMAGE = require("@/assets/images/celebrate.png");
const GET_STARTED_ICON_2_IMAGE = require("@/assets/images/get-started-icon-2.png");

const HEADER_ORANGE = "#F7A676";
const PAGE_BG = "#EBCDBB";
const CHART_BASELINE = "#4F6F52";
const BAR_WHITE = "#FFFFFF";
const BAR_BLUE = "#A8D5E5";
const BAR_GREEN = "#B5D9B5";
const CARD_GRAY = "#D9D9D9";

type AchievementItem = {
  id: string;
  type: "badge" | "activity";
  title: string;
  points: number;
};

const PLACEHOLDER_ACHIEVEMENTS: AchievementItem[] = [
  { id: "1", type: "badge", title: "Curious Llama earned a badge", points: 50 },
  { id: "2", type: "activity", title: "Funny Explorer completed an activity", points: 30 },
  { id: "3", type: "badge", title: "Orange Kangaroo earned a badge", points: 50 },
  { id: "4", type: "badge", title: "Curious Llama earned a badge", points: 50 },
];

function mapActivitiesToAchievements(activities: TeamActivityLogEntry[]): AchievementItem[] {
  return activities
    .filter((a) => a.status === "completed")
    .slice(0, 10)
    .map((a, i) => ({
      id: `act-${a.id}-${i}`,
      type: "activity",
      title: `${a.profile?.nickname || a.profile?.name || "Explorer"} completed an activity`,
      points: a.activity?.xp ?? 0,
    }));
}

export default function SocialScreen() {
  const { scaleW, width } = useLayoutScale();
  const { currentPlayer } = usePlayer();
  const [teamActivities, setTeamActivities] = useState<TeamActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [allTeams, setAllTeams] = useState<TeamInfo[]>([]);
  const [timelineLayout, setTimelineLayout] = useState<{ width: number; height: number } | null>(null);
  const [cardCenters, setCardCenters] = useState<Array<{ x: number; y: number }>>([]);

  const bearSlideAnim = useRef(new RNAnimated.Value(400)).current;
  const chartProgress = useSharedValue(0);

  const barHeights = useMemo(
    () => [scaleW(100), scaleW(160), scaleW(88)],
    [scaleW]
  );
  const bar1Style = useAnimatedStyle(() => ({
    height: chartProgress.value * barHeights[0],
    backgroundColor: BAR_WHITE,
  }));
  const bar2Style = useAnimatedStyle(() => ({
    height: chartProgress.value * barHeights[1],
    backgroundColor: BAR_BLUE,
  }));
  const bar3Style = useAnimatedStyle(() => ({
    height: chartProgress.value * barHeights[2],
    backgroundColor: BAR_GREEN,
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
      const [activities, teamData, teamsData] = await Promise.all([
        getTeamActivityLogs(currentPlayer.team),
        getTeamInfo(currentPlayer.team),
        getAllTeamsWithXp(),
      ]);
      setTeamActivities(activities);
      setTeamInfo(teamData);
      setAllTeams(teamsData);
    } catch (err) {
      setError("Failed to load team activities");
    } finally {
      setLoading(false);
    }
  }, [currentPlayer?.team]);

  useEffect(() => {
    fetchTeamActivities();
  }, [fetchTeamActivities]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTeamActivities();
    setRefreshing(false);
  }, [fetchTeamActivities]);

  const achievements = useMemo(() => {
    const fromApi = mapActivitiesToAchievements(teamActivities);
    return fromApi.length > 0 ? fromApi : PLACEHOLDER_ACHIEVEMENTS;
  }, [teamActivities]);

  useEffect(() => {
    setCardCenters([]);
  }, [achievements.length]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: PAGE_BG },
        header: {
          backgroundColor: HEADER_ORANGE,
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
          fontSize: scaleW(20),
          fontWeight: "700",
          color: "#000",
          marginTop: scaleW(40),
          marginBottom: scaleW(20),
          marginLeft: scaleW(24),
        },
        timeline: {
          paddingHorizontal: scaleW(24),
          paddingBottom: scaleW(64),
          alignItems: "center",
          gap: scaleW(24),
        },
        achievementCard: {
          backgroundColor: CARD_GRAY,
          width: scaleW(240),
          flexDirection: "row",
        },
        achievementIcon: {
          width: scaleW(100),
          height: scaleW(120),
          borderTopRightRadius: "50%",
          borderBottomRightRadius: "50%",
          backgroundColor: "#FFF",
          alignItems: "center",
          justifyContent: "center",
          marginRight: scaleW(14),
        },
        achievementIconImage: {
          width: scaleW(50),
          height: scaleW(50),
        },
        achievementText: {
          flex: 1,
          justifyContent: "space-between",
          paddingHorizontal: scaleW(6),
          paddingVertical: scaleW(16),
        },
        achievementTitle: {
          fontSize: scaleW(15),
          fontWeight: "600",
          color: "#000",
          marginBottom: 2,
        },
        achievementPoints: {
          fontSize: scaleW(13),
          color: "#000",
          opacity: 0.7,
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
          color: "#2D5A27",
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
          color: "#2D5A27",
        },
        errorText: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: "#dc2626",
          textAlign: "center",
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
            Choose an explorer profile to view your team
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
            Your explorer needs to join a team to view team activities
          </Text>
        </View>
      </BaseLayout>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.page, { justifyContent: "center", alignItems: "center" }]} edges={["top", "left", "right"]}>
        <Text style={styles.loadingText}>
          Loading...
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

  const chartBars = [
    { face: BEAR_FACE_IMAGE, color: BAR_WHITE, height: scaleW(100) },
    { face: FOX_FACE_IMAGE, color: BAR_BLUE, height: scaleW(160) },
    { face: OTTER_FACE_IMAGE, color: BAR_GREEN, height: scaleW(88) },
  ];

  return (
    <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Animated.View
          entering={FadeInDown.duration(600).delay(0).springify().damping(18)}
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
                  source={BEAR_WAVE_IMAGE}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              </RNAnimated.View>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>
                Bears are doing great this month!
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(150).springify().damping(18)}>
          <Text style={styles.sectionTitle}>This month</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(280).springify().damping(18)}
          style={styles.chartRow}
        >
          {chartBars.map((bar, index) => {
            const barStyle = index === 0 ? bar1Style : index === 1 ? bar2Style : bar3Style;
            return (
              <View key={index} style={styles.chartBarWrap}>
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
          Foxes are exploring brilliantly this month
        </Text>

        <Animated.View entering={FadeInDown.duration(500).delay(380).springify().damping(18)}>
          <Text style={styles.achievementsTitle}>Recent achievements</Text>
        </Animated.View>
        <View
          style={[styles.timeline, { position: "relative" }]}
          onLayout={(e) => setTimelineLayout(e.nativeEvent.layout)}
        >
          {timelineLayout &&
            achievements.length >= 2 &&
            cardCenters.length === achievements.length &&
            cardCenters.every(Boolean) && (
            <Animated.View
              entering={FadeInDown.duration(400).delay(450).springify().damping(18)}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                zIndex: 0,
                width: timelineLayout.width,
                height: timelineLayout.height,
              }}
            >
              <Svg
                style={{ width: "100%", height: "100%" }}
                width={timelineLayout.width}
                height={timelineLayout.height}
              >
                <Polyline
                  points={(() => {
                    const ordered = achievements
                      .map((_, i) => cardCenters[i])
                      .filter((c): c is { x: number; y: number } => c != null);
                    if (ordered.length < 2) return "";
                    const extend = scaleW(24);
                    const first = ordered[0];
                    const last = ordered[ordered.length - 1];
                    const bottomMiddleX = timelineLayout.width / 2;
                    const bottomMiddleY = timelineLayout.height;
                    const above = `${first.x},${Math.max(0, first.y - extend)}`;
                    const below = `${last.x},${last.y + extend}`;
                    const middle = ordered.map((c) => `${c.x},${c.y}`).join(" ");
                    return `${above} ${middle} ${below} ${bottomMiddleX},${bottomMiddleY}`;
                  })()}
                  stroke={POLYLINE_COLOR}
                  strokeWidth={4}
                  fill="none"
                  strokeDasharray="4 4"
                />
              </Svg>
            </Animated.View>
          )}
          {achievements.map((item, index) => (
            <Animated.View
              key={item.id}
              entering={FadeInDown.duration(400).delay(450 + index * 60).springify().damping(18)}
              onLayout={(e) => {
                const { x, y, width, height } = e.nativeEvent.layout;
                setCardCenters((prev) => {
                  const next = [...prev];
                  next[index] = { x: x + width / 2, y: y + height / 2 };
                  return next;
                });
              }}
              style={[
                styles.achievementCard,
                {
                  transform: [{ rotate: index % 2 === 0 ? "-2deg" : "2deg" }],
                  marginLeft: index % 2 === 0 ? scaleW(20) : 0,
                  marginRight: index % 2 === 1 ? scaleW(20) : 0,
                  zIndex: 1,
                },
              ]}
            >
              <View style={styles.achievementIcon}>
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
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
