import React, { useMemo } from "react";
import { View, ScrollView, Image, Pressable, StyleSheet } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const TEXT_SECONDARY = "#2F3336";
const LIGHT_GREEN = "#7FAF8A";
const LIGHT_BG = "#f8f8f8";
const CREAM = "#F6F5F1";
const HUNTLY_GREEN = "#4F6F52";

const LASER_FORTRESS = require("@/assets/images/laser-fortress.jpg");
const PLANTING = require("@/assets/images/planting.png");
const BUILDING = require("@/assets/images/building.png");
const ACTIVITY_1 = require("@/assets/images/activity-1.png");
const ACTIVITY_2 = require("@/assets/images/activity-2.png");
const CLUB_1 = require("@/assets/images/club-1.png");
const CLUB_2 = require("@/assets/images/club-2.png");

export default function InstructionScreen() {
  const router = useRouter();
  const { scaleW } = useLayoutScale();

  const completeScale = useSharedValue(1);
  const completeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completeScale.value }],
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
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
        teamRow: { gap: scaleW(32) },
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
          borderColor: "#FFF",
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
      }),
    [scaleW]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.pageInner}
        contentContainerStyle={{ paddingBottom: scaleW(40) }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(500).delay(0).springify().damping(18)}
          style={styles.titleContainer}
        >
          <ThemedText type="heading" style={styles.titleText}>
            Build a laser fortress
          </ThemedText>
          <Image
            source={LASER_FORTRESS}
            style={styles.mainImage}
            resizeMode="cover"
          />
          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Image source={PLANTING} style={styles.tagIcon} resizeMode="contain" />
              <ThemedText style={styles.tagText}>Nature</ThemedText>
            </View>
            <View style={styles.tag}>
              <Image source={BUILDING} style={styles.tagIcon} resizeMode="contain" />
              <ThemedText style={styles.tagText}>Building</ThemedText>
            </View>
          </View>
          <View style={styles.descriptionBox}>
            <ThemedText style={styles.descriptionText}>
              Set up a strong defence to help keep the gem safe.
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(150).springify().damping(18)}
          style={styles.section}
        >
          <ThemedText type="heading" style={styles.sectionTitle}>
            What to do
          </ThemedText>
          <Animated.View entering={FadeInDown.duration(400).delay(200).springify().damping(18)} style={styles.taskRow}>
            <ThemedText style={styles.taskText}>
              1. Ad deserunt duis exercitation non nostrud Lorem incididunt eu
              mollit reprehenderit dolore
            </ThemedText>
            <Image source={ACTIVITY_1} style={styles.taskImage} resizeMode="cover" />
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(400).delay(280).springify().damping(18)} style={styles.taskRow}>
            <ThemedText style={styles.taskText}>
              2. Ad deserunt duis exercitation non nostrud Lorem incididunt eu
              mollit reprehenderit dolore
            </ThemedText>
            <Image source={ACTIVITY_2} style={styles.taskImage} resizeMode="cover" />
          </Animated.View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(380).springify().damping(18)}
          style={styles.section}
        >
          <ThemedText type="heading" style={styles.sectionTitle}>
            Hints
          </ThemedText>
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
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(480).springify().damping(18)}
          style={styles.section}
        >
          <View>
            <ThemedText type="heading" style={styles.sectionTitle}>
              Your team
            </ThemedText>
            <ThemedText style={styles.sectionDescription}>
              See submissions from other people in your team...
            </ThemedText>
          </View>
          <View style={styles.teamRow}>
            <View style={styles.polaroid}>
              <Image source={CLUB_1} style={styles.polaroidImage} resizeMode="cover" />
            </View>
            <View style={[styles.polaroid, styles.polaroidSecond]}>
              <Image source={CLUB_2} style={styles.polaroidImage} resizeMode="cover" />
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(580).springify().damping(18)}
          style={completeAnimatedStyle}
        >
          <Pressable
            style={styles.completeButton}
            onPress={() => router.push("/(tabs)/activity/mission/completion")}
            onPressIn={() => {
              completeScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
            }}
            onPressOut={() => {
              completeScale.value = withSpring(1, { damping: 15, stiffness: 400 });
            }}
          >
            <ThemedText type="heading" style={styles.completeButtonText}>
              Complete
            </ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
