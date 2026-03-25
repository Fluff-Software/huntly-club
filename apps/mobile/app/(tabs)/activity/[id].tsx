import { View, ScrollView, Image, Alert, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { Button } from "@/components/ui/Button";
import { CategoryTags } from "@/components/CategoryTags";
import { getActivityById, getActivityImageSource } from "@/services/packService";
import { getCategories, getCategoryById } from "@/services/categoriesService";
import type { Activity } from "@/types/activity";
import { completeActivity as completeActivityService } from "@/services/activityService";
import {
  getActivityProgress,
  startActivity,
  completeActivity as completeActivityProgress,
  ActivityProgress,
} from "@/services/activityProgressService";
import { usePlayer } from "@/contexts/PlayerContext";
import type { Profile } from "@/services/profileService";
import { BadgePopupModal } from "@/components/BadgePopupModal";
import { Badge } from "@/services/badgeService";

export default function ActivityDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { profiles, refreshProfiles } = usePlayer();
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof getCategories>>>([]);
  const [activityProgress, setActivityProgress] =
    useState<ActivityProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [showBadgePopup, setShowBadgePopup] = useState(false);
  const [earnedBadge, setEarnedBadge] = useState<Badge | null>(null);

  // Keep selected profile in sync with profiles list (default to first profile)
  useEffect(() => {
    if (profiles.length === 0) {
      setSelectedProfileId(null);
      return;
    }
    setSelectedProfileId((prev) => {
      if (prev != null && profiles.some((p) => p.id === prev)) return prev;
      return profiles[0]?.id ?? null;
    });
  }, [profiles]);

  useEffect(() => {
    let isMounted = true;

    const fetchActivity = async () => {
      try {
        if (!id) return;
        const [activityData, categoriesList] = await Promise.all([
          getActivityById(Number(id)),
          getCategories(),
        ]);

        if (isMounted) {
          setActivity(activityData);
          setCategories(categoriesList);
        }

        // Load progress (and start activity) only for the selected profile
        if (selectedProfileId != null && activityData) {
          let progressData: ActivityProgress | null = null;
          try {
            progressData = await getActivityProgress(selectedProfileId, Number(id));
            if (isMounted) setActivityProgress(progressData);
            if (!progressData && isMounted) {
              const startedProgress = await startActivity(selectedProfileId, activityData.id);
              if (isMounted) setActivityProgress(startedProgress);
            }
          } catch (err) {
            console.error("Failed to load/start activity progress:", err);
            if (isMounted) setActivityProgress(null);
          }
        } else {
          if (isMounted) setActivityProgress(null);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load activity");
        }
        console.error(err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchActivity();

    return () => {
      isMounted = false;
    };
  }, [id, selectedProfileId]);

  const handleComplete = async () => {
    if (selectedProfileId == null || !activity) {
      Alert.alert("Select an explorer", "Choose an explorer above to complete this activity.");
      return;
    }
    if (activityProgress?.status === "completed") {
      Alert.alert("Already Completed", "This activity has already been completed for the selected explorer!");
      return;
    }

    setCompleting(true);
    try {
      await completeActivityProgress(
        selectedProfileId,
        activity.id,
        undefined
      );
      const result = await completeActivityService(activity.id, selectedProfileId);

      if (result.success) {
        setActivityProgress((prev) =>
          prev ? { ...prev, status: "completed" as const } : null
        );
        await refreshProfiles();

        if (result.newBadges && result.newBadges.length > 0) {
          setEarnedBadge(result.newBadges[0]);
          setShowBadgePopup(true);
        } else {
          Alert.alert(
            "Activity Completed!",
            `Congratulations! You earned ${result.xpGained} XP and your team earned ${result.teamXpGained} XP!`,
            [{ text: "Continue", onPress: () => router.back() }]
          );
        }
      }
    } catch (err) {
      console.error("Failed to complete activity:", err);
      Alert.alert(
        "Error",
        `Failed to complete activity: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <BaseLayout>
        <ThemedView className="flex-1 justify-center items-center">
          <ThemedText type="defaultSemiBold">Loading your mission…</ThemedText>
        </ThemedView>
      </BaseLayout>
    );
  }

  if (error || !activity) {
    return (
      <BaseLayout>
        <ThemedView className="flex-1 justify-center items-center">
          <ThemedText type="defaultSemiBold" className="text-red-500">
            {error || "Activity not found"}
          </ThemedText>
        </ThemedView>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
        <View className="mb-6">
          <ThemedText type="title" className="text-huntly-forest mb-3">
            {activity.title}
          </ThemedText>
          <View className="bg-huntly-leaf px-4 py-2 rounded-full self-start mb-4">
            <ThemedText type="caption" className="text-white font-bold text-sm">
              +{activity.xp} XP
            </ThemedText>
          </View>
          {profiles.length > 0 && (
            <View className="mb-4">
              <ThemedText type="defaultSemiBold" className="text-huntly-charcoal mb-2 text-sm">
                Complete as
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexDirection: "row", gap: 8 }}
              >
                {profiles.map((profile: Profile) => (
                  <TouchableOpacity
                    key={profile.id}
                    onPress={() => setSelectedProfileId(profile.id)}
                    className={`px-4 py-2 rounded-full border-2 ${
                      selectedProfileId === profile.id
                        ? "bg-huntly-leaf border-huntly-leaf"
                        : "bg-transparent border-huntly-charcoal/30"
                    }`}
                  >
                    <ThemedText
                      type="caption"
                      className={selectedProfileId === profile.id ? "text-white font-bold" : "text-huntly-charcoal"}
                    >
                      {profile.nickname || profile.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {profiles.length === 0 && (
            <ThemedText type="caption" className="text-huntly-charcoal/70 mb-4">
              Add an explorer in Profile to complete activities.
            </ThemedText>
          )}
          {activity.categories && activity.categories.length > 0 && (
            <View className="mb-4">
              <CategoryTags
                categoryInfos={activity.categories
                  .map((cid) => getCategoryById(categories, cid))
                  .filter((c): c is NonNullable<typeof c> => c != null)
                  .map((c) => ({ id: c.id, name: c.name, icon: c.icon }))}
                size="medium"
                maxDisplay={5}
              />
            </View>
          )}
        </View>

        {activity.image && (
          <View className="mb-6">
            <Image
              source={getActivityImageSource(activity.image) ?? undefined}
              className="w-full h-48 rounded-2xl"
              resizeMode="cover"
            />
          </View>
        )}

        <View className="mb-6">
          <Button
            variant="primary"
            size="large"
            onPress={handleComplete}
            disabled={
              completing ||
              selectedProfileId == null ||
              activityProgress?.status === "completed"
            }
            className="w-full py-4"
          >
            {completing
              ? "Completing..."
              : selectedProfileId == null
              ? "Select an explorer to complete"
              : activityProgress?.status === "completed"
              ? "✓ Completed"
              : "Complete Activity"}
          </Button>
        </View>

        <View className="h-6" />
      </ScrollView>

      <BadgePopupModal
        visible={showBadgePopup}
        badge={earnedBadge}
        onClose={() => {
          setShowBadgePopup(false);
          setEarnedBadge(null);
          router.back();
        }}
        onViewAllBadges={() => {
          setShowBadgePopup(false);
          setEarnedBadge(null);
          router.push("/");
        }}
      />
    </BaseLayout>
  );
}
