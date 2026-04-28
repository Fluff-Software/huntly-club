import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Image,
  StyleSheet,
  ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedReanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring } from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import {
  getTeamInfo,
  getAllTeamsWithXp,
  getTeamAchievements,
  getTeamAchievementTotals,
  TeamInfo } from "@/services/teamActivityService";
import { useUser } from "@/contexts/UserContext";
import { getTeamCardConfig } from "@/utils/teamUtils";

const CELEBRATE_IMAGE = require("@/assets/images/celebrate.png");
const GET_STARTED_ICON_2_IMAGE = require("@/assets/images/get-started-icon-2.png");

const ACHIEVEMENTS_INITIAL = 4;
const ACHIEVEMENTS_PAGE_SIZE = 4;
const LOAD_MORE_THRESHOLD = 40;

const TEAM_ORDER = ["bears", "foxes", "otters"] as const;

const ACHIEVEMENT_CARD_COLORS = ["#FFF5E8", "#E8F5F0", "#F0E8FF", "#E8F0FF", "#FFF0F0"];
const ACHIEVEMENT_ICON_BG = ["#F7A676", "#7FAF8A", "#A8D5E5", "#D4A05A", "#C97B6C"];

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
    points: a.xp }));
}

export default function SocialScreen() {
  const { scaleW } = useLayoutScale();
  const { teamId } = useUser();
  const [teamAchievements, setTeamAchievements] = useState<Awaited<ReturnType<typeof getTeamAchievements>>>([]);
  const [teamAchievementTotals, setTeamAchievementTotals] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [allTeams, setAllTeams] = useState<TeamInfo[]>([]);
  const [visibleAchievementsCount, setVisibleAchievementsCount] = useState(ACHIEVEMENTS_INITIAL);

  const chartProgress = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);

  const sortedTeamsForChart = useMemo(() => {
    const teamIdByName = Object.fromEntries(allTeams.map((t) => [t.name.toLowerCase(), t.id]));
    return TEAM_ORDER.map((name) => {
      const id = teamIdByName[name];
      const total = teamAchievementTotals[id] ?? 0;
      const config = getTeamCardConfig(name);
      return { name, total, config };
    }).sort((a, b) => b.total - a.total);
  }, [allTeams, teamAchievementTotals]);

  const barHeights = useMemo(() => {
    const maxTotal = Math.max(1, ...sortedTeamsForChart.map((t) => t.total));
    return sortedTeamsForChart.map((t) => {
      const pct = t.total / maxTotal;
      return scaleW(60 + pct * 160);
    });
  }, [scaleW, sortedTeamsForChart]);

  const bar1Style = useAnimatedStyle(() => ({ height: chartProgress.value * barHeights[0] }));
  const bar2Style = useAnimatedStyle(() => ({ height: chartProgress.value * barHeights[1] }));
  const bar3Style = useAnimatedStyle(() => ({ height: chartProgress.value * barHeights[2] }));

  useEffect(() => {
    chartProgress.value = withSpring(1, { damping: 18, stiffness: 80 });
  }, [chartProgress]);

  const fetchTeamActivities = useCallback(async () => {
    if (!teamId) { setLoading(false); return; }
    try {
      setError(null);
      const [teamData, teamsData, achievements, totals] = await Promise.all([
        getTeamInfo(teamId),
        getAllTeamsWithXp(),
        getTeamAchievements(teamId),
        getTeamAchievementTotals(),
      ]);
      setTeamInfo(teamData);
      setAllTeams(teamsData);
      setTeamAchievements(achievements);
      setTeamAchievementTotals(totals);
    } catch {
      setError("Failed to load team activities");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { fetchTeamActivities(); }, [fetchTeamActivities]);

  useFocusEffect(useCallback(() => {
    fetchTeamActivities();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [fetchTeamActivities]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTeamActivities();
    setRefreshing(false);
  }, [fetchTeamActivities]);

  const achievements = useMemo(() => mapAchievementsToItems(teamAchievements), [teamAchievements]);

  useEffect(() => { setVisibleAchievementsCount(ACHIEVEMENTS_INITIAL); }, [teamAchievements]);

  const visibleAchievements = useMemo(
    () => achievements.slice(0, visibleAchievementsCount),
    [achievements, visibleAchievementsCount]
  );
  const hasMoreAchievements = visibleAchievementsCount < achievements.length;
  const showNoMoreMessage = achievements.length > ACHIEVEMENTS_INITIAL && !hasMoreAchievements;

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      if (contentSize.height - (contentOffset.y + layoutMeasurement.height) < LOAD_MORE_THRESHOLD && hasMoreAchievements) {
        setVisibleAchievementsCount((prev) => Math.min(prev + ACHIEVEMENTS_PAGE_SIZE, achievements.length));
      }
    },
    [hasMoreAchievements, achievements.length]
  );

  const teamCardConfig = useMemo(() => getTeamCardConfig(teamInfo?.name), [teamInfo?.name]);

  if (!teamId) {
    return (
      <BaseLayout>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: scaleW(24) }}>
          <ThemedText type="heading" style={{ fontSize: scaleW(24), fontWeight: "700", textAlign: "center", marginBottom: scaleW(12) }}>
            Join a Team
          </ThemedText>
          <ThemedText style={{ fontSize: scaleW(14), textAlign: "center", opacity: 0.7 }}>
            Your account needs a team to view team activities. Create an explorer in Clubhouse to get started!
          </ThemedText>
        </View>
      </BaseLayout>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: teamCardConfig.backgroundColor, justifyContent: "center", alignItems: "center" }} edges={["top", "left", "right"]}>
        <ActivityIndicator size="large" color={teamCardConfig.accentColor} />
        <ThemedText style={{ marginTop: scaleW(12), fontSize: scaleW(16), color: teamCardConfig.accentColor, fontWeight: "600" }}>
          Loading your team…
        </ThemedText>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <BaseLayout>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: scaleW(24) }}>
          <ThemedText style={{ fontSize: scaleW(16), color: "#dc2626", textAlign: "center" }}>{error}</ThemedText>
        </View>
      </BaseLayout>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F5F0" }} edges={["top", "left", "right"]}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        onScroll={handleScroll}
        scrollEventThrottle={200}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header card */}
        <View style={{
          backgroundColor: teamCardConfig.backgroundColor,
          overflow: "hidden",
          minHeight: scaleW(200) }}>
          <Image
            source={teamCardConfig.bgImage}
            resizeMode="cover"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <Image
            source={teamCardConfig.standingImage}
            resizeMode="contain"
            style={{ position: "absolute", bottom: 0, right: scaleW(-8), width: scaleW(180), height: scaleW(220) }}
          />
          <View style={{ padding: scaleW(20), paddingRight: scaleW(160), paddingTop: scaleW(28), gap: scaleW(12) }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: scaleW(10) }}>
              <Image source={teamCardConfig.badgeImage} resizeMode="contain" style={{ width: scaleW(44), height: scaleW(44) }} />
              <View>
                <ThemedText type="heading" style={{ fontSize: scaleW(26), fontWeight: "800", color: teamCardConfig.accentColor, lineHeight: scaleW(30) }}>
                  {teamCardConfig.title}
                </ThemedText>
                <ThemedText style={{ fontSize: scaleW(13), fontWeight: "600", color: teamCardConfig.leaderColor }}>
                  {teamCardConfig.leaderPossessive} team
                </ThemedText>
              </View>
            </View>
            <View style={{
              backgroundColor: "#FFFFFF",
              borderRadius: scaleW(14),
              padding: scaleW(12),
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
              alignSelf: "flex-start" }}>
              <ThemedText style={{ fontSize: scaleW(13), lineHeight: scaleW(19), color: "#333", fontStyle: "italic" }}>
                "{teamCardConfig.title} are doing great this month!"
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: scaleW(24), paddingTop: scaleW(28), paddingBottom: scaleW(40), gap: scaleW(24) }}>

          {/* Leaderboard */}
          <View style={{
            backgroundColor: "#FFFFFF",
            borderRadius: scaleW(20),
            padding: scaleW(20),
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2 }}>
            <ThemedText type="heading" style={{ fontSize: scaleW(18), fontWeight: "700", color: "#333", marginBottom: scaleW(20), textAlign: "center" }}>
              This month
            </ThemedText>
            <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: scaleW(16) }}>
              {sortedTeamsForChart.map((bar, index) => {
                const barStyle = index === 0 ? bar1Style : index === 1 ? bar2Style : bar3Style;
                const isUserTeam = bar.name === teamInfo?.name?.toLowerCase();
                return (
                  <View key={bar.name} style={{ alignItems: "center", gap: scaleW(6) }}>
                    <AnimatedReanimated.View style={[{
                      width: scaleW(72),
                      backgroundColor: bar.config.backgroundColor,
                      borderRadius: scaleW(12),
                      alignItems: "center",
                      justifyContent: "flex-start",
                      paddingTop: scaleW(10),
                      borderWidth: isUserTeam ? 3 : 1,
                      borderColor: isUserTeam ? bar.config.accentColor : "rgba(0,0,0,0.06)" },
                    barStyle]}>
                      <Image
                        source={bar.config.badgeImage}
                        resizeMode="contain"
                        style={{ width: scaleW(40), height: scaleW(40) }}
                      />
                    </AnimatedReanimated.View>
                    <ThemedText style={{ fontSize: scaleW(12), fontWeight: "600", color: "#555" }}>
                      {bar.name.charAt(0).toUpperCase() + bar.name.slice(1)}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Recent achievements */}
          <View style={{ gap: scaleW(4) }}>
            <ThemedText type="heading" style={{ fontSize: scaleW(20), fontWeight: "700", color: "#333" }}>
              Recent achievements
            </ThemedText>
            <ThemedText style={{ fontSize: scaleW(13), color: "#888", marginBottom: scaleW(8) }}>
              What your team has been up to
            </ThemedText>
          </View>

          <View style={{ gap: scaleW(12) }}>
            {visibleAchievements.map((item, index) => {
              const cardBg = ACHIEVEMENT_CARD_COLORS[index % ACHIEVEMENT_CARD_COLORS.length];
              const iconBg = ACHIEVEMENT_ICON_BG[index % ACHIEVEMENT_ICON_BG.length];
              return (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: scaleW(16),
                    padding: scaleW(14),
                    flexDirection: "row",
                    alignItems: "center",
                    gap: scaleW(12),
                    transform: [{ rotate: index % 2 === 0 ? "-0.8deg" : "0.8deg" }],
                    shadowColor: "#000",
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                    borderWidth: 2,
                    borderColor: "rgba(255,255,255,0.8)" }}>
                  <View style={{
                    width: scaleW(48),
                    height: scaleW(48),
                    borderRadius: scaleW(24),
                    backgroundColor: iconBg,
                    alignItems: "center",
                    justifyContent: "center" }}>
                    <Image
                      source={item.type === "badge" ? GET_STARTED_ICON_2_IMAGE : CELEBRATE_IMAGE}
                      style={{ width: scaleW(28), height: scaleW(28) }}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: scaleW(14), fontWeight: "600", color: "#1a1a1a", lineHeight: scaleW(20) }}>
                      {item.title}
                    </ThemedText>
                    <ThemedText style={{ fontSize: scaleW(13), fontWeight: "700", color: teamCardConfig.accentColor, marginTop: scaleW(2) }}>
                      + {item.points} points
                    </ThemedText>
                  </View>
                </View>
              );
            })}

            {hasMoreAchievements && (
              <View style={{ paddingVertical: scaleW(16), alignItems: "center" }}>
                <ActivityIndicator size="small" color={teamCardConfig.accentColor} />
              </View>
            )}
            {showNoMoreMessage && (
              <ThemedText style={{ fontSize: scaleW(13), color: "#888", textAlign: "center", marginTop: scaleW(8) }}>
                You're all caught up! More achievements will appear as your team explores.
              </ThemedText>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
