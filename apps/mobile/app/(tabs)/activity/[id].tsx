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
import { uploadUserActivityPhoto } from "@/services/storageService";
import { usePlayer } from "@/contexts/PlayerContext";
import { BadgePopupModal } from "@/components/BadgePopupModal";
import { Badge } from "@/services/badgeService";
import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system";

export default function ActivityDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { currentPlayer, refreshProfiles } = usePlayer();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof getCategories>>>([]);
  const [activityProgress, setActivityProgress] =
    useState<ActivityProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [showBadgePopup, setShowBadgePopup] = useState(false);
  const [earnedBadge, setEarnedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchActivity = async () => {
      try {
        if (!id || !currentPlayer?.id) return;
        const [activityData, categoriesList] = await Promise.all([
          getActivityById(Number(id)),
          getCategories(),
        ]);
        const progressData = await getActivityProgress(
          currentPlayer.id,
          Number(id)
        );

        if (isMounted) {
          setActivity(activityData);
          setCategories(categoriesList);
          setActivityProgress(progressData);

          // If activity hasn't been started yet, start it
          if (!progressData && activityData) {
            try {
              const startedProgress = await startActivity(
                currentPlayer.id,
                activityData.id
              );
              setActivityProgress(startedProgress);
            } catch (err) {
              console.error("Failed to start activity:", err);
            }
          }
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
  }, [id, currentPlayer?.id]);

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Sorry, we need camera roll permissions to upload photos for activities."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadedPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const uploadPhotoToStorage = async (
    photoUri: string
  ): Promise<string | null> => {
    if (!currentPlayer?.id) return null;

    try {
      const sourceFile = new File(photoUri);
      if (!sourceFile.exists) return null;

      const tempFileName = `temp_${Date.now()}.jpg`;
      const tempFile = new File(Paths.cache.uri + tempFileName);
      sourceFile.copy(tempFile);

      const fileName = `activity-${activity?.id}-${Date.now()}.jpg`;
      const fileObject = {
        uri: tempFile.uri,
        type: "image/jpeg",
        name: tempFileName,
      };

      const result = await uploadUserActivityPhoto(
        fileObject,
        fileName,
        currentPlayer.id.toString()
      );

      try {
        tempFile.delete();
      } catch {
        // ignore
      }

      return result.success && result.url ? result.url : null;
    } catch (error) {
      console.error("Photo upload error:", error);
      return null;
    }
  };

  const handleComplete = async () => {
    if (!currentPlayer?.id || !activity) return;
    if (activityProgress?.status === "completed") {
      Alert.alert("Already Completed", "This activity has already been completed!");
      return;
    }
    if (activity.photo_required && !uploadedPhoto) {
      Alert.alert("Photo Required", "Please upload a photo to complete this activity.");
      return;
    }

    setCompleting(true);
    try {
      let photoUrl: string | undefined;
      if (uploadedPhoto) {
        photoUrl = await uploadPhotoToStorage(uploadedPhoto) ?? undefined;
        if (activity.photo_required && !photoUrl) {
          Alert.alert("Upload Error", "Failed to upload photo. Please try again.");
          return;
        }
      }

      await completeActivityProgress(
        currentPlayer.id,
        activity.id,
        photoUrl
      );
      const result = await completeActivityService(activity.id, currentPlayer.id);

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

        {activity.long_description && (
          <View className="mb-6">
            <ThemedText type="defaultSemiBold" className="text-huntly-forest mb-3 text-lg">
              About This Activity
            </ThemedText>
            <ThemedText type="body" className="text-huntly-charcoal leading-6">
              {activity.long_description}
            </ThemedText>
          </View>
        )}

        {activity.hints && activity.hints.length > 0 && (
          <View className="mb-6">
            <ThemedText type="defaultSemiBold" className="text-huntly-forest mb-3 text-lg">
              💡 Hints
            </ThemedText>
            <View className="bg-huntly-sky/20 p-4 rounded-2xl">
              {Array.isArray(activity.hints) ? (
                activity.hints.map((hint, i) => (
                  <ThemedText
                    key={i}
                    type="body"
                    className="text-huntly-charcoal leading-6 mb-2 last:mb-0"
                  >
                    • {hint}
                  </ThemedText>
                ))
              ) : (
                <ThemedText type="body" className="text-huntly-charcoal leading-6">
                  {activity.hints}
                </ThemedText>
              )}
            </View>
          </View>
        )}

        {activity.tips && activity.tips.length > 0 && (
          <View className="mb-6">
            <ThemedText type="defaultSemiBold" className="text-huntly-forest mb-3 text-lg">
              🎯 Tips
            </ThemedText>
            <View className="bg-huntly-mint/20 p-4 rounded-2xl">
              {Array.isArray(activity.tips) ? (
                activity.tips.map((tip, i) => (
                  <ThemedText
                    key={i}
                    type="body"
                    className="text-huntly-charcoal leading-6 mb-2 last:mb-0"
                  >
                    • {tip}
                  </ThemedText>
                ))
              ) : (
                <ThemedText type="body" className="text-huntly-charcoal leading-6">
                  {activity.tips}
                </ThemedText>
              )}
            </View>
          </View>
        )}

        {activity.trivia && (
          <View className="mb-6">
            <ThemedText type="defaultSemiBold" className="text-huntly-forest mb-3 text-lg">
              🧠 Fun Fact
            </ThemedText>
            <View className="bg-huntly-sky/10 p-4 rounded-2xl border border-huntly-sky/30">
              <ThemedText type="body" className="text-huntly-charcoal leading-6 italic">
                {activity.trivia}
              </ThemedText>
            </View>
          </View>
        )}

        {activity.photo_required && (
          <View className="mb-6">
            <ThemedText type="defaultSemiBold" className="text-huntly-forest mb-3 text-lg">
              📸 Photo Required
            </ThemedText>
            <TouchableOpacity
              onPress={pickImage}
              className={`border-2 border-dashed rounded-2xl p-6 items-center justify-center ${
                uploadedPhoto ? "border-huntly-leaf bg-huntly-leaf/10" : "border-huntly-charcoal/30"
              }`}
            >
              {uploadedPhoto ? (
                <View className="items-center">
                  <Image
                    source={{ uri: uploadedPhoto as string }}
                    className="w-32 h-32 rounded-xl mb-3"
                    resizeMode="cover"
                  />
                  <ThemedText type="body" className="text-huntly-leaf font-semibold">
                    Photo uploaded! Tap to change
                  </ThemedText>
                </View>
              ) : (
                <View className="items-center">
                  <ThemedText className="text-4xl mb-2">📷</ThemedText>
                  <ThemedText type="body" className="text-huntly-charcoal text-center">
                    Tap to upload a photo{"\n"}for this activity
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View className="mb-6">
          <Button
            variant="primary"
            size="large"
            onPress={handleComplete}
            disabled={
              completing ||
              (activity.photo_required && !uploadedPhoto) ||
              activityProgress?.status === "completed"
            }
            className="w-full py-4"
          >
            {completing
              ? "Completing..."
              : activityProgress?.status === "completed"
              ? "✓ Completed"
              : "Complete Activity"}
          </Button>
          {activity.photo_required && !uploadedPhoto && (
            <ThemedText type="caption" className="text-huntly-charcoal/70 text-center mt-2">
              Please upload a photo to complete this activity
            </ThemedText>
          )}
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
