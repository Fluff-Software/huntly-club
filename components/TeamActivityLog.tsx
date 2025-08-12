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

    if (activity.status === "completed") {
      return { text: `completed ${activityTitle}`, playerName, playerColor };
    } else if (activity.status === "started") {
      return { text: `started ${activityTitle}`, playerName, playerColor };
    }
    return { text: `is working on ${activityTitle}`, playerName, playerColor };
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center py-8">
        <ThemedText type="body" className="text-huntly-charcoal">
          Loading team activities...
        </ThemedText>
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View className="flex-1 justify-center items-center py-8">
        <View className="w-16 h-16 bg-huntly-mint rounded-full items-center justify-center mb-4">
          <ThemedText className="text-2xl">👥</ThemedText>
        </View>
        <ThemedText
          type="subtitle"
          className="text-huntly-forest text-center mb-2"
        >
          No team activities yet
        </ThemedText>
        <ThemedText type="body" className="text-huntly-charcoal text-center">
          Be the first to start an activity and inspire your team!
        </ThemedText>
      </View>
    );
  }

  // Calculate dynamic height based on number of activities
  const minHeight = 120; // Minimum height for 1-2 activities
  const maxHeight = 300; // Maximum height for scrolling
  const estimatedActivityHeight = 60; // Approximate height per activity
  const dynamicHeight = Math.min(
    Math.max(minHeight, activities.length * estimatedActivityHeight + 32), // +32 for padding
    maxHeight
  );

  return (
    <View
      className="border border-huntly-mint/30 rounded-2xl bg-white"
      style={{ height: dynamicHeight }}
    >
      <ScrollView
        showsVerticalScrollIndicator={activities.length > 3}
        contentContainerStyle={{ padding: 16 }}
      >
        <View>
          {activities.map((activity, index) => {
            const messageData = getActivityMessage(activity);
            return (
              <View key={activity.id}>
                <View className="py-2">
                  <View className="flex-row flex-wrap">
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
                  </View>
                  <ThemedText
                    type="caption"
                    className="text-huntly-charcoal/70"
                  >
                    {formatTimeAgo(
                      activity.completed_at || activity.started_at
                    )}
                  </ThemedText>
                </View>
                {index < activities.length - 1 && (
                  <View className="h-px bg-huntly-mint/20 my-2" />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};
