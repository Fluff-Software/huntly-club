import { View, ScrollView, RefreshControl, Image } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useColorScheme } from "@/hooks/useColorScheme";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { ThemedText } from "@/components/ThemedText";
import { TeamActivityLog } from "@/components/TeamActivityLog";
import {
  getTeamActivityLogs,
  TeamActivityLogEntry,
} from "@/services/teamActivityService";
import { usePlayer } from "@/contexts/PlayerContext";
import { getTeamImageSource } from "@/utils/teamUtils";
import { getTeamById } from "@/services/profileService";

export default function SocialScreen() {
  const colorScheme = useColorScheme();
  const { currentPlayer } = usePlayer();
  const [teamActivities, setTeamActivities] = useState<TeamActivityLogEntry[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamInfo, setTeamInfo] = useState<{
    id: number;
    name: string;
    colour: string | null;
  } | null>(null);

  const fetchTeamActivities = useCallback(async () => {
    if (!currentPlayer?.team) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [activities, team] = await Promise.all([
        getTeamActivityLogs(currentPlayer.team, 50),
        getTeamById(currentPlayer.team),
      ]);
      setTeamActivities(activities);
      setTeamInfo(team);
    } catch (err) {
      console.error("Error fetching team activities:", err);
      setError("Failed to load team activities");
    } finally {
      setLoading(false);
    }
  }, [currentPlayer?.team]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTeamActivities();
    setRefreshing(false);
  }, [fetchTeamActivities]);

  useEffect(() => {
    fetchTeamActivities();
  }, [fetchTeamActivities]);

  if (!currentPlayer) {
    return (
      <BaseLayout className="bg-huntly-cream">
        <View className="flex-1 items-center justify-center p-8">
          <ThemedText type="body" className="text-huntly-charcoal text-center">
            Please select a profile to view team activities
          </ThemedText>
        </View>
      </BaseLayout>
    );
  }

  const teamImage = teamInfo ? getTeamImageSource(teamInfo.name) : null;

  return (
    <BaseLayout className="bg-huntly-cream">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="p-6 pb-4">
          <View className="flex-row items-center mb-4">
            {teamImage ? (
              <View className="w-12 h-12 mr-3">
                <Image
                  source={teamImage}
                  className="w-full h-full"
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View
                className="w-12 h-12 rounded-full mr-3"
                style={{
                  backgroundColor: teamInfo?.colour || currentPlayer.colour,
                }}
              />
            )}
            <View className="flex-1">
              <ThemedText type="title" className="text-huntly-forest">
                Team Activities
              </ThemedText>
              <ThemedText type="body" className="text-huntly-charcoal">
                See what your teammates are up to
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Team Activity Log */}
        <View className="px-6 pb-6">
          {error ? (
            <View className="flex-1 justify-center items-center py-8">
              <ThemedText type="body" className="text-red-500 text-center mb-4">
                {error}
              </ThemedText>
              <ThemedText
                type="body"
                className="text-huntly-charcoal text-center"
              >
                Pull down to refresh
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
