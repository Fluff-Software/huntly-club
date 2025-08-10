import { Pressable, View, ScrollView, Image, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { Button } from "@/components/ui/Button";
import { getPackById, Pack, Activity } from "@/services/packService";
import { completeActivity } from "@/services/activityService";
import { usePlayer } from "@/contexts/PlayerContext";

export default function PackDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { currentPlayer, refreshProfiles } = usePlayer();
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPack = async () => {
      try {
        if (!id) return;
        const packData = await getPackById(Number(id));
        if (isMounted) {
          setPack(packData);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load pack");
        }
        console.error(err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPack();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleActivityPress = async (activity: Activity) => {
    if (!currentPlayer?.id) {
      console.error("No current player");
      return;
    }

    try {
      const result = await completeActivity(activity.id, currentPlayer.id);
      if (result.success) {
        // Refresh profiles to update XP in the UI
        await refreshProfiles();

        Alert.alert(
          "Activity Completed!",
          `Congratulations! You earned ${result.xpGained} XP!`,
          [{ text: "Continue" }]
        );
      }
    } catch (err) {
      console.error("Failed to complete activity:", err);
      Alert.alert("Error", "Failed to complete activity");
    }
  };

  if (loading) {
    return (
      <BaseLayout>
        <ThemedView className="flex-1 justify-center items-center">
          <ThemedText type="defaultSemiBold">Loading pack...</ThemedText>
        </ThemedView>
      </BaseLayout>
    );
  }

  if (error || !pack) {
    return (
      <BaseLayout>
        <ThemedView className="flex-1 justify-center items-center">
          <ThemedText type="defaultSemiBold" className="text-red-500">
            {error || "Pack not found"}
          </ThemedText>
        </ThemedView>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="mb-8">
          <ThemedText type="title" className="text-huntly-forest mb-3">
            {pack.name}
          </ThemedText>
          <ThemedText type="body" className="text-huntly-charcoal leading-6">
            Complete all activities to earn XP and progress!
          </ThemedText>
        </View>

        {/* Activities Section */}
        <View>
          {pack.activities.map(
            (activity, index) =>
              activity && (
                <Pressable
                  key={activity.id}
                  className={`bg-white rounded-2xl overflow-hidden shadow-soft border border-huntly-mint/20 ${
                    index < pack.activities.length - 1 ? "mb-8" : ""
                  }`}
                  onPress={() => handleActivityPress(activity)}
                >
                  <View className="p-6">
                    <View className="flex-row items-start">
                      {/* Activity Icon/Image */}
                      <View className="mr-5">
                        {activity.image ? (
                          <Image
                            source={{ uri: activity.image }}
                            className="w-20 h-20 rounded-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-20 h-20 rounded-full bg-huntly-sky items-center justify-center">
                            <ThemedText className="text-2xl">📋</ThemedText>
                          </View>
                        )}
                      </View>

                      {/* Activity Content */}
                      <View className="flex-1">
                        {/* Title and XP Badge */}
                        <View className="flex-row items-start justify-between mb-3">
                          <ThemedText
                            type="defaultSemiBold"
                            className="text-huntly-forest text-lg flex-1 mr-3"
                          >
                            {activity.title}
                          </ThemedText>
                          <View className="bg-huntly-leaf px-4 py-2 rounded-full shadow-sm">
                            <ThemedText
                              type="caption"
                              className="text-white font-bold text-sm"
                            >
                              +{activity.xp} XP
                            </ThemedText>
                          </View>
                        </View>

                        {/* Description */}
                        <ThemedText
                          type="body"
                          className="text-huntly-charcoal mb-4 leading-6"
                        >
                          {activity.description}
                        </ThemedText>

                        {/* Activity Number Badge and Complete Button */}
                        <View className="flex-row items-center justify-between mt-4">
                          <View className="bg-huntly-sky px-4 py-2 rounded-full">
                            <ThemedText
                              type="caption"
                              className="text-huntly-forest font-bold text-sm"
                            >
                              Activity {index + 1}
                            </ThemedText>
                          </View>

                          <Button
                            variant="primary"
                            size="medium"
                            onPress={() => handleActivityPress(activity)}
                            className="px-6 py-3"
                          >
                            Complete
                          </Button>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              )
          )}
        </View>

        {/* Bottom Spacing */}
        <View className="h-6" />
      </ScrollView>
    </BaseLayout>
  );
}
