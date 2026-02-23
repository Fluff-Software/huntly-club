import React, { useMemo, useEffect, useState, useRef } from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  Text,
  StyleSheet,
  Dimensions,
  type ImageSourcePropType,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useRouter, useNavigation, useLocalSearchParams } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { MissionCard } from "@/components/MissionCard";
import { getActivityById, getActivityImageSource } from "@/services/packService";
import type { MissionCardData } from "@/constants/missionCards";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const HUNTLY_GREEN = "#4F6F52";
const LIGHT_GREEN = "#7FAF8A";
const POINTS_GREEN = "#2D5A27";
const STAMP_GREEN = "#84CC16"; // lime green stamp

const ACHIEVEMENT_CARD_COLORS = ["#FFF5E8", "#E8F5F0", "#F0E8FF", "#E8F0FF", "#FFF0F0"];
const ACHIEVEMENT_ICON_BG = ["#F7A676", "#7FAF8A", "#A8D5E5", "#D4A05A", "#C97B6C"];

const BADGE_ICON = require("@/assets/images/badge.png");
const CELEBRATE_ICON = require("@/assets/images/celebrate.png");

const DEFAULT_CARD_IMAGE = require("@/assets/images/laser-fortress.jpg");

type RewardAchievement = { profile_name: string; message: string; xp: number };

