import React from "react";
import { View, ScrollView } from "react-native";
import { ThemedText } from "./ThemedText";
import { TeamActivityLogEntry } from "@/services/teamActivityService";

interface TeamActivityLogProps {
  activities: TeamActivityLogEntry[];
  loading?: boolean;
}

export const TeamActivityLog: React.FC<TeamActivityLogProps> = ({
  activities,
  loading = false,
}) => {
  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getActivityMessage = (activity: TeamActivityLogEntry) => {
    const playerName = activity.profile.nickname || activity.profile.name;
    const activityTitle = activity.activity.title;
    const playerColor = activity.profile.colour;
    const teamXpGained = Math.floor(activity.activity.xp * 0.5); // Team gets 50% of individual XP

    if (activity.status === "completed") {
      return {
        text: `completed ${activityTitle}`,
        playerName,
        playerColor,
        teamXpGained,
      };
    } else if (activity.status === "started") {
      return {
        text: `started ${activityTitle}`,
        playerName,
        playerColor,
        teamXpGained: 0,
      };
    }
    return {
      text: `is working on ${activityTitle}`,
      playerName,
      playerColor,
      teamXpGained: 0,
    };
  };

  const getActivityIcon = (activityTitle: string) => {
    const title = activityTitle.toLowerCase();
    if (title.includes("bird")) return "🐦";
    if (title.includes("photo") || title.includes("photography")) return "📸";
    if (title.includes("outdoor") || title.includes("exploration")) return "🏕️";
    if (title.includes("nature")) return "🌿";
    if (title.includes("water") || title.includes("river")) return "💧";
    if (title.includes("hike") || title.includes("trail")) return "🥾";
    return "🎯";
  };

  if (loading) {
    return (
      <View className="bg-white rounded-2xl p-8 shadow-soft border border-huntly-mint/20">
        <View className="flex-row items-center justify-center">
          <View className="w-6 h-6 border-2 border-huntly-leaf border-t-transparent rounded-full animate-spin mr-3" />
          <ThemedText type="body" className="text-huntly-charcoal">
            Loading team activities...
          </ThemedText>
        </View>
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View className="bg-white rounded-2xl p-8 shadow-soft border border-huntly-mint/20">
        <View className="flex-1 justify-center items-center">
          <View className="w-20 h-20 bg-gradient-to-br from-huntly-mint to-huntly-sage rounded-full items-center justify-center mb-6">
            <ThemedText className="text-3xl">👥</ThemedText>
          </View>
          <ThemedText
            type="subtitle"
            className="text-huntly-forest text-center mb-3"
          >
            No team activities yet
          </ThemedText>
          <ThemedText type="body" className="text-huntly-charcoal text-center">
            Be the first to start an activity and inspire your team!
          </ThemedText>
        </View>
      </View>
    );
  }

  // Calculate dynamic height based on number of activities
  const minHeight = 120; // Minimum height for 1-2 activities
  const maxHeight = 400; // Maximum height for scrolling
  const estimatedActivityHeight = 80; // Approximate height per activity
  const dynamicHeight = Math.min(
    Math.max(minHeight, activities.length * estimatedActivityHeight + 32), // +32 for padding
    maxHeight
  );

  return (
    <View
      className="bg-white rounded-2xl shadow-soft border border-huntly-mint/20"
      style={{ height: dynamicHeight }}
    >
      <ScrollView
        showsVerticalScrollIndicator={activities.length > 3}
        contentContainerStyle={{ padding: 16 }}
        className="flex-1"
      >
        <View>
          {activities.map((activity, index) => {
            const messageData = getActivityMessage(activity);
            const activityIcon = getActivityIcon(activity.activity.title);

            return (
              <View key={activity.id}>
                <View className="flex-row items-start py-3">
                  {/* Activity Icon */}
                  <View className="w-10 h-10 bg-huntly-mint/30 rounded-full items-center justify-center mr-3 mt-1">
                    <ThemedText className="text-lg">{activityIcon}</ThemedText>
                  </View>

                  {/* Activity Content */}
                  <View className="flex-1">
                    <View className="flex-row flex-wrap items-center mb-2">
                      <ThemedText
                        type="defaultSemiBold"
                        className="text-huntly-forest"
                        style={{ color: messageData.playerColor }}
                      >
                        {messageData.playerName}
                      </ThemedText>
                      <ThemedText
                        type="defaultSemiBold"
                        className="text-huntly-forest ml-1"
                      >
                        {messageData.text}
                      </ThemedText>
                      {messageData.teamXpGained > 0 && (
                        <View className="ml-2 bg-gradient-to-r from-huntly-leaf to-huntly-sage px-3 py-1 rounded-full shadow-sm">
                          <ThemedText
                            type="caption"
                            className="text-white font-bold"
                          >
                            +{messageData.teamXpGained} team XP
                          </ThemedText>
                        </View>
                      )}
                    </View>

                    {/* Time and Status */}
                    <View className="flex-row items-center">
                      <ThemedText
                        type="caption"
                        className="text-huntly-charcoal/70 mr-3"
                      >
                        {formatTimeAgo(
                          activity.completed_at || activity.started_at
                        )}
                      </ThemedText>

                      {/* Status Indicator */}
                      <View
                        className={`px-2 py-1 rounded-full ${
                          activity.status === "completed"
                            ? "bg-green-100"
                            : "bg-blue-100"
                        }`}
                      >
                        <ThemedText
                          type="caption"
                          className={`font-semibold ${
                            activity.status === "completed"
                              ? "text-green-700"
                              : "text-blue-700"
                          }`}
                        >
                          {activity.status === "completed"
                            ? "✅ Completed"
                            : "🔄 Started"}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Separator */}
                {index < activities.length - 1 && (
                  <View className="h-px bg-gradient-to-r from-transparent via-huntly-mint/30 to-transparent my-2" />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};
