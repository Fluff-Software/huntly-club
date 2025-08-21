import { Pressable, View, ScrollView, Image } from "react-native";
import { useEffect, useState, useCallback } from "react";
import {
  useLocalSearchParams,
  useRouter,
  Link,
  useFocusEffect,
} from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { CategoryTags } from "@/components/CategoryTags";
import {
  getPackById,
  Pack,
  Activity,
  getActivityImageSource,
} from "@/services/packService";
import {
  getActivityProgressForPack,
  ActivityProgress,
  ActivityStatus,
} from "@/services/activityProgressService";
import { usePlayer } from "@/contexts/PlayerContext";

export default function PackDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { currentPlayer, refreshProfiles } = usePlayer();
  const [pack, setPack] = useState<Pack | null>(null);
  const [activityProgress, setActivityProgress] = useState<ActivityProgress[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPack = async () => {
      try {
        if (!id || !currentPlayer?.id) return;
        const packData = await getPackById(Number(id));
        const progressData = await getActivityProgressForPack(
          currentPlayer.id,
          Number(id)
        );

        if (isMounted) {
          setPack(packData);
          setActivityProgress(progressData);
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
  }, [id, currentPlayer?.id]);

  // Refresh activity progress when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (currentPlayer?.id && id) {
        const refreshProgress = async () => {
          try {
            const progressData = await getActivityProgressForPack(
              currentPlayer.id,
              Number(id)
            );
            setActivityProgress(progressData);
          } catch (err) {
            console.error("Failed to refresh activity progress:", err);
          }
        };
        refreshProgress();
      }
    }, [currentPlayer?.id, id])
  );

  const getActivityStatus = (activityId: number): ActivityStatus => {
    const progress = activityProgress.find((p) => p.activity_id === activityId);
    return progress?.status || "not_started";
  };

  const getStatusColor = (status: ActivityStatus) => {
    switch (status) {
      case "completed":
        return "bg-huntly-leaf";
      case "started":
        return "bg-huntly-sky";
      default:
        return "bg-huntly-charcoal/30";
    }
  };

  const getStatusText = (status: ActivityStatus) => {
    switch (status) {
      case "completed":
        return "✓ Completed";
      case "started":
        return "▶ Started";
      default:
        return "○ Not Started";
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
                <Link
                  key={activity.id}
                  href={`/pack/activity/${activity.id}`}
                  asChild
                >
                  <Pressable
                    className={`bg-white rounded-2xl overflow-hidden shadow-soft border border-huntly-mint/20 ${
                      index < pack.activities.length - 1 ? "mb-8" : ""
                    }`}
                  >
                    <View className="p-6">
                      <View className="flex-row items-start">
                        {/* Activity Icon/Image */}
                        <View className="mr-5">
                          {activity.image ? (
                            <Image
                              source={getActivityImageSource(activity.image)}
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

                          {/* Status Badge */}
                          <View
                            className={`${getStatusColor(
                              getActivityStatus(activity.id)
                            )} px-3 py-1 rounded-full self-start mb-3`}
                          >
                            <ThemedText
                              type="caption"
                              className={`font-semibold text-sm ${
                                getActivityStatus(activity.id) === "completed"
                                  ? "text-white"
                                  : getActivityStatus(activity.id) === "started"
                                  ? "text-huntly-forest"
                                  : "text-huntly-charcoal"
                              }`}
                            >
                              {getStatusText(getActivityStatus(activity.id))}
                            </ThemedText>
                          </View>

                          {/* Description */}
                          <ThemedText
                            type="body"
                            className="text-huntly-charcoal mb-3 leading-6"
                          >
                            {activity.description}
                          </ThemedText>

                          {/* Category Tags */}
                          {activity.categories &&
                            activity.categories.length > 0 && (
                              <CategoryTags
                                categories={activity.categories}
                                size="small"
                                maxDisplay={3}
                              />
                            )}
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </Link>
              )
          )}
        </View>

        {/* Bottom Spacing */}
        <View className="h-6" />
      </ScrollView>
    </BaseLayout>
  );
}
