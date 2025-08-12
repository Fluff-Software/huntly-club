import { View, ScrollView, Image, Alert, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { Button } from "@/components/ui/Button";
import {
  getActivityById,
  Activity,
  getActivityImageSource,
} from "@/services/packService";
import { completeActivity as completeActivityService } from "@/services/activityService";
import {
  getActivityProgress,
  startActivity,
  completeActivity as completeActivityProgress,
  ActivityProgress,
} from "@/services/activityProgressService";
import { uploadActivityImage } from "@/services/storageService";
import { usePlayer } from "@/contexts/PlayerContext";

export default function ActivityDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { currentPlayer, refreshProfiles } = usePlayer();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [activityProgress, setActivityProgress] =
    useState<ActivityProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchActivity = async () => {
      try {
        if (!id || !currentPlayer?.id) return;
        const activityData = await getActivityById(Number(id));
        const progressData = await getActivityProgress(
          currentPlayer.id,
          Number(id)
        );

        if (isMounted) {
          setActivity(activityData);
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
    // Temporarily disabled - will be re-enabled once expo-image-picker is properly configured
    Alert.alert(
      "Photo Upload",
      "Photo upload functionality will be available soon!"
    );
    setUploadedPhoto("placeholder-photo");
  };

  const uploadPhotoToStorage = async (
    photoUri: string
  ): Promise<string | null> => {
    if (!currentPlayer?.id) return null;

    try {
      // Convert URI to blob
      const response = await fetch(photoUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const fileName = `activity-${activity?.id}-${Date.now()}.jpg`;
      const result = await uploadActivityImage(
        blob,
        fileName,
        currentPlayer.id.toString()
      );

      if (result.success && result.url) {
        return result.url;
      } else {
        console.error("Upload failed:", result.error);
        return null;
      }
    } catch (error) {
      console.error("Photo upload error:", error);
      return null;
    }
  };

  const handleComplete = async () => {
    if (!currentPlayer?.id || !activity) {
      console.error("No current player or activity");
      return;
    }

    // Check if activity is already completed
    if (activityProgress?.status === "completed") {
      Alert.alert(
        "Already Completed",
        "This activity has already been completed!"
      );
      return;
    }

    // Check if photo is required but not uploaded
    if (activity.photo_required && !uploadedPhoto) {
      Alert.alert(
        "Photo Required",
        "Please upload a photo to complete this activity."
      );
      return;
    }

    setCompleting(true);

    try {
      console.log("Starting activity completion for activity:", activity.id);

      // Upload photo to storage if provided
      let photoUrl: string | undefined;
      if (uploadedPhoto && uploadedPhoto !== "placeholder-photo") {
        photoUrl = await uploadPhotoToStorage(uploadedPhoto);
        if (!photoUrl) {
          Alert.alert(
            "Upload Error",
            "Failed to upload photo. Please try again."
          );
          return;
        }
      }

      // First, update the activity progress status
      const progressResult = await completeActivityProgress(
        currentPlayer.id,
        activity.id,
        photoUrl
      );
      console.log("Activity progress updated:", progressResult);

      // Then, award XP using the activity service
      const result = await completeActivityService(
        activity.id,
        currentPlayer.id
      );
      console.log("XP awarded:", result);

      if (result.success) {
        // Update local state to reflect completion
        setActivityProgress((prev) =>
          prev ? { ...prev, status: "completed" as const } : null
        );

        // Refresh profiles to update XP in the UI
        await refreshProfiles();

        Alert.alert(
          "Activity Completed!",
          `Congratulations! You earned ${result.xpGained} XP!`,
          [{ text: "Continue", onPress: () => router.back() }]
        );
      }
    } catch (err) {
      console.error("Failed to complete activity:", err);
      Alert.alert(
        "Error",
        `Failed to complete activity: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <BaseLayout>
        <ThemedView className="flex-1 justify-center items-center">
          <ThemedText type="defaultSemiBold">Loading activity...</ThemedText>
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
      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="mb-6">
          <ThemedText type="title" className="text-huntly-forest mb-3">
            {activity.title}
          </ThemedText>

          {/* XP Badge */}
          <View className="bg-huntly-leaf px-4 py-2 rounded-full self-start mb-4">
            <ThemedText type="caption" className="text-white font-bold text-sm">
              +{activity.xp} XP
            </ThemedText>
          </View>
        </View>

        {/* Activity Image */}
        {activity.image && (
          <View className="mb-6">
            <Image
              source={getActivityImageSource(activity.image)}
              className="w-full h-48 rounded-2xl"
              resizeMode="cover"
            />
          </View>
        )}

        {/* Long Description */}
        {activity.long_description && (
          <View className="mb-6">
            <ThemedText
              type="defaultSemiBold"
              className="text-huntly-forest mb-3 text-lg"
            >
              About This Activity
            </ThemedText>
            <ThemedText type="body" className="text-huntly-charcoal leading-6">
              {activity.long_description}
            </ThemedText>
          </View>
        )}

        {/* Hints Section */}
        {activity.hints && (
          <View className="mb-6">
            <ThemedText
              type="defaultSemiBold"
              className="text-huntly-forest mb-3 text-lg"
            >
              💡 Hints
            </ThemedText>
            <View className="bg-huntly-sky/20 p-4 rounded-2xl">
              <ThemedText
                type="body"
                className="text-huntly-charcoal leading-6"
              >
                {activity.hints}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Tips Section */}
        {activity.tips && (
          <View className="mb-6">
            <ThemedText
              type="defaultSemiBold"
              className="text-huntly-forest mb-3 text-lg"
            >
              🎯 Tips
            </ThemedText>
            <View className="bg-huntly-mint/20 p-4 rounded-2xl">
              <ThemedText
                type="body"
                className="text-huntly-charcoal leading-6"
              >
                {activity.tips}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Trivia Section */}
        {activity.trivia && (
          <View className="mb-6">
            <ThemedText
              type="defaultSemiBold"
              className="text-huntly-forest mb-3 text-lg"
            >
              🧠 Fun Fact
            </ThemedText>
            <View className="bg-huntly-sky/10 p-4 rounded-2xl border border-huntly-sky/30">
              <ThemedText
                type="body"
                className="text-huntly-charcoal leading-6 italic"
              >
                {activity.trivia}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Photo Upload Section */}
        {activity.photo_required && (
          <View className="mb-6">
            <ThemedText
              type="defaultSemiBold"
              className="text-huntly-forest mb-3 text-lg"
            >
              📸 Photo Required
            </ThemedText>
            <TouchableOpacity
              onPress={pickImage}
              className={`border-2 border-dashed rounded-2xl p-6 items-center justify-center ${
                uploadedPhoto
                  ? "border-huntly-leaf bg-huntly-leaf/10"
                  : "border-huntly-charcoal/30"
              }`}
            >
              {uploadedPhoto ? (
                <View className="items-center">
                  {uploadedPhoto === "placeholder-photo" ? (
                    <View className="w-32 h-32 rounded-xl mb-3 bg-huntly-leaf/20 items-center justify-center">
                      <ThemedText className="text-4xl">📷</ThemedText>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: uploadedPhoto }}
                      className="w-32 h-32 rounded-xl mb-3"
                      resizeMode="cover"
                    />
                  )}
                  <ThemedText
                    type="body"
                    className="text-huntly-leaf font-semibold"
                  >
                    Photo uploaded! Tap to change
                  </ThemedText>
                </View>
              ) : (
                <View className="items-center">
                  <ThemedText className="text-4xl mb-2">📷</ThemedText>
                  <ThemedText
                    type="body"
                    className="text-huntly-charcoal text-center"
                  >
                    Tap to upload a photo{"\n"}for this activity
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Complete Button */}
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
            <ThemedText
              type="caption"
              className="text-huntly-charcoal/70 text-center mt-2"
            >
              Please upload a photo to complete this activity
            </ThemedText>
          )}
        </View>

        {/* Bottom Spacing */}
        <View className="h-6" />
      </ScrollView>
    </BaseLayout>
  );
}
