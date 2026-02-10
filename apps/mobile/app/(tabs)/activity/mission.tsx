import React, { useRef, useState, useMemo } from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  TextInput,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { usePlayer } from "@/contexts/PlayerContext";

const TEXT_SECONDARY = "#2F3336";
const HUNTLY_GREEN = "#4F6F52";
const LIGHT_GREEN = "#7FAF8A";
const LIGHT_BG = "#f8f8f8";
const CREAM = "#F6F5F1";
const PAGE2_BG = "#81A67B";
const CARD_BAR_BLUE = "#87CEEB";
const CARD_BAR_GREEN = "#98D8A8";

const LASER_FORTRESS = require("@/assets/images/laser-fortress.jpg");
const PLANTING = require("@/assets/images/planting.png");
const BUILDING = require("@/assets/images/building.png");
const ACTIVITY_1 = require("@/assets/images/activity-1.png");
const ACTIVITY_2 = require("@/assets/images/activity-2.png");
const CLUB_1 = require("@/assets/images/club-1.png");
const CLUB_2 = require("@/assets/images/club-2.png");
const GALLERY_ICON = require("@/assets/images/gallery.png");
const CAMERA_ICON = require("@/assets/images/camera.png");

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ActivityMissionScreen() {
  const router = useRouter();
  const { scaleW, scaleH } = useLayoutScale();
  const { profiles } = usePlayer();
  const pagerRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);

  const togglePlayerSelection = (id: number) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const [hardestText, setHardestText] = useState("");

  const displayProfiles = useMemo(() => {
    const colours = [CARD_BAR_BLUE, CARD_BAR_GREEN];
    return profiles.map((p, i) => ({
      id: p.id,
      name: p.name ?? "Player",
      nickname: p.nickname ?? "",
      colour: colours[i % colours.length],
    }));
  }, [profiles]);

  const onPagerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== page) setPage(index);
  };

  const goToPage = (index: number) => {
    pagerRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
    setPage(index);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        pager: { flex: 1 },
        page: { width: SCREEN_WIDTH, flex: 1 },
        pageInner: { flex: 1, backgroundColor: LIGHT_BG },
        titleContainer: {
          backgroundColor: LIGHT_GREEN,
          paddingTop: scaleW(60),
          paddingBottom: scaleW(16),
          paddingHorizontal: scaleW(16),
          marginBottom: scaleW(40),
          borderBottomLeftRadius: scaleW(20),
          borderBottomRightRadius: scaleW(20),
          alignItems: "center",
        },
        titleText: {
          fontSize: scaleW(20),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          marginBottom: scaleW(12),
        },
        mainImage: {
          width: "100%",
          height: scaleW(220),
          borderRadius: scaleW(20),
        },
        tagsRow: {
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: scaleW(12),
          marginTop: scaleW(16),
          marginBottom: scaleW(12),
        },
        tag: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: CREAM,
          paddingVertical: scaleW(2),
          paddingHorizontal: scaleW(6),
          borderRadius: scaleW(20),
          gap: scaleW(6),
        },
        tagIcon: { width: scaleW(14), height: scaleW(14) },
        tagText: { fontSize: scaleW(12), color: "#000" },
        descriptionBox: {
          backgroundColor: CREAM,
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(38),
          borderRadius: scaleW(14),
        },
        descriptionText: {
          fontSize: scaleW(15),
          color: "#000",
          textAlign: "center",
          lineHeight: scaleW(22),
        },
        section: {
          marginHorizontal: scaleW(48),
          marginBottom: scaleW(24),
          gap: scaleW(20),
        },
        sectionTitle: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: TEXT_SECONDARY,
        },
        sectionDescription: {
          fontSize: scaleW(14),
          color: TEXT_SECONDARY,
          lineHeight: scaleW(20),
          marginRight: scaleW(8),
        },
        taskRow: {
          alignItems: "flex-start",
          gap: scaleW(16),
        },
        taskText: {
          flex: 1,
          fontSize: scaleW(16),
          color: TEXT_SECONDARY,
          lineHeight: scaleW(20),
        },
        taskImage: {
          width: "100%",
          height: scaleW(115),
          borderRadius: scaleW(10),
        },
        hintItem: {
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: scaleW(8),
          gap: scaleW(8),
        },
        bullet: { fontSize: scaleW(14), color: TEXT_SECONDARY, marginTop: 2 },
        hintText: {
          flex: 1,
          fontSize: scaleW(14),
          color: TEXT_SECONDARY,
          lineHeight: scaleW(20),
        },
        teamRow: {
          gap: scaleW(32),
        },
        polaroid: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 2,
          transform: [{ rotate: "-2deg" }],
        },
        polaroidSecond: { marginLeft: scaleW(50), transform: [{ rotate: "2deg" }] },
        polaroidImage: {
          width: scaleW(247),
          height: scaleW(149),
          borderRadius: scaleW(10),
          borderWidth: 2,
          borderColor: "#FFF"
        },
        completeButton: {
          alignSelf: "center",
          backgroundColor: HUNTLY_GREEN,
          paddingVertical: scaleW(14),
          width: scaleW(240),
          borderRadius: scaleW(28),
          marginTop: scaleW(24),
          marginBottom: scaleW(32),
        },
        completeButtonText: {
          textAlign: "center",
          fontSize: scaleW(16),
          fontWeight: "700",
          color: "#FFF",
        },
        page2Container: {
          flex: 1,
          backgroundColor: LIGHT_BG,
          padding: scaleW(24),
          justifyContent: "center",
          alignItems: "center",
        },
        page3Container: {
          flex: 1,
          backgroundColor: LIGHT_BG,
          padding: scaleW(24),
          justifyContent: "center",
          alignItems: "center",
        },
        navRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: scaleW(24),
          paddingBottom: scaleW(24),
          gap: scaleW(16),
        },
        navButton: {
          flex: 1,
          backgroundColor: TEXT_SECONDARY,
          paddingVertical: scaleW(12),
          borderRadius: scaleW(24),
          alignItems: "center",
        },
        page2Outer: {
          flex: 1,
          backgroundColor: LIGHT_GREEN,
        },
        page2Scroll: {
          flex: 1,
          paddingHorizontal: scaleW(24),
          paddingTop: scaleW(60),
          paddingBottom: scaleW(32),
        },
        page2Title: {
          fontSize: scaleW(20),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          textAlign: "center",
          marginBottom: scaleW(32),
        },
        page2Subtitle: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          textAlign: "center",
          marginBottom: scaleW(12),
        },
        photoUploadBox: {
          backgroundColor: "#FFF",
          borderRadius: scaleW(24),
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: "#000",
          marginBottom: scaleW(32),
        },
        photoUploadRow: {
          flexDirection: "row",
        },
        photoOption: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: scaleW(72),
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
        playerCardContainer: {
          gap: scaleW(12),
          marginBottom: scaleW(24),
        },
        playerCard: {
          flexDirection: "row",
          backgroundColor: "#FFF",
          borderRadius: scaleW(12),
          borderWidth: 1,
          borderColor: "#D0D0D0",
          overflow: "hidden",
        },
        playerCardBar: {
          width: scaleW(6),
          alignSelf: "stretch",
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
        checkboxChecked: {
          backgroundColor: TEXT_SECONDARY,
        },
        nextButtonPage2: {
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
        nextButtonPage2Text: {
          fontSize: scaleW(17),
          fontWeight: "600",
        },
      }),
    [scaleW, scaleW]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        onMomentumScrollEnd={onPagerScroll}
        onScrollEndDrag={onPagerScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        style={styles.pager}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Page 1 - Design from mockup */}
        <View style={styles.page}>
          <ScrollView
            style={styles.pageInner}
            contentContainerStyle={{ paddingBottom: scaleW(40) }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleContainer}>
              <ThemedText type="heading" style={styles.titleText}>Build a laser fortress</ThemedText>
              <Image
                source={LASER_FORTRESS}
                style={styles.mainImage}
                resizeMode="cover"
              />
              <View style={styles.tagsRow}>
                <View style={styles.tag}>
                  <Image
                    source={PLANTING}
                    style={styles.tagIcon}
                    resizeMode="contain"
                  />
                  <ThemedText style={styles.tagText}>Nature</ThemedText>
                </View>
                <View style={styles.tag}>
                  <Image
                    source={BUILDING}
                    style={styles.tagIcon}
                    resizeMode="contain"
                  />
                  <ThemedText style={styles.tagText}>Building</ThemedText>
                </View>
              </View>
              <View style={styles.descriptionBox}>
                <ThemedText style={styles.descriptionText}>
                  Set up a strong defence to help keep the gem safe.
                </ThemedText>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="heading" style={styles.sectionTitle}>What to do</ThemedText>
              <View style={styles.taskRow}>
                <ThemedText style={styles.taskText}>
                  1. Ad deserunt duis exercitation non nostrud Lorem incididunt
                  eu mollit reprehenderit dolore
                </ThemedText>
                <Image
                  source={ACTIVITY_1}
                  style={styles.taskImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.taskRow}>
                <ThemedText style={styles.taskText}>
                  2. Ad deserunt duis exercitation non nostrud Lorem incididunt
                  eu mollit reprehenderit dolore
                </ThemedText>
                <Image
                  source={ACTIVITY_2}
                  style={styles.taskImage}
                  resizeMode="cover"
                />
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="heading" style={styles.sectionTitle}>Hints</ThemedText>
              <View style={styles.hintItem}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.hintText}>
                  Hint 1: Cilum quis magna elit magra esse laboris elit cillum
                  locorum dolor fugiat od od.
                </ThemedText>
              </View>
              <View style={styles.hintItem}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.hintText}>
                  Cillum quis magna elit magna esse laboris elit cillum laborum
                  dolor fugiat ad ad.
                </ThemedText>
              </View>
              <View style={styles.hintItem}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.hintText}>
                  Cillurn quis magna elit magna esse laboris elit cillum laborum
                  dolor fugiat ad ad.
                </ThemedText>
              </View>
            </View>

            <View style={styles.section}>
              <View>
                <ThemedText type="heading" style={styles.sectionTitle}>Your team</ThemedText>
                <ThemedText style={styles.sectionDescription}>
                  See submissions from other people in your team...
                </ThemedText>
              </View>
              <View style={styles.teamRow}>
                <View style={styles.polaroid}>
                  <Image
                    source={CLUB_1}
                    style={styles.polaroidImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={[styles.polaroid, styles.polaroidSecond]}>
                  <Image
                    source={CLUB_2}
                    style={styles.polaroidImage}
                    resizeMode="cover"
                  />
                </View>
              </View>
            </View>

            <Pressable
              style={styles.completeButton}
              onPress={() => goToPage(1)}
            >
              <ThemedText type="heading" style={styles.completeButtonText}>Complete</ThemedText>
            </Pressable>
          </ScrollView>
        </View>

        {/* Page 2 - Add your photo */}
        <View style={[styles.page, styles.page2Outer]}>
          <ScrollView
            style={styles.page2Scroll}
            contentContainerStyle={{ paddingBottom: scaleW(24) }}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText type="heading" style={styles.page2Title}>Build a laser fortress</ThemedText>
            <ThemedText type="heading" style={styles.page2Subtitle}>
              Add your photo of this activity
            </ThemedText>

            <View style={styles.photoUploadBox}>
              <View style={styles.photoUploadRow}>
                <Pressable style={styles.photoOption}>
                  <Image
                    source={CAMERA_ICON}
                    style={styles.photoOptionIcon}
                    resizeMode="contain"
                  />
                  <ThemedText style={styles.photoOptionLabel}>Take a photo</ThemedText>
                </Pressable>
                <View style={styles.photoOptionDivider} />
                <Pressable style={styles.photoOption}>
                  <Image
                    source={GALLERY_ICON}
                    style={styles.photoOptionIcon}
                    resizeMode="contain"
                  />
                  <ThemedText style={styles.photoOptionLabel}>Pick an image</ThemedText>
                </Pressable>
              </View>
            </View>

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

            <ThemedText type="heading" style={styles.whoHeading}>
              Who did this activity?
            </ThemedText>
            <View style={styles.playerCardContainer}>
              {displayProfiles.map((profile) => {
                const isSelected = selectedPlayerIds.includes(profile.id);
                return (
                  <Pressable
                    key={profile.id}
                    style={styles.playerCard}
                    onPress={() => togglePlayerSelection(profile.id)}
                  >
                    <View
                      style={[styles.playerCardBar, { backgroundColor: profile.colour }]}
                    />
                    <View style={styles.playerCardContent}>
                      <View style={styles.playerCardNames}>
                        <ThemedText type="heading" style={styles.playerCardName}>{profile.name}</ThemedText>
                        <ThemedText style={styles.playerCardNickname}>
                          {profile.nickname}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxChecked,
                        ]}
                      >
                        {isSelected && (
                          <ThemedText style={{ color: "#FFF", fontSize: scaleW(14) }}>
                            ✓
                          </ThemedText>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={styles.nextButtonPage2}
              onPress={() => goToPage(2)}
            >
              <ThemedText type="heading" style={styles.nextButtonPage2Text}>Next</ThemedText>
            </Pressable>
          </ScrollView>
        </View>

        {/* Page 3 */}
        <View style={styles.page}>
          <View style={styles.page3Container}>
            <ThemedText
              type="heading"
              style={{ fontSize: scaleW(22), color: TEXT_SECONDARY, marginBottom: scaleW(16) }}
            >
              Step 3
            </ThemedText>
            <ThemedText
              style={{ fontSize: scaleW(16), color: "#333", textAlign: "center" }}
            >
              You're ready to complete the activity. Great work!
            </ThemedText>
            <View style={styles.navRow}>
              <Pressable style={styles.navButton} onPress={() => goToPage(1)}>
                <ThemedText type="heading" style={styles.completeButtonText}>Back</ThemedText>
              </Pressable>
              <Pressable
                style={styles.navButton}
                onPress={() => router.back()}
              >
                <ThemedText type="heading" style={styles.completeButtonText}>Complete</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
