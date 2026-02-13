import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  TextInput,
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
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { usePlayer } from "@/contexts/PlayerContext";

const TEXT_SECONDARY = "#2F3336";
const LIGHT_GREEN = "#7FAF8A";
const CREAM = "#F6F5F1";
const CARD_BAR_BLUE = "#87CEEB";
const CARD_BAR_GREEN = "#98D8A8";

const GALLERY_ICON = require("@/assets/images/gallery.png");
const CAMERA_ICON = require("@/assets/images/camera.png");

export default function CompletionScreen() {
  const router = useRouter();
  const { scaleW } = useLayoutScale();
  const { profiles } = usePlayer();
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [hardestText, setHardestText] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [galleryModalVisible, setGalleryModalVisible] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [fullScreenPhotoIndex, setFullScreenPhotoIndex] = useState<
    number | null
  >(null);

  const cameraScale = useSharedValue(1);
  const galleryScale = useSharedValue(1);
  const nextScale = useSharedValue(1);
  const cameraAnimatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ scale: cameraScale.value }],
  }));
  const galleryAnimatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ scale: galleryScale.value }],
  }));
  const nextAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nextScale.value }],
  }));

  const togglePlayerSelection = (id: number) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Sorry, we need camera access to take photos for this activity."
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUris((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Sorry, we need gallery access to pick photos for this activity."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        setPhotoUris((prev) => [
          ...prev,
          ...result.assets.map((asset) => asset.uri),
        ]);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const openGalleryModal = () => {
    setSelectMode(false);
    setSelectedIndices([]);
    setFullScreenPhotoIndex(null);
    setGalleryModalVisible(true);
  };

  const closeGalleryModal = () => {
    setGalleryModalVisible(false);
    setSelectMode(false);
    setSelectedIndices([]);
    setFullScreenPhotoIndex(null);
  };

  const togglePhotoSelection = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const deletePhotoAtIndex = (index: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
    setFullScreenPhotoIndex(null);
    if (photoUris.length <= 1) closeGalleryModal();
  };

  const deleteSelectedPhotos = () => {
    setPhotoUris((prev) =>
      prev.filter((_, i) => !selectedIndices.includes(i))
    );
    setSelectedIndices([]);
    setSelectMode(false);
    if (selectedIndices.length === photoUris.length) closeGalleryModal();
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
    return profiles.map((p, i) => ({
      id: p.id,
      name: p.name ?? "Player",
      nickname: p.nickname ?? "",
      colour: p.colour || fallbackColours[i % fallbackColours.length],
    }));
  }, [profiles]);

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
        photoOption: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: photoUris.length > 0 ? scaleW(24) : scaleW(72),
          paddingHorizontal: scaleW(16),
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
          fontWeight: "500",
          color: TEXT_SECONDARY,
        },
        hardestHeading: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          textAlign: "center",
          marginBottom: scaleW(12),
        },
        hardestInput: {
          backgroundColor: "#FFF",
          borderRadius: scaleW(24),
          borderWidth: 2,
          borderColor: TEXT_SECONDARY,
          paddingHorizontal: scaleW(16),
          paddingVertical: scaleW(14),
          fontSize: scaleW(15),
          color: TEXT_SECONDARY,
          minHeight: scaleW(150),
          textAlignVertical: "top",
          marginBottom: scaleW(32),
        },
        whoHeading: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          textAlign: "center",
          marginBottom: scaleW(16),
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
        nextButton: {
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
        nextButtonText: { fontSize: scaleW(17), fontWeight: "600" },
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
      }),
    [scaleW, photoUris.length]
  );

  const { width: screenWidth } = Dimensions.get("window");
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
      >
        <Animated.View entering={FadeInDown.duration(500).delay(0).springify().damping(18)}>
          <ThemedText type="heading" style={styles.title}>
            Build a laser fortress
          </ThemedText>
          <ThemedText type="heading" style={styles.subtitle}>
            Add your photo of this activity
          </ThemedText>
        </Animated.View>

        {photoUris.length > 0 ? (
          <TouchableOpacity
            onPress={openGalleryModal}
            activeOpacity={0.9}
          >
            <Animated.View
              entering={FadeInDown.duration(300).springify().damping(18)}
              style={styles.photoStackContainer}
            >
              <View style={styles.photoStackInner}>
                {photoUris.map((uri, index) => {
                  const isLatest = index === photoUris.length - 1;
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
                        resizeMode="cover"
                      />
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableOpacity>
        ) : null}

        <Animated.View
          entering={FadeInDown.duration(500).delay(150).springify().damping(18)}
          style={styles.photoUploadBox}
        >
          <View style={styles.photoUploadRow}>
            <Animated.View style={cameraAnimatedStyle}>
              <Pressable
                style={styles.photoOption}
                onPress={takePhoto}
                onPressIn={() => {
                  cameraScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
                }}
                onPressOut={() => {
                  cameraScale.value = withSpring(1, { damping: 15, stiffness: 400 });
                }}
              >
                <Image
                  source={CAMERA_ICON}
                  style={styles.photoOptionIcon}
                  resizeMode="contain"
                />
                <ThemedText style={styles.photoOptionLabel}>Take a photo</ThemedText>
              </Pressable>
            </Animated.View>
            <View style={styles.photoOptionDivider} />
            <Animated.View style={galleryAnimatedStyle}>
              <Pressable
                style={styles.photoOption}
                onPress={pickImage}
                onPressIn={() => {
                  galleryScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
                }}
                onPressOut={() => {
                  galleryScale.value = withSpring(1, { damping: 15, stiffness: 400 });
                }}
              >
                <Image
                  source={GALLERY_ICON}
                  style={styles.photoOptionIcon}
                  resizeMode="contain"
                />
                <ThemedText style={styles.photoOptionLabel}>Pick an image</ThemedText>
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(280).springify().damping(18)}>
          <ThemedText type="heading" style={styles.hardestHeading}>
            What did you find the hardest?
          </ThemedText>
          <TextInput
            style={styles.hardestInput}
            placeholder="Write a few words..."
            placeholderTextColor="#9E9E9E"
            value={hardestText}
            onChangeText={setHardestText}
            multiline
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(380).springify().damping(18)}>
          <ThemedText type="heading" style={styles.whoHeading}>
            Who did this activity?
          </ThemedText>
          <View style={styles.playerCardContainer}>
            {displayProfiles.map((profile, index) => {
              const isSelected = selectedPlayerIds.includes(profile.id);
              return (
                <Animated.View
                  key={profile.id}
                  entering={FadeInDown.duration(400).delay(420 + index * 50).springify().damping(18)}
                >
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
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(580).springify().damping(18)}
          style={nextAnimatedStyle}
        >
          <Pressable
            style={styles.nextButton}
            onPress={() => router.push("/(tabs)/activity/mission/reward")}
            onPressIn={() => {
              nextScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
            }}
            onPressOut={() => {
              nextScale.value = withSpring(1, { damping: 15, stiffness: 400 });
            }}
          >
            <ThemedText type="heading" style={styles.nextButtonText}>
              Next
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
              <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Image
                  source={{ uri: photoUris[fullScreenPhotoIndex] }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="contain"
                />
              </View>
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
                data={photoUris}
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
                <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                  <Image
                    source={{ uri: photoUris[fullScreenPhotoIndex] }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="contain"
                  />
                </View>
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
                    data={photoUris}
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
