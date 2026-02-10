import React, { useRef, useState, useMemo } from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const TEXT_SECONDARY = "#2F3336";
const HUNTLY_GREEN = "#4F6F52";
const LIGHT_BG = "#f8f8f8";
const CREAM = "#F6F5F1";

const LASER_FORTRESS = require("@/assets/images/laser-fortress.jpg");
const PLANTING = require("@/assets/images/planting.png");
const BUILDING = require("@/assets/images/building.png");
const ACTIVITY_1 = require("@/assets/images/activity-1.png");
const ACTIVITY_2 = require("@/assets/images/activity-2.png");
const CLUB_1 = require("@/assets/images/club-1.png");
const CLUB_2 = require("@/assets/images/club-2.png");

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ActivityMissionScreen() {
  const router = useRouter();
  const { scaleW, scaleH } = useLayoutScale();
  const pagerRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

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
          backgroundColor: "#7FAF8A",
          paddingTop: scaleH(60),
          paddingBottom: scaleH(16),
          paddingHorizontal: scaleW(16),
          marginBottom: scaleH(40),
          borderBottomLeftRadius: scaleW(20),
          borderBottomRightRadius: scaleW(20),
          alignItems: "center",
        },
        titleText: {
          fontSize: scaleW(20),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          marginBottom: scaleH(12),
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
          marginTop: scaleH(16),
          marginBottom: scaleH(12),
        },
        tag: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: CREAM,
          paddingVertical: scaleH(2),
          paddingHorizontal: scaleW(6),
          borderRadius: scaleW(20),
          gap: scaleW(6),
        },
        tagIcon: { width: scaleW(14), height: scaleW(14) },
        tagText: { fontSize: scaleW(12), color: "#000" },
        descriptionBox: {
          backgroundColor: CREAM,
          paddingVertical: scaleH(14),
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
          marginBottom: scaleH(24),
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
          marginBottom: scaleH(8),
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
          paddingVertical: scaleH(14),
          width: scaleW(240),
          borderRadius: scaleW(28),
          marginTop: scaleH(24),
          marginBottom: scaleH(32),
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
          paddingBottom: scaleH(24),
          gap: scaleW(16),
        },
        navButton: {
          flex: 1,
          backgroundColor: TEXT_SECONDARY,
          paddingVertical: scaleH(12),
          borderRadius: scaleW(24),
          alignItems: "center",
        },
      }),
    [scaleW, scaleH]
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
            contentContainerStyle={{ paddingBottom: scaleH(40) }}
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

        {/* Page 2 */}
        <View style={styles.page}>
          <View style={styles.page2Container}>
            <ThemedText
              type="heading"
              style={{ fontSize: scaleW(22), color: TEXT_SECONDARY, marginBottom: scaleH(16) }}
            >
              Step 2
            </ThemedText>
            <ThemedText
              style={{ fontSize: scaleW(16), color: "#333", textAlign: "center" }}
            >
              Continue building your laser fortress with your team.
            </ThemedText>
            <View style={styles.navRow}>
              <Pressable style={styles.navButton} onPress={() => goToPage(0)}>
                <ThemedText type="heading" style={styles.completeButtonText}>Back</ThemedText>
              </Pressable>
              <Pressable style={styles.navButton} onPress={() => goToPage(2)}>
                <ThemedText type="heading" style={styles.completeButtonText}>Next</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Page 3 */}
        <View style={styles.page}>
          <View style={styles.page3Container}>
            <ThemedText
              type="heading"
              style={{ fontSize: scaleW(22), color: TEXT_SECONDARY, marginBottom: scaleH(16) }}
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
