import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  Text,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  Dimensions,
  Platform,
  TouchableOpacity,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { usePlayer } from "@/contexts/PlayerContext";
import { getActivityById } from "@/services/packService";
import {
  ensureProgressRows,
  insertUserActivityPhotos,
  insertUserAchievementsForMission,
} from "@/services/activityProgressService";
import { uploadUserActivityPhoto } from "@/services/storageService";
import type { Activity } from "@/types/activity";
import { File, Paths } from "expo-file-system";

const TEXT_SECONDARY = "#2F3336";
const LIGHT_GREEN = "#7FAF8A";
const CREAM = "#F6F5F1";
const CARD_BAR_BLUE = "#87CEEB";
const CARD_BAR_GREEN = "#98D8A8";

const GALLERY_ICON = require("@/assets/images/gallery.png");
const CAMERA_ICON = require("@/assets/images/camera.png");

const EXPAND_DURATION = 500;
const TIMING_EASING = Easing.out(Easing.cubic);

function ExpandableSection({
  isSelected,
  children,
}: {
  isSelected: boolean;
  children: React.ReactNode;
}) {
  const height = useSharedValue(0);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isSelected) {
      setShowContent(true);
      if (measuredHeight > 0) {
        height.value = withTiming(measuredHeight, {
          duration: EXPAND_DURATION,
          easing: TIMING_EASING,
        });
      }
    } else {
      height.value = withTiming(
        0,
        { duration: EXPAND_DURATION, easing: TIMING_EASING },
        (finished) => {
          if (finished) {
            runOnJS(setShowContent)(false);
          }
        }
      );
    }
  }, [isSelected, measuredHeight, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    overflow: "hidden" as const,
  }));

  return (
    <Animated.View style={animatedStyle}>
      {showContent ? (
        <View onLayout={(e) => setMeasuredHeight(e.nativeEvent.layout.height)}>
          {children}
        </View>
      ) : (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            opacity: 0,
            zIndex: -1,
          }}
          onLayout={(e) => setMeasuredHeight(e.nativeEvent.layout.height)}
          pointerEvents="none"
        >
          {children}
        </View>
      )}
    </Animated.View>
  );
}

