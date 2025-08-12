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
    if (!currentPlayer?.team) return;

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

  return (
    <BaseLayout>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="p-6 pb-4">
          <View className="flex-row items-center mb-4">
            {teamInfo && (
              <>
                <Image
                  source={
                    getTeamImageSource(teamInfo.name) ||
                    require("@/assets/images/fox.png")
                  }
                  className="w-12 h-12 mr-3"
                  resizeMode="contain"
                />
                <View className="flex-1">
                  <ThemedText type="title" className="text-huntly-forest">
                    Team Activities
                  </ThemedText>
                  <ThemedText type="subtitle" className="text-huntly-charcoal">
                    See what your teammates are up to
                  </ThemedText>
                </View>
              </>
            )}
          </View>

          {/* Team XP Display */}
          {teamInfo && (
            <View className="bg-huntly-mint rounded-xl p-4 mb-4">
              <ThemedText type="subtitle" className="text-huntly-forest mb-2">
                Team XP: {teamInfo.team_xp}
              </ThemedText>
              <ThemedText type="caption" className="text-huntly-charcoal">
                Complete activities to earn XP for your team!
              </ThemedText>
            </View>
          )}

          {/* Team Rankings */}
          {allTeams.length > 0 && (
            <View className="bg-white rounded-xl p-4 mb-4 border border-huntly-mint/30">
              <ThemedText type="subtitle" className="text-huntly-forest mb-3">
                Team Rankings
              </ThemedText>
              {allTeams.map((team, index) => (
                <View
                  key={team.id}
                  className={`flex-row items-center justify-between py-2 ${
                    index < allTeams.length - 1
                      ? "border-b border-huntly-mint/20"
                      : ""
                  }`}
                >
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 mr-3">
                      <Image
                        source={
                          getTeamImageSource(team.name) ||
                          require("@/assets/images/fox.png")
                        }
                        className="w-full h-full"
                        resizeMode="contain"
                      />
                    </View>
                    <ThemedText
                      type="defaultSemiBold"
                      className={`${
                        team.id === currentPlayer.team
                          ? "text-huntly-leaf"
                          : "text-huntly-forest"
                      }`}
                    >
                      {team.name}
                    </ThemedText>
                  </View>
                  <View className="flex-row items-center">
                    <ThemedText
                      type="body"
                      className="text-huntly-charcoal mr-2"
                    >
                      {team.team_xp} XP
                    </ThemedText>
                    {index === 0 && (
                      <View className="w-4 h-4 bg-yellow-400 rounded-full items-center justify-center">
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
          {error ? (
            <View className="bg-red-50 rounded-xl p-4 border border-red-200">
              <ThemedText type="body" className="text-red-600 text-center">
                {error}
              </ThemedText>
            </View>
          ) : (
            <TeamActivityLog activities={teamActivities} loading={loading} />
          )}
        </View>
      </ScrollView>
    </BaseLayout>
  );
}
