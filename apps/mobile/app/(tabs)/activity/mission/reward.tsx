import React, { useMemo, useEffect } from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  Text,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import { useRouter, useNavigation } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { MissionCard } from "@/components/MissionCard";
import { MISSION_CARDS } from "@/constants/missionCards";

const HUNTLY_GREEN = "#4F6F52";
const LIGHT_GREEN = "#7FAF8A";
const CARD_GRAY = "#D9D9D9";

const BADGE_ICON = require("@/assets/images/badge.png");
const STAR_ICON = require("@/assets/images/get-started-icon-2.png");
const CELEBRATE_ICON = require("@/assets/images/celebrate.png");

const COMPLETION_CARD = MISSION_CARDS[0];

export default function RewardScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { scaleW } = useLayoutScale();

  const celebrateScale = useSharedValue(0.85);
  const goHomeScale = useSharedValue(1);
  const cardCelebrateStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrateScale.value }],
  }));
  const goHomeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: goHomeScale.value }],
  }));

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      e.preventDefault();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    celebrateScale.value = withSequence(
      withDelay(200, withSpring(1.12, { damping: 10, stiffness: 180 })),
      withSpring(1, { damping: 14, stiffness: 120 })
    );
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: LIGHT_GREEN },
        scroll: {
          flex: 1,
          paddingHorizontal: scaleW(24),
          paddingTop: scaleW(60),
          paddingBottom: scaleW(48),
        },
        cardWrap: {
          alignSelf: "center",
          marginBottom: scaleW(52),
          position: "relative",
        },
        completionBadge: {
          position: "absolute",
          right: scaleW(-8),
          bottom: scaleW(-8),
          width: scaleW(56),
          height: scaleW(56),
          zIndex: 1,
        },
        wellDoneHeading: {
          fontSize: scaleW(22),
          fontWeight: "700",
          color: "#000",
          textAlign: "center",
          marginBottom: scaleW(28),
        },
        achievementTimeline: {
          alignItems: "center",
          gap: scaleW(24),
          paddingBottom: scaleW(24),
        },
        achievementCard: {
          backgroundColor: CARD_GRAY,
          width: scaleW(240),
          flexDirection: "row",
        },
        achievementIcon: {
          width: scaleW(100),
          height: scaleW(120),
          borderTopRightRadius: "50%",
          borderBottomRightRadius: "50%",
          backgroundColor: "#FFF",
          alignItems: "center",
          justifyContent: "center",
          marginRight: scaleW(14),
        },
        achievementIconImage: {
          width: scaleW(50),
          height: scaleW(50),
        },
        achievementText: {
          flex: 1,
          justifyContent: "space-between",
          paddingHorizontal: scaleW(6),
          paddingVertical: scaleW(16),
        },
        achievementTitle: {
          fontSize: scaleW(15),
          fontWeight: "600",
          color: "#000",
          marginBottom: 2,
        },
        achievementPoints: {
          fontSize: scaleW(13),
          color: "#000",
          opacity: 0.7,
        },
        goHomeButton: {
          backgroundColor: "#FFF",
          paddingVertical: scaleW(14),
          borderRadius: scaleW(24),
          alignItems: "center",
          marginHorizontal: scaleW(52),
          marginTop: scaleW(32),
          marginBottom: scaleW(64),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2,
        },
        goHomeButtonText: {
          fontSize: scaleW(17),
          fontWeight: "600",
          color: HUNTLY_GREEN,
        },
      }),
    [scaleW]
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
        <Animated.View
          entering={FadeInDown.duration(500).delay(0).springify().damping(18)}
          style={[styles.cardWrap, cardCelebrateStyle]}
        >
          <MissionCard
            card={COMPLETION_CARD}
            tiltDeg={0}
            marginTopOffset={0}
            onStartPress={() => {}}
          />
          <Image
            source={BADGE_ICON}
            style={styles.completionBadge}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200).springify().damping(18)}>
          <Text style={styles.wellDoneHeading}>Well done!</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(350).springify().damping(18)}
          style={styles.achievementTimeline}
        >
          <View style={styles.achievementCard}>
            <View style={styles.achievementIcon}>
              <Image
                source={CELEBRATE_ICON}
                style={styles.achievementIconImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.achievementText}>
              <Text style={styles.achievementTitle}>Completed an activity</Text>
              <Text style={styles.achievementPoints}>+ 50 points</Text>
            </View>
          </View>

          <Animated.View entering={FadeInDown.duration(400).delay(450).springify().damping(18)}>
            <View style={styles.achievementCard}>
              <View style={styles.achievementIcon}>
                <Image
                  source={STAR_ICON}
                  style={styles.achievementIconImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.achievementText}>
                <Text style={styles.achievementTitle}>Earned a badge</Text>
                <Text style={styles.achievementPoints}>+ 50 points</Text>
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(550).springify().damping(18)}
          style={goHomeAnimatedStyle}
        >
          <Pressable
            style={styles.goHomeButton}
            onPress={() => router.replace("/(tabs)")}
            onPressIn={() => {
              goHomeScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
            }}
            onPressOut={() => {
              goHomeScale.value = withSpring(1, { damping: 15, stiffness: 400 });
            }}
          >
            <ThemedText type="heading" style={styles.goHomeButtonText}>
              Go Home
            </ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