export default function CompletionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { scaleW } = useLayoutScale();
  const { profiles } = usePlayer();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [playerPhotos, setPlayerPhotos] = useState<Record<number, string[]>>({});
  const [galleryPlayerId, setGalleryPlayerId] = useState<number | null>(null);
  const [galleryModalVisible, setGalleryModalVisible] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [fullScreenPhotoIndex, setFullScreenPhotoIndex] = useState<
    number | null
  >(null);
  const [completing, setCompleting] = useState(false);

  const getPlayerPhotos = (playerId: number) => playerPhotos[playerId] ?? [];

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    getActivityById(Number(id))
      .then((data) => {
        if (isMounted && data) setActivity(data);
      })
      .catch(() => {
        if (isMounted) setActivity(null);
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  const cameraScale = useSharedValue(1);
  const galleryScale = useSharedValue(1);
  const completeScale = useSharedValue(1);
  const cameraAnimatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ scale: cameraScale.value }],
  }));
  const galleryAnimatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ scale: galleryScale.value }],
  }));
  const completeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completeScale.value }],
  }));

  const togglePlayerSelection = (id: number) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const takePhoto = async (playerId: number) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera access",
          "We need camera access so you can capture your mission."
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPlayerPhotos((prev) => ({
          ...prev,
          [playerId]: [...(prev[playerId] ?? []), result.assets[0].uri],
        }));
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Oops", "We couldn't save that—give it another try?");
    }
  };

  const pickImage = async (playerId: number) => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Gallery access",
          "We need gallery access so you can add photos to your mission."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        setPlayerPhotos((prev) => ({
          ...prev,
          [playerId]: [
            ...(prev[playerId] ?? []),
            ...result.assets.map((asset) => asset.uri),
          ],
        }));
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Oops", "We couldn't add that photo—give it another try?");
    }
  };

  const openGalleryModal = (playerId: number) => {
    setGalleryPlayerId(playerId);
    setSelectMode(false);
    setSelectedIndices([]);
    setFullScreenPhotoIndex(null);
    setGalleryModalVisible(true);
  };

  const closeGalleryModal = () => {
    setGalleryModalVisible(false);
    setGalleryPlayerId(null);
    setSelectMode(false);
    setSelectedIndices([]);
    setFullScreenPhotoIndex(null);
  };

  const togglePhotoSelection = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const modalPhotoUris = galleryPlayerId != null ? getPlayerPhotos(galleryPlayerId) : [];

  const deletePhotoAtIndex = (index: number) => {
    if (galleryPlayerId == null) return;
    setPlayerPhotos((prev) => ({
      ...prev,
      [galleryPlayerId]: (prev[galleryPlayerId] ?? []).filter((_, i) => i !== index),
    }));
    setFullScreenPhotoIndex(null);
    if (modalPhotoUris.length === 1) closeGalleryModal();
  };

  const deleteSelectedPhotos = () => {
    if (galleryPlayerId == null) return;
    setPlayerPhotos((prev) => ({
      ...prev,
      [galleryPlayerId]: (prev[galleryPlayerId] ?? []).filter(
        (_, i) => !selectedIndices.includes(i)
      ),
    }));
    setSelectedIndices([]);
    setSelectMode(false);
    if (selectedIndices.length === modalPhotoUris.length) closeGalleryModal();
  };

  useEffect(() => {
    if (Platform.OS !== "android" || !galleryModalVisible) return;
    const onBack = () => {
      if (fullScreenPhotoIndex !== null) {
        setFullScreenPhotoIndex(null);
        return true;
      }
      closeGalleryModal();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [galleryModalVisible, fullScreenPhotoIndex]);

  const displayProfiles = useMemo(() => {
    const fallbackColours = [CARD_BAR_BLUE, CARD_BAR_GREEN];
    const sorted = [...profiles].sort(
      (a, b) =>
        new Date(a.created_at ?? 0).getTime() -
        new Date(b.created_at ?? 0).getTime()
    );
    return sorted.map((p, i) => ({
      id: p.id,
      name: p.name ?? "Player",
      nickname: p.nickname ?? "",
      colour: p.colour || fallbackColours[i % fallbackColours.length],
    }));
  }, [profiles]);

  const canComplete =
    selectedPlayerIds.length > 0 &&
    selectedPlayerIds.every((id) => getPlayerPhotos(id).length > 0);

  const handleComplete = async () => {
    if (!activity?.id || !canComplete) return;
    setCompleting(true);
    try {
      // 1–3: Ensure user_activity_progress rows exist for each selected profile
      const { progressIdByProfile, inserted: insertedProgress } =
        await ensureProgressRows(selectedPlayerIds, activity.id);

      // When new progress rows were created, record achievements
      if (insertedProgress.length > 0) {
        const activityXp = activity.xp ?? 0;
        await insertUserAchievementsForMission(
          insertedProgress.map((row) => {
            const profile = profiles.find((p) => p.id === row.profile_id);
            return {
              profile_id: row.profile_id,
              team_id: profile?.team ?? 0,
              source_id: row.id,
              xp: activityXp,
            };
          })
        );
      }

      // 4–5: Upload each photo to Supabase bucket "user-activity-photos"
      const uploaded: { profileId: number; photoUrl: string }[] = [];
      for (const profileId of selectedPlayerIds) {
        const uris = getPlayerPhotos(profileId);
        for (let i = 0; i < uris.length; i++) {
          const photoUri = uris[i];
          const tempFileName = `mission_${activity.id}_${profileId}_${Date.now()}_${i}.jpg`;
          const tempFile = new File(Paths.cache.uri + tempFileName);
          try {
            new File(photoUri).copy(tempFile);
            const fileObject = {
              uri: tempFile.uri,
              type: "image/jpeg",
              name: tempFileName,
            };
            const result = await uploadUserActivityPhoto(
              fileObject,
              tempFileName,
              profileId.toString()
            );
            if (result.success && result.url) {
              uploaded.push({ profileId, photoUrl: result.url });
            }
          } finally {
            try {
              tempFile.delete();
            } catch {
              // ignore
            }
          }
        }
      }

      // 6: Create user_activity_photos rows
      const userActivityIdByProfile = progressIdByProfile;
      await insertUserActivityPhotos(
        uploaded.map(({ profileId, photoUrl }) => ({
          profile_id: profileId,
          user_activity_id: userActivityIdByProfile[profileId],
          activity_id: activity.id,
          photo_url: photoUrl,
        }))
      );

      const achievementsForReward = insertedProgress.map((row) => ({
        profile_name:
          profiles.find((p) => p.id === row.profile_id)?.nickname ?? "Explorer",
        message: "completed a mission",
        xp: activity.xp ?? 0,
      }));

      router.push({
        pathname: "/(tabs)/activity/mission/reward" as const,
        params: {
          activityId: String(activity.id),
          achievements: JSON.stringify(achievementsForReward),
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert("Oops", "We couldn't save that—give it another try?");
    } finally {
      setCompleting(false);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: LIGHT_GREEN },
        scroll: {
          flex: 1,
          paddingHorizontal: scaleW(24),
          paddingTop: scaleW(60),
          paddingBottom: scaleW(32),
        },
        title: {
          fontSize: scaleW(20),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          textAlign: "center",
          marginBottom: scaleW(32),
        },
        subtitle: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          textAlign: "center",
          marginBottom: scaleW(12),
        },
        pointsHint: {
          marginHorizontal: scaleW(12),
          marginBottom: scaleW(16),
          paddingVertical: scaleW(8),
          paddingHorizontal: scaleW(12),
          backgroundColor: "rgba(255,255,255,0.7)",
          borderRadius: scaleW(12),
        },
        pointsHintText: {
          fontSize: scaleW(13),
          color: TEXT_SECONDARY,
          textAlign: "center",
          flex: 1,
        },
        photoStackContainer: {
          marginBottom: scaleW(16),
          width: "100%",
          overflow: "visible" as const,
        },
        photoStackInner: {
          width: "100%",
          aspectRatio: 4 / 3,
          position: "relative" as const,
          overflow: "visible" as const,
        },
        photoStackCard: {
          position: "absolute" as const,
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          borderRadius: scaleW(16),
          backgroundColor: "#FFF",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2,
        },
        photoImage: {
          width: "100%",
          height: "100%",
          borderRadius: scaleW(16),
        },
        photoUploadBox: {
          backgroundColor: "#FFF",
          borderRadius: scaleW(24),
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: "#000",
          marginBottom: scaleW(32),
        },
        photoUploadRow: { flexDirection: "row" },
        photoOptionCell: {
          alignItems: "center",
          justifyContent: "center",
        },
        photoOptionTouchable: {
          flex: 1,
          alignSelf: "stretch",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: scaleW(102),
          paddingHorizontal: scaleW(16),
        },
        photoOptionContent: {
          alignItems: "center",
          justifyContent: "center",
        },
        photoOptionDivider: {
          borderStyle: "dashed",
          borderColor: "#C7C7C7",
          borderWidth: 1,
        },
        photoOptionIcon: {
          width: scaleW(24),
          height: scaleW(24),
          marginBottom: scaleW(12),
        },
        photoOptionLabel: {
          fontSize: scaleW(14),
          fontWeight: "600",
          color: "#1a1a1a",
          marginTop: scaleW(8),
          textAlign: "center" as const,
          minHeight: scaleW(20),
        },
        whoHeading: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          textAlign: "center",
          marginBottom: scaleW(16),
        },
        playerSectionHeading: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          marginBottom: scaleW(12),
          marginTop: scaleW(24),
        },
        playerCardContainer: { gap: scaleW(12), marginBottom: scaleW(24) },
        playerCard: {
          flexDirection: "row",
          backgroundColor: "#FFF",
          borderRadius: scaleW(12),
          overflow: "hidden",
          borderWidth: 3,
          borderColor: "#FFF",
        },
        playerCardBar: {
          width: scaleW(20),
          borderRadius: scaleW(2),
        },
        playerCardContent: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(16),
        },
        playerCardNames: { flex: 1 },
        playerCardName: {
          fontSize: scaleW(16),
          fontWeight: "700",
          color: TEXT_SECONDARY,
        },
        playerCardNickname: {
          fontSize: scaleW(14),
          color: TEXT_SECONDARY,
          marginTop: 2,
        },
        checkbox: {
          width: scaleW(24),
          height: scaleW(24),
          borderWidth: 2,
          borderColor: TEXT_SECONDARY,
          borderRadius: scaleW(4),
          alignItems: "center",
          justifyContent: "center",
        },
        checkboxChecked: { backgroundColor: TEXT_SECONDARY },
        completeButton: {
          backgroundColor: CREAM,
          paddingVertical: scaleW(16),
          borderRadius: scaleW(32),
          alignItems: "center",
          marginTop: scaleW(24),
          marginBottom: scaleW(64),
          marginHorizontal: scaleW(52),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2,
        },
        completeButtonDisabled: {
          opacity: 0.5,
        },
        completeButtonText: { fontSize: scaleW(17), fontWeight: "600" },
        // Gallery modal
        modalOverlay: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "center",
          padding: scaleW(16),
        },
        modalOverlayAndroid: {
          position: "absolute" as const,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.85)",
        },
        androidOverlayRoot: {
          position: "absolute" as const,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          elevation: 9999,
          backgroundColor: "rgba(0,0,0,0.85)",
        },
        modalContent: {
          backgroundColor: "#FFF",
          borderRadius: scaleW(20),
          overflow: "hidden",
          maxHeight: "90%",
          flex: 1,
        },
        modalHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: scaleW(16),
          paddingVertical: scaleW(14),
          borderBottomWidth: 1,
          borderBottomColor: "#E5E5E5",
        },
        modalHeaderTitle: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: TEXT_SECONDARY,
        },
        modalHeaderActions: { flexDirection: "row", alignItems: "center", gap: scaleW(12) },
        modalBtn: {
          paddingVertical: scaleW(8),
          paddingHorizontal: scaleW(14),
          borderRadius: scaleW(8),
        },
        modalSelectBtn: {
          paddingVertical: scaleW(10),
          paddingHorizontal: scaleW(18),
          borderRadius: scaleW(10),
          backgroundColor: "#DDD",
          alignItems: "center" as const,
          justifyContent: "center" as const,
        },
        modalSelectBtnActive: {
          backgroundColor: LIGHT_GREEN,
          borderColor: LIGHT_GREEN,
        },
        modalBtnText: { fontSize: scaleW(15), fontWeight: "600", color: TEXT_SECONDARY },
        modalDeleteBtnText: { color: "#C62828" },
        galleryList: { padding: scaleW(12) },
        galleryItem: {
          borderRadius: scaleW(12),
          overflow: "hidden",
          backgroundColor: "#EEE",
        },
        galleryItemImage: {
          width: "100%",
          height: "100%",
          borderRadius: scaleW(12),
        },
        galleryItemCheckbox: {
          position: "absolute" as const,
          top: scaleW(8),
          right: scaleW(8),
          width: scaleW(24),
          height: scaleW(24),
          borderRadius: scaleW(12),
          borderWidth: 2,
          borderColor: "#FFF",
          backgroundColor: "rgba(0,0,0,0.3)",
          alignItems: "center",
          justifyContent: "center",
        },
        galleryItemCheckboxSelected: { backgroundColor: LIGHT_GREEN, borderColor: "#FFF" },
        fullScreenWrap: {
          flex: 1,
          backgroundColor: "#111C",
          borderRadius: scaleW(24),
          overflow: "hidden" as const,
          justifyContent: "center",
          alignItems: "center",
        },
        fullScreenImage: {
          width: "100%",
          height: "100%",
        },
        fullScreenToolbar: {
          position: "absolute" as const,
          top: 0,
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: scaleW(16),
          paddingTop: scaleW(50),
          paddingBottom: scaleW(16),
        },
        fullScreenBackBtn: {
          paddingVertical: scaleW(10),
          paddingHorizontal: scaleW(16),
          borderRadius: scaleW(8),
          backgroundColor: "rgba(0,0,0,0.5)",
        },
        fullScreenDeleteBtn: {
          paddingVertical: scaleW(10),
          paddingHorizontal: scaleW(16),
          borderRadius: scaleW(8),
          backgroundColor: "rgba(198,40,40,0.9)",
        },
        fullScreenBtnText: { fontSize: scaleW(16), fontWeight: "600", color: "#FFF" },
        fullScreenPageIndicator: {
          position: "absolute" as const,
          bottom: scaleW(24),
          left: 0,
          right: 0,
          flexDirection: "row" as const,
          justifyContent: "center",
          alignItems: "center",
          gap: scaleW(8),
        },
        fullScreenPageDot: {
          width: scaleW(8),
          height: scaleW(8),
          borderRadius: scaleW(4),
          backgroundColor: "rgba(255,255,255,0.5)",
        },
        fullScreenPageDotActive: {
          backgroundColor: "#FFF",
          width: scaleW(10),
          height: scaleW(10),
          borderRadius: scaleW(5),
        },
      }),
    [scaleW]
  );

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const fullScreenViewerPadding = scaleW(16) * 2;
  const fullScreenViewerWidth = screenWidth - fullScreenViewerPadding;
  const fullScreenViewerHeight = screenHeight - fullScreenViewerPadding;
  const galleryNumColumns = 3;
  const galleryGap = scaleW(8);
  const galleryListHorizontalPadding = scaleW(12) * 2;
  const galleryItemSize = Math.floor(
    (screenWidth -
      scaleW(16) * 2 -
      galleryListHorizontalPadding -
      galleryGap * (galleryNumColumns - 1)) /
      galleryNumColumns
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: scaleW(24) }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <Animated.View entering={FadeInDown.duration(500).delay(0).springify().damping(18)}>
          <ThemedText type="heading" style={styles.title}>
            {activity?.title ?? "Activity"}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100).springify().damping(18)}>
          <ThemedText type="heading" style={styles.whoHeading}>
            Who did this activity?
          </ThemedText>
        </Animated.View>

        <View style={styles.pointsHint}>
          <Text style={styles.pointsHintText}>
            Points are awarded once per user, even if you replay this mission. Select all explorers who should earn points for this activity.
          </Text>
        </View>

        {displayProfiles.map((profile, profileIndex) => {
          const isSelected = selectedPlayerIds.includes(profile.id);
          const uris = getPlayerPhotos(profile.id);
          const hasPhotos = uris.length > 0;
          return (
            <Animated.View
              key={profile.id}
              entering={FadeInDown.duration(400).delay(150 + profileIndex * 80).springify().damping(18)}
            >
              <View style={styles.playerCardContainer}>
                <Pressable
                  style={styles.playerCard}
                  onPress={() => togglePlayerSelection(profile.id)}
                >
                  <View
                    style={[styles.playerCardBar, { backgroundColor: profile.colour }]}
                  />
                  <View style={styles.playerCardContent}>
                    <View style={styles.playerCardNames}>
                      <ThemedText type="heading" style={styles.playerCardName}>
                        {profile.name}
                      </ThemedText>
                      <ThemedText style={styles.playerCardNickname}>
                        {profile.nickname}
                      </ThemedText>
                    </View>
                    <View
                      style={[styles.checkbox, isSelected && styles.checkboxChecked]}
                    >
                      {isSelected && (
                        <ThemedText style={{ color: "#FFF", fontSize: scaleW(14) }}>
                          ✓
                        </ThemedText>
                      )}
                    </View>
                  </View>
                </Pressable>
              </View>
              <ExpandableSection isSelected={isSelected}>
                <ThemedText type="heading" style={styles.subtitle}>
                  Add your photo of this activity
                </ThemedText>
                <View
                  style={{
                    backgroundColor: "rgba(79, 111, 82, 0.12)",
                    borderRadius: scaleW(12),
                    paddingVertical: scaleW(12),
                    paddingHorizontal: scaleW(16),
                    marginBottom: scaleW(12),
                    borderLeftWidth: scaleW(4),
                    borderLeftColor: LIGHT_GREEN,
                  }}
                >
                  <Text
                    style={{
                      fontSize: scaleW(14),
                      fontWeight: "600",
                      color: TEXT_SECONDARY,
                      lineHeight: scaleW(20),
                      textAlign: "center",
                    }}
                  >
                    Please don't include any faces or people in your photo. This keeps everyone safe and anonymous. Make sure your photo is of the mission activity - otherwise it may be rejected.
                  </Text>
                </View>
                {hasPhotos ? (
                  <TouchableOpacity
                    onPress={() => openGalleryModal(profile.id)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.photoStackContainer}>
                      <View style={styles.photoStackInner}>
                        {uris.map((uri, index) => {
                          const isLatest = index === uris.length - 1;
                          const rotation = isLatest ? 0 : index % 2 === 0 ? -4 : 3;
                          return (
                            <View
                              key={`${uri}-${index}`}
                              style={[
                                styles.photoStackCard,
                                {
                                  zIndex: index,
                                  transform: [{ rotate: `${rotation}deg` }],
                                },
                              ]}
                            >
                              <Image
                                source={{ uri }}
                                style={styles.photoImage}
                              />
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : null}
                <View style={styles.photoUploadBox}>
                  <View style={styles.photoUploadRow}>
                    <Animated.View
                      style={[
                        styles.photoOptionCell,
                        cameraAnimatedStyle,
                      ]}
                    >
                      <Pressable
                        style={[styles.photoOptionTouchable, hasPhotos && { paddingVertical: scaleW(24) }]}
                        onPress={() => takePhoto(profile.id)}
                        onPressIn={() => {
                          cameraScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
                        }}
                        onPressOut={() => {
                          cameraScale.value = withSpring(1, { damping: 15, stiffness: 400 });
                        }}
                      >
                        <View style={styles.photoOptionContent}>
                          <Image
                            source={CAMERA_ICON}
                            style={styles.photoOptionIcon}
                            resizeMode="contain"
                          />
                          <Text style={styles.photoOptionLabel} numberOfLines={1}>
                            Take a photo
                          </Text>
                        </View>
                      </Pressable>
                    </Animated.View>
                    <View style={styles.photoOptionDivider} />
                    <Animated.View
                      style={[
                        styles.photoOptionCell,
                        galleryAnimatedStyle,
                      ]}
                    >
                      <Pressable
                        style={[styles.photoOptionTouchable, hasPhotos && { paddingVertical: scaleW(54) }]}
                        onPress={() => pickImage(profile.id)}
                        onPressIn={() => {
                          galleryScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
                        }}
                        onPressOut={() => {
                          galleryScale.value = withSpring(1, { damping: 15, stiffness: 400 });
                        }}
                      >
                        <View style={styles.photoOptionContent}>
                          <Image
                            source={GALLERY_ICON}
                            style={styles.photoOptionIcon}
                            resizeMode="contain"
                          />
                          <Text style={styles.photoOptionLabel} numberOfLines={1}>
                            Pick a photo
                          </Text>
                        </View>
                      </Pressable>
                    </Animated.View>
                  </View>
                </View>
              </ExpandableSection>
            </Animated.View>
          );
        })}

        <Animated.View
          entering={FadeInDown.duration(500).delay(580).springify().damping(18)}
          style={completeAnimatedStyle}
        >
          <Pressable
            style={[
              styles.completeButton,
              (!canComplete || completing) && styles.completeButtonDisabled,
            ]}
            disabled={!canComplete || completing}
            onPress={handleComplete}
            onPressIn={() => {
              if (canComplete && !completing) {
                completeScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
              }
            }}
            onPressOut={() => {
              completeScale.value = withSpring(1, { damping: 15, stiffness: 400 });
            }}
          >
            <ThemedText type="heading" style={styles.completeButtonText}>
              {completing ? "Completing…" : "Complete"}
            </ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {Platform.OS === "android" && galleryModalVisible && (
        <View
          style={[
            styles.modalOverlay,
            styles.androidOverlayRoot,
            {
              width: Dimensions.get("window").width,
              height: Dimensions.get("window").height,
            },
          ]}
          collapsable={false}
        >
          {fullScreenPhotoIndex !== null ? (
            <View
              style={[
                styles.fullScreenWrap,
                Platform.OS === "android" && { elevation: 24 },
              ]}
              pointerEvents="box-none"
            >
              <FlatList
                data={modalPhotoUris}
                horizontal
                pagingEnabled
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={Math.min(
                  fullScreenPhotoIndex,
                  modalPhotoUris.length - 1
                )}
                getItemLayout={(_, index) => ({
                  length: fullScreenViewerWidth,
                  offset: fullScreenViewerWidth * index,
                  index,
                })}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(
                    e.nativeEvent.contentOffset.x / fullScreenViewerWidth
                  );
                  setFullScreenPhotoIndex(Math.min(index, modalPhotoUris.length - 1));
                }}
                keyExtractor={(uri, i) => `fullscreen-${uri}-${i}`}
                renderItem={({ item: uri }) => (
                  <View
                    style={{
                      width: fullScreenViewerWidth,
                      height: fullScreenViewerHeight,
                    }}
                  >
                    <Image
                      source={{ uri }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="contain"
                    />
                  </View>
                )}
              />
                <View style={styles.fullScreenToolbar} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.fullScreenBackBtn}
                  onPress={() => setFullScreenPhotoIndex(null)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.fullScreenBtnText}>Back</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.fullScreenDeleteBtn}
                  onPress={() => deletePhotoAtIndex(fullScreenPhotoIndex)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.fullScreenBtnText}>Delete</ThemedText>
                </TouchableOpacity>
              </View>
              {modalPhotoUris.length > 1 && (
                <View style={styles.fullScreenPageIndicator} pointerEvents="none">
                  {modalPhotoUris.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.fullScreenPageDot,
                        i === fullScreenPhotoIndex && styles.fullScreenPageDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.modalContent,
                Platform.OS === "android" && { elevation: 24 },
              ]}
              pointerEvents="box-none"
            >
              <View style={styles.modalHeader} pointerEvents="box-none">
                <ThemedText style={styles.modalHeaderTitle}>Photos</ThemedText>
                <View style={styles.modalHeaderActions}>
                  {selectMode && selectedIndices.length > 0 && (
                    <TouchableOpacity
                      style={styles.modalBtn}
                      onPress={deleteSelectedPhotos}
                      activeOpacity={0.7}
                    >
                      <ThemedText
                        style={[
                          styles.modalBtnText,
                          styles.modalDeleteBtnText,
                        ]}
                      >
                        Delete
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.modalSelectBtn,
                      selectMode && styles.modalSelectBtnActive,
                    ]}
                    onPress={() => {
                      setSelectMode((prev) => !prev);
                      setSelectedIndices([]);
                    }}
                    activeOpacity={0.7}
                  >
                    <ThemedText
                      style={[
                        styles.modalBtnText,
                        selectMode && { color: "#FFF" },
                      ]}
                    >
                      {selectMode ? "Cancel" : "Select"}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalBtn}
                    onPress={closeGalleryModal}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="close"
                      size={scaleW(24)}
                      color={TEXT_SECONDARY}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <FlatList
                data={modalPhotoUris}
                numColumns={galleryNumColumns}
                keyExtractor={(uri, i) => `${uri}-${i}`}
                contentContainerStyle={styles.galleryList}
                columnWrapperStyle={{
                  marginBottom: galleryGap,
                  gap: galleryGap,
                }}
                removeClippedSubviews={Platform.OS !== "android"}
                nestedScrollEnabled={Platform.OS === "android"}
                renderItem={({ item: uri, index }) => (
                  <TouchableOpacity
                    style={[
                      styles.galleryItem,
                      {
                        width: galleryItemSize,
                        height: galleryItemSize,
                        minWidth: galleryItemSize,
                        maxWidth: galleryItemSize,
                        minHeight: galleryItemSize,
                        maxHeight: galleryItemSize,
                      },
                    ]}
                    onPress={() => {
                      if (selectMode) {
                        togglePhotoSelection(index);
                      } else {
                        setFullScreenPhotoIndex(index);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri }}
                      style={styles.galleryItemImage}
                      resizeMode="cover"
                    />
                    {selectMode && (
                      <View
                        style={[
                          styles.galleryItemCheckbox,
                          selectedIndices.includes(index) &&
                            styles.galleryItemCheckboxSelected,
                        ]}
                      >
                        {selectedIndices.includes(index) && (
                          <ThemedText style={{ color: "#FFF", fontSize: 14 }}>
                            ✓
                          </ThemedText>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
              </View>
            </View>
          )}
        </View>
      )}

      {Platform.OS !== "android" && (
        <Modal
          visible={galleryModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeGalleryModal}
          supportedOrientations={["portrait", "landscape"]}
        >
          <View style={styles.modalOverlay}>
            {fullScreenPhotoIndex !== null ? (
              <View style={styles.fullScreenWrap} pointerEvents="box-none">
                <FlatList
                  data={modalPhotoUris}
                  horizontal
                  pagingEnabled
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  initialScrollIndex={Math.min(
                    fullScreenPhotoIndex,
                    modalPhotoUris.length - 1
                  )}
                  getItemLayout={(_, index) => ({
                    length: fullScreenViewerWidth,
                    offset: fullScreenViewerWidth * index,
                    index,
                  })}
                  onMomentumScrollEnd={(e) => {
                    const index = Math.round(
                      e.nativeEvent.contentOffset.x / fullScreenViewerWidth
                    );
                    setFullScreenPhotoIndex(
                      Math.min(index, modalPhotoUris.length - 1)
                    );
                  }}
                  keyExtractor={(uri, i) => `fullscreen-${uri}-${i}`}
                  renderItem={({ item: uri }) => (
                    <View
                      style={{
                        width: fullScreenViewerWidth,
                        height: fullScreenViewerHeight,
                      }}
                    >
                      <Image
                        source={{ uri }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                />
                <View style={styles.fullScreenToolbar} pointerEvents="box-none">
                  <TouchableOpacity
                    style={styles.fullScreenBackBtn}
                    onPress={() => setFullScreenPhotoIndex(null)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.fullScreenBtnText}>
                      Back
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.fullScreenDeleteBtn}
                    onPress={() => deletePhotoAtIndex(fullScreenPhotoIndex)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.fullScreenBtnText}>
                      Delete
                    </ThemedText>
                  </TouchableOpacity>
                </View>
                {modalPhotoUris.length > 1 && (
                  <View style={styles.fullScreenPageIndicator} pointerEvents="none">
                    {modalPhotoUris.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.fullScreenPageDot,
                          i === fullScreenPhotoIndex &&
                            styles.fullScreenPageDotActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.modalContent} pointerEvents="box-none">
                <View style={styles.modalHeader} pointerEvents="box-none">
                  <ThemedText style={styles.modalHeaderTitle}>Photos</ThemedText>
                  <View style={styles.modalHeaderActions}>
                    {selectMode && selectedIndices.length > 0 && (
                      <TouchableOpacity
                        style={styles.modalBtn}
                        onPress={deleteSelectedPhotos}
                        activeOpacity={0.7}
                      >
                        <ThemedText
                          style={[
                            styles.modalBtnText,
                            styles.modalDeleteBtnText,
                          ]}
                        >
                          Delete
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.modalSelectBtn,
                        selectMode && styles.modalSelectBtnActive,
                      ]}
                      onPress={() => {
                        setSelectMode((prev) => !prev);
                        setSelectedIndices([]);
                      }}
                      activeOpacity={0.7}
                    >
                      <ThemedText
                        style={[
                          styles.modalBtnText,
                          selectMode && { color: "#FFF" },
                        ]}
                      >
                        {selectMode ? "Cancel" : "Select"}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalBtn}
                      onPress={closeGalleryModal}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="close"
                        size={scaleW(24)}
                        color={TEXT_SECONDARY}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <FlatList
                    data={modalPhotoUris}
                    numColumns={galleryNumColumns}
                    keyExtractor={(uri, i) => `${uri}-${i}`}
                    contentContainerStyle={styles.galleryList}
                    columnWrapperStyle={{
                      marginBottom: galleryGap,
                      gap: galleryGap,
                    }}
                    removeClippedSubviews={true}
                    renderItem={({ item: uri, index }) => (
                      <TouchableOpacity
                        style={[
                          styles.galleryItem,
                          {
                            width: galleryItemSize,
                            height: galleryItemSize,
                            minWidth: galleryItemSize,
                            maxWidth: galleryItemSize,
                            minHeight: galleryItemSize,
                            maxHeight: galleryItemSize,
                          },
                        ]}
                        onPress={() => {
                          if (selectMode) {
                            togglePhotoSelection(index);
                          } else {
                            setFullScreenPhotoIndex(index);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{ uri }}
                          style={styles.galleryItemImage}
                          resizeMode="cover"
                        />
                        {selectMode && (
                          <View
                            style={[
                              styles.galleryItemCheckbox,
                              selectedIndices.includes(index) &&
                                styles.galleryItemCheckboxSelected,
                            ]}
                          >
                            {selectedIndices.includes(index) && (
                              <ThemedText style={{ color: "#FFF", fontSize: 14 }}>
                                ✓
                              </ThemedText>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
            )}
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
