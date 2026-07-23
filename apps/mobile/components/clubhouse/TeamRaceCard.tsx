import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Image, Animated, Easing, Pressable } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { getAllTeamsWithXp, getTeamAchievementTotals } from "@/services/teamActivityService";
import { getTeamCardConfig } from "@/utils/teamUtils";

const TEAM_ORDER = ["foxes", "bears", "otters"] as const;
const BAR_MIN_WIDTH_PCT = 0.18;

type TeamRaceRow = { name: string; total: number };

type TeamRaceCardProps = {
  /** The signed-in user's own team name, used to highlight their bar. */
  userTeamName?: string | null;
};

export function TeamRaceCard({ userTeamName }: TeamRaceCardProps) {
  const { scaleW } = useLayoutScale();
  const [teams, setTeams] = useState<TeamRaceRow[]>([]);
  const [trackWidth, setTrackWidth] = useState(0);
  const barProgress = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    try {
      const [allTeams, totals] = await Promise.all([
        getAllTeamsWithXp(),
        getTeamAchievementTotals(),
      ]);
      const teamIdByName = Object.fromEntries(allTeams.map((t) => [t.name.toLowerCase(), t.id]));
      const rows = TEAM_ORDER.map((name) => ({
        name,
        total: totals[teamIdByName[name]] ?? 0,
      })).sort((a, b) => b.total - a.total);
      setTeams(rows);
    } catch {
      setTeams([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchData();
    }, [fetchData])
  );

  const totalsKey = teams.map((t) => t.total).join(",");
  const maxTotal = Math.max(1, ...teams.map((t) => t.total));

  useEffect(() => {
    barProgress.stopAnimation();
    barProgress.setValue(0);
    Animated.timing(barProgress, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barProgress, totalsKey]);

  const handleTrackLayout = (width: number) => {
    if (width > 0 && width !== trackWidth) setTrackWidth(width);
  };

  return (
    <View
      style={{
        backgroundColor: "rgba(255,255,255,0.95)",
        borderRadius: scaleW(20),
        borderWidth: 2,
        borderColor: "#FFF",
        padding: scaleW(16),
        gap: scaleW(14),
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <ThemedText type="heading" style={{ fontSize: scaleW(16), fontWeight: "700", color: "#333" }}>
          Team race · this month
        </ThemedText>
        <Pressable
          onPress={() => router.push("/(tabs)/social")}
          hitSlop={8}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <ThemedText style={{ fontSize: scaleW(13), fontWeight: "700", color: "#4F6F52" }}>
            Standings
          </ThemedText>
          <MaterialIcons name="chevron-right" size={scaleW(16)} color="#4F6F52" />
        </Pressable>
      </View>

      <View style={{ gap: scaleW(12) }}>
        {teams.map((t, index) => {
          const config = getTeamCardConfig(t.name);
          const isUserTeam = userTeamName?.toLowerCase() === t.name;
          const isLeading = index === 0 && t.total > 0;
          const pct = maxTotal > 0 ? t.total / maxTotal : 0;
          const widthPct = Math.max(BAR_MIN_WIDTH_PCT, pct);
          return (
            <View key={t.name} style={{ gap: scaleW(5) }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: scaleW(6) }}>
                <Image
                  source={config.badgeImage}
                  resizeMode="contain"
                  style={{ width: scaleW(22), height: scaleW(22) }}
                />
                <ThemedText style={{ fontSize: scaleW(14), fontWeight: "800", color: config.accentColor }}>
                  {config.title}
                </ThemedText>
                {isLeading && <ThemedText style={{ fontSize: scaleW(14) }}>👑</ThemedText>}
              </View>
              <View
                onLayout={(e) => handleTrackLayout(e.nativeEvent.layout.width)}
                style={{
                  height: scaleW(12),
                  borderRadius: scaleW(6),
                  backgroundColor: "rgba(0,0,0,0.06)",
                  overflow: "hidden",
                }}
              >
                <Animated.View
                  style={{
                    height: "100%",
                    borderRadius: scaleW(6),
                    backgroundColor: config.accentColor,
                    borderWidth: isUserTeam ? 2 : 0,
                    borderColor: "#FFF",
                    width: barProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, trackWidth * widthPct],
                    }),
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
