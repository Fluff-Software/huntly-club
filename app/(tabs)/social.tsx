import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, RefreshControl, Image, Alert } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { TeamActivityLog } from "@/components/TeamActivityLog";
import {
  getTeamActivityLogs,
  TeamActivityLogEntry,
  getTeamInfo,
  getAllTeamsWithXp,
  TeamInfo,
} from "@/services/teamActivityService";
import { usePlayer } from "@/contexts/PlayerContext";
import { getTeamImageSource } from "@/utils/teamUtils";
import { getTeamById } from "@/services/profileService";

export default function SocialScreen() {
  const { currentPlayer } = usePlayer();
  const [teamActivities, setTeamActivities] = useState<TeamActivityLogEntry[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [allTeams, setAllTeams] = useState<TeamInfo[]>([]);

  const fetchTeamActivities = useCallback(async () => {
    if (!currentPlayer?.team) {
      console.log("No current player or team, skipping fetch");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log("Fetching team activities for team:", currentPlayer.team);

      const [activities, teamData, teamsData] = await Promise.all([
        getTeamActivityLogs(currentPlayer.team),
        getTeamInfo(currentPlayer.team),
        getAllTeamsWithXp(),
      ]);

      console.log("Team data fetched:", {
        teamData,
        activitiesCount: activities.length,
      });

      setTeamActivities(activities);
      setTeamInfo(teamData);
      setAllTeams(teamsData);
    } catch (err) {
      console.error("Error fetching team activities:", err);
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

  if (!currentPlayer) {
    return (
      <BaseLayout>
        <ThemedView className="flex-1 justify-center items-center p-6">
          <View className="w-20 h-20 bg-huntly-mint rounded-full items-center justify-center mb-6">
            <ThemedText className="text-3xl">👥</ThemedText>
          </View>
          <ThemedText
            type="title"
            className="text-huntly-forest text-center mb-4"
          >
            Select Your Explorer
          </ThemedText>
          <ThemedText type="body" className="text-huntly-charcoal text-center">
            Choose an explorer profile to view your team activities
          </ThemedText>
        </ThemedView>
      </BaseLayout>
    );
  }

  if (!currentPlayer.team) {
    return (
      <BaseLayout>
        <ThemedView className="flex-1 justify-center items-center p-6">
          <View className="w-20 h-20 bg-huntly-mint rounded-full items-center justify-center mb-6">
            <ThemedText className="text-3xl">🏕️</ThemedText>
          </View>
          <ThemedText
            type="title"
            className="text-huntly-forest text-center mb-4"
          >
            Join a Team
          </ThemedText>
          <ThemedText type="body" className="text-huntly-charcoal text-center">
            Your explorer needs to join a team to view team activities
          </ThemedText>
        </ThemedView>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Loading State */}
        {loading && (
          <View className="flex-1 justify-center items-center p-6">
            <View className="w-20 h-20 bg-huntly-mint rounded-full items-center justify-center mb-6">
              <View className="w-8 h-8 border-2 border-huntly-leaf border-t-transparent rounded-full animate-spin" />
            </View>
            <ThemedText
              type="subtitle"
              className="text-huntly-forest text-center"
            >
              Loading team activities...
            </ThemedText>
          </View>
        )}

        {/* Error State */}
        {error && (
          <View className="flex-1 justify-center items-center p-6">
            <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-6">
              <ThemedText className="text-3xl">⚠️</ThemedText>
            </View>
            <ThemedText
              type="subtitle"
              className="text-red-600 text-center mb-2"
            >
              Oops!
            </ThemedText>
            <ThemedText
              type="body"
              className="text-huntly-charcoal text-center"
            >
              {error}
            </ThemedText>
          </View>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Header Section */}
            <View className="p-6 pb-4">
              <View className="flex-row items-center mb-6">
                {teamInfo ? (
                  <>
                    <View className="w-16 h-16 mr-4">
                      <Image
                        source={
                          getTeamImageSource(teamInfo.name) ||
                          require("@/assets/images/fox.png")
                        }
                        className="w-full h-full"
                        resizeMode="contain"
                      />
                    </View>
                    <View className="flex-1">
                      <ThemedText
                        type="title"
                        className="text-huntly-forest mb-1"
                      >
                        Team Activities
                      </ThemedText>
                      <ThemedText
                        type="subtitle"
                        className="text-huntly-charcoal"
                      >
                        See what your teammates are up to
                      </ThemedText>
                    </View>
                  </>
                ) : (
                  <View className="flex-1">
                    <ThemedText
                      type="title"
                      className="text-huntly-forest mb-1"
                    >
                      Team Activities
                    </ThemedText>
                    <ThemedText
                      type="subtitle"
                      className="text-huntly-charcoal"
                    >
                      Loading team information...
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Team XP Display Card */}
              {teamInfo && (
                <View className="bg-gradient-to-br from-huntly-mint to-huntly-sage rounded-2xl p-6 mb-6 shadow-soft">
                  <View className="flex-row items-center justify-between mb-3">
                    <ThemedText type="subtitle" className="text-huntly-forest">
                      Team XP
                    </ThemedText>
                    <View className="bg-white/20 rounded-full px-3 py-1">
                      <ThemedText
                        type="defaultSemiBold"
                        className="text-huntly-forest"
                      >
                        {teamInfo.team_xp}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText type="caption" className="text-huntly-charcoal">
                    Complete activities to earn XP for your team!
                  </ThemedText>

                  {/* XP Progress Bar */}
                  <View className="mt-4 bg-white/20 rounded-full h-2">
                    <View
                      className="bg-huntly-leaf h-2 rounded-full shadow-sm"
                      style={{
                        width: `${Math.min(
                          (teamInfo.team_xp / 100) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </View>
                </View>
              )}

              {/* Team Rankings Card */}
              {allTeams.length > 0 && (
                <View className="bg-white rounded-2xl p-6 mb-6 shadow-soft border border-huntly-mint/20">
                  <View className="flex-row items-center mb-4">
                    <ThemedText
                      type="subtitle"
                      className="text-huntly-forest mr-2"
                    >
                      Team Rankings
                    </ThemedText>
                    <View className="bg-huntly-leaf rounded-full px-2 py-1">
                      <ThemedText
                        type="caption"
                        className="text-white font-bold"
                      >
                        {allTeams.length} Teams
                      </ThemedText>
                    </View>
                  </View>

                  {allTeams.map((team, index) => (
                    <View
                      key={team.id}
                      className={`flex-row items-center justify-between py-3 ${
                        index < allTeams.length - 1
                          ? "border-b border-huntly-mint/20"
                          : ""
                      }`}
                    >
                      <View className="flex-row items-center flex-1">
                        {/* Position Badge */}
                        <View
                          className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                            index === 0
                              ? "bg-yellow-400"
                              : index === 1
                              ? "bg-gray-300"
                              : index === 2
                              ? "bg-amber-600"
                              : "bg-huntly-mint"
                          }`}
                        >
                          <ThemedText
                            type="caption"
                            className={`font-bold ${
                              index === 0
                                ? "text-white"
                                : index === 1
                                ? "text-gray-600"
                                : index === 2
                                ? "text-white"
                                : "text-huntly-forest"
                            }`}
                          >
                            {index + 1}
                          </ThemedText>
                        </View>

                        {/* Team Icon */}
                        <View className="w-8 h-8 mr-3">
                          <Image
                            source={
                              getTeamImageSource(team.name) ||
                              require("@/assets/images/fox.png")
                            }
                            className="w-full h-full"
                            resizeMode="contain"
                          />
                        </View>

                        {/* Team Name */}
                        <ThemedText
                          type="defaultSemiBold"
                          className={`flex-1 ${
                            team.id === currentPlayer.team
                              ? "text-huntly-leaf"
                              : "text-huntly-forest"
                          }`}
                        >
                          {team.name}
                        </ThemedText>
                      </View>

                      {/* XP Display */}
                      <View className="flex-row items-center">
                        <ThemedText
                          type="body"
                          className="text-huntly-charcoal mr-2 font-semibold"
                        >
                          {team.team_xp} XP
                        </ThemedText>
                        {index === 0 && (
                          <View className="w-5 h-5 bg-yellow-400 rounded-full items-center justify-center">
                            <ThemedText className="text-xs font-bold">
                              🥇
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Team Activity Log */}
            <View className="px-6 pb-6">
              {/* Section Header */}
              <View className="mb-4">
                <ThemedText type="subtitle" className="text-huntly-forest">
                  Recent Activities
                </ThemedText>
              </View>

              {!teamInfo ? (
                <View className="bg-huntly-mint/20 rounded-2xl p-6 border border-huntly-mint/20">
                  <View className="flex-row items-center justify-center">
                    <View className="w-6 h-6 border-2 border-huntly-leaf border-t-transparent rounded-full animate-spin mr-3" />
                    <ThemedText type="body" className="text-huntly-charcoal">
                      Loading team information...
                    </ThemedText>
                  </View>
                </View>
              ) : (
                <View className="mt-2">
                  <TeamActivityLog
                    activities={teamActivities}
                    loading={loading}
                  />
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </BaseLayout>
  );
}