export default function RewardScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { scaleW } = useLayoutScale();
  const params = useLocalSearchParams<{ activityId?: string; achievements?: string }>();

  const [activityCard, setActivityCard] = useState<MissionCardData | null>(null);
  const [activityXp, setActivityXp] = useState<number | null>(null);
  const [achievements, setAchievements] = useState<RewardAchievement[]>([]);

  useEffect(() => {
    const activityId = params.activityId ? Number(params.activityId) : null;
    if (!activityId) return;
    getActivityById(activityId)
      .then((activity) => {
        if (!activity) return;
        const imageSource = getActivityImageSource(activity.image) as ImageSourcePropType | null;
        setActivityCard({
          id: String(activity.id),
          image: imageSource ?? DEFAULT_CARD_IMAGE,
          title: activity.title,
          description: activity.description ?? "",
        });
        setActivityXp(activity.xp ?? null);
      })
      .catch(() => {
        setActivityCard(null);
        setActivityXp(null);
      });
  }, [params.activityId]);

  useEffect(() => {
    try {
      const raw = params.achievements;
      if (raw) {
        const parsed = JSON.parse(raw) as RewardAchievement[];
        setAchievements(Array.isArray(parsed) ? parsed : []);
      } else {
        setAchievements([]);
      }
    } catch {
      setAchievements([]);
    }
  }, [params.achievements]);

  const confettiRef = useRef<ConfettiCannon>(null);
  const celebrateScale = useSharedValue(0.85);
  const goHomeScale = useSharedValue(1);
  const stampScale = useSharedValue(1.5);
  const stampOpacity = useSharedValue(0);

  const cardCelebrateStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrateScale.value }],
  }));
  const goHomeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: goHomeScale.value }],
  }));
  const stampAnimatedStyle = useAnimatedStyle(() => ({
    opacity: stampOpacity.value,
    transform: [{ rotate: "-12deg" }, { scale: stampScale.value }],
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

  const runStampAnimation = () => {
    stampOpacity.value = 0;
    stampScale.value = 1.5;
    stampOpacity.value = withDelay(800, withTiming(1, { duration: 120, easing: Easing.out(Easing.ease) }));
    stampScale.value = withDelay(800, withSpring(1, { damping: 9, stiffness: 280 }));
  };

  useEffect(() => {
    runStampAnimation();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => confettiRef.current?.start?.(), 0);
    return () => clearTimeout(t);
  }, []);

  const handleReplay = () => {
    confettiRef.current?.stop?.();
    setTimeout(() => {
      confettiRef.current?.start?.();
    }, 80);
    runStampAnimation();
  };

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
          backgroundColor: "#FFF",
          borderRadius: scaleW(28),
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2,
        },
        completionBadgeImage: {
          width: scaleW(56),
          height: scaleW(56),
          padding: scaleW(4),
        },
        stampOverlay: {
          ...StyleSheet.absoluteFillObject,
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2,
        },
        stampBox: {
          borderWidth: scaleW(3),
          borderColor: STAMP_GREEN,
          borderRadius: scaleW(8),
          paddingHorizontal: scaleW(20),
          paddingVertical: scaleW(12),
          minWidth: scaleW(260),
          alignItems: "center",
        },
        stampTextContainer: {
          padding: scaleW(1),
          overflow: "visible" as const,
          position: "relative" as const,
        },
        stampTextStroke: {
          position: "absolute" as const,
          fontSize: scaleW(28),
          fontWeight: "800",
          color: "#000",
          letterSpacing: scaleW(2),
        },
        stampTextFill: {
          fontSize: scaleW(28),
          fontWeight: "800",
          color: STAMP_GREEN,
          letterSpacing: scaleW(2),
        },
        wellDoneHeading: {
          fontSize: scaleW(26),
          fontWeight: "700",
          color: POINTS_GREEN,
          textAlign: "center",
          marginBottom: scaleW(28),
        },
        achievementTimeline: {
          alignItems: "center",
          gap: scaleW(20),
          paddingBottom: scaleW(24),
          paddingHorizontal: scaleW(20),
          position: "relative" as const,
        },
        achievementCard: {
          width: "100%",
          maxWidth: scaleW(340),
          flexDirection: "row",
          borderRadius: scaleW(20),
          overflow: "hidden" as const,
          padding: scaleW(16),
          shadowColor: "#4F6F52",
          shadowOpacity: 0.12,
          shadowRadius: scaleW(12),
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
          borderWidth: 3,
          borderColor: "rgba(255,255,255,0.9)",
        },
        achievementIcon: {
          width: scaleW(56),
          height: scaleW(56),
          borderRadius: scaleW(28),
          alignItems: "center",
          justifyContent: "center",
          marginRight: scaleW(16),
        },
        achievementIconImage: {
          width: scaleW(32),
          height: scaleW(32),
        },
        achievementText: {
          flex: 1,
          justifyContent: "center",
          paddingVertical: scaleW(4),
        },
        achievementTitle: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: "#1a1a1a",
          marginBottom: scaleW(4),
          lineHeight: scaleW(22),
        },
        achievementPoints: {
          fontSize: scaleW(15),
          fontWeight: "700",
          color: POINTS_GREEN,
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
        replayButton: {
          position: "absolute",
          top: scaleW(56),
          right: scaleW(12),
          zIndex: 10000,
          paddingVertical: scaleW(8),
          paddingHorizontal: scaleW(14),
          backgroundColor: "rgba(0,0,0,0.5)",
          borderRadius: scaleW(8),
        },
        replayButtonText: {
          fontSize: scaleW(13),
          fontWeight: "600",
          color: "#FFF",
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
          {activityCard && (
            <>
              <MissionCard
                card={activityCard}
                xp={activityXp}
                tiltDeg={0}
                marginTopOffset={0}
                showStartButton={false}
              />
              <View style={styles.stampOverlay} pointerEvents="none">
                <Animated.View style={[styles.stampBox, stampAnimatedStyle]}>
                  <View style={styles.stampTextContainer}>
                    {[
                      { left: 0, top: 0 },
                      { left: scaleW(2), top: 0 },
                      { left: 0, top: scaleW(2) },
                      { left: scaleW(2), top: scaleW(2) },
                      { left: scaleW(1), top: 0 },
                      { left: 0, top: scaleW(1) },
                      { left: scaleW(2), top: scaleW(1) },
                      { left: scaleW(1), top: scaleW(2) },
                    ].map((pos, i) => (
                      <Text key={i} style={[styles.stampTextStroke, { left: pos.left, top: pos.top }]} numberOfLines={1}>
                        COMPLETED
                      </Text>
                    ))}
                    <Text style={styles.stampTextFill} numberOfLines={1}>COMPLETED</Text>
                  </View>
                </Animated.View>
              </View>
              <View style={styles.completionBadge}>
                <Image
                  source={BADGE_ICON}
                  style={styles.completionBadgeImage}
                  resizeMode="contain"
                />
              </View>
            </>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200).springify().damping(18)}>
          <Text style={styles.wellDoneHeading}>Well done!</Text>
        </Animated.View>

        {achievements.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(500).delay(350).springify().damping(18)}
            style={styles.achievementTimeline}
          >
            {achievements.map((item, index) => {
              const cardBg = ACHIEVEMENT_CARD_COLORS[index % ACHIEVEMENT_CARD_COLORS.length];
              const iconBg = ACHIEVEMENT_ICON_BG[index % ACHIEVEMENT_ICON_BG.length];
              return (
                <Animated.View
                  key={`${item.profile_name}-${index}`}
                  entering={FadeInDown.duration(400).delay(450 + index * 60).springify().damping(18)}
                  style={{ zIndex: 1, width: "100%", alignItems: "center" }}
                >
                  <View
                    style={[
                      styles.achievementCard,
                      {
                        backgroundColor: cardBg,
                        transform: [{ rotate: index % 2 === 0 ? "-1.5deg" : "1.5deg" }],
                      },
                    ]}
                  >
                    <View style={[styles.achievementIcon, { backgroundColor: iconBg }]}>
                      <Image
                        source={CELEBRATE_ICON}
                        style={styles.achievementIconImage}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.achievementText}>
                      <Text style={styles.achievementTitle}>
                        {item.profile_name} {item.message}
                      </Text>
                      <Text style={styles.achievementPoints}>+ {item.xp} points</Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}

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
      <Pressable style={styles.replayButton} onPress={handleReplay}>
        <Text style={styles.replayButtonText}>Replay</Text>
      </Pressable>
      <View
        style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}
        pointerEvents="none"
      >
        <ConfettiCannon
          ref={confettiRef}
          count={200}
          origin={{ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 - scaleW(40) }}
          explosionSpeed={350}
          fallSpeed={3500}
          fadeOut
          autoStart={false}
          colors={[
            "#FF1493",
            "#00C853",
            "#FF8C00",
            "#FFD700",
            "#00BCD4",
            "#E91E8C",
            "#FFA500",
            "#26A69A",
          ]}
        />
      </View>
    </SafeAreaView>
  );
}
