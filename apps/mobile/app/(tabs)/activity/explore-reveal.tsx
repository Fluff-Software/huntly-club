import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable, StyleSheet, Dimensions, InteractionManager } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ConfettiCannon from "react-native-confetti-cannon";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useRouter, useNavigation, useLocalSearchParams } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ExploreCard } from "@/components/ExploreCard";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import {
  EXPLORE_RARITY_COLORS,
  EXPLORE_RARITY_LABELS,
  EXPLORE_SHINY_GLOW_COLOR,
  type ExploreCollectibleRarity,
} from "@/constants/exploreColors";
import { checkAndAwardBadges } from "@/services/badgeService";
import type { ExploreCheckInResult } from "@/services/exploreCheckInService";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const DARK_BG = "#1C2333";
const CONFETTI_PARTICLE_COUNT = 100;
const PACK_WIDTH = 220;
const PACK_HEIGHT = 300;
const PACK_HEADER_HEIGHT = PACK_HEIGHT * 0.3;

const SPECTACLE_BY_RARITY: Record<ExploreCollectibleRarity, { confetti: boolean; haptics: "light" | "heavy" }> = {
  common: { confetti: false, haptics: "light" },
  uncommon: { confetti: false, haptics: "light" },
  rare: { confetti: true, haptics: "light" },
  epic: { confetti: true, haptics: "heavy" },
  legendary: { confetti: true, haptics: "heavy" },
};

type RevealRouteParams = {
  profileId?: string;
  result?: string;
};

function parseResult(raw?: string): Extract<ExploreCheckInResult, { success: true }> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ExploreCheckInResult;
    return parsed.success ? parsed : null;
  } catch {
    return null;
  }
}

export default function ExploreRevealScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<RevealRouteParams>();
  const { scaleW } = useLayoutScale();

  const result = useMemo(() => parseResult(params.result), [params.result]);
  const profileId = params.profileId ? Number(params.profileId) : null;

  const [opened, setOpened] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [badgeNotice, setBadgeNotice] = useState<string | null>(null);

  const packTopOffset = useSharedValue(0);
  const packTopRotate = useSharedValue(0);
  const packTopOpacity = useSharedValue(1);
  const flashOpacity = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const cardRotate = useSharedValue(0);
  const artOpacity = useSharedValue(0);

  const packTopAnimatedStyle = useAnimatedStyle(() => ({
    opacity: packTopOpacity.value,
    transform: [{ translateY: packTopOffset.value }, { rotate: `${packTopRotate.value}deg` }],
  }));
  const flashAnimatedStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }, { rotateY: `${cardRotate.value}deg` }],
  }));
  const artAnimatedStyle = useAnimatedStyle(() => ({ opacity: artOpacity.value }));

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (!opened) e.preventDefault();
    });
    return unsubscribe;
  }, [navigation, opened]);

  useEffect(() => {
    if (!profileId) return;
    checkAndAwardBadges("", profileId).then((badges) => {
      if (badges.length > 0) setBadgeNotice(`You unlocked a badge: ${badges[0]!.name}`);
    });
  }, [profileId]);

  const rarityColor = result ? EXPLORE_RARITY_COLORS[result.collectibleRarity] : "#666666";
  const spectacle = result ? SPECTACLE_BY_RARITY[result.collectibleRarity] : null;
  const shouldConfetti = Boolean(spectacle?.confetti || result?.isShiny);

  const styles2 = useMemo(
    () =>
      StyleSheet.create({
        rarityBadge: {
          alignSelf: "center",
          marginTop: scaleW(14),
          paddingHorizontal: scaleW(16),
          paddingVertical: scaleW(6),
          borderRadius: scaleW(16),
          backgroundColor: rarityColor },
        rarityBadgeText: { color: "#FFF", fontWeight: "800", fontSize: scaleW(13) },
        shinyBadge: {
          alignSelf: "center",
          marginTop: scaleW(8),
          paddingHorizontal: scaleW(16),
          paddingVertical: scaleW(6),
          borderRadius: scaleW(16),
          backgroundColor: EXPLORE_SHINY_GLOW_COLOR },
        shinyBadgeText: { color: "#1C2333", fontWeight: "800", fontSize: scaleW(13) } }),
    [scaleW, rarityColor]
  );

  if (!result || !spectacle) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedText style={styles.fallbackText}>Nothing to show here.</ThemedText>
        <Pressable style={styles.fallbackButton} onPress={() => router.replace("/(tabs)")}>
          <ThemedText style={styles.fallbackButtonText}>Go Home</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  const handleOpen = () => {
    if (opened) return;
    setOpened(true);

    if (spectacle.haptics === "heavy") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Beat 1: tear the pack-top away.
    packTopOffset.value = withTiming(-PACK_HEIGHT * 0.7, { duration: 220 });
    packTopRotate.value = withTiming(-18, { duration: 220 });
    packTopOpacity.value = withTiming(0, { duration: 200 });

    // Beat 2: flash, overlapping the tear.
    flashOpacity.value = withSequence(withTiming(0.8, { duration: 100 }), withTiming(0, { duration: 260 }));

    // Beat 3: flip-and-spring reveal of the card face.
    cardRotate.value = withSequence(withTiming(90, { duration: 180 }), withTiming(0, { duration: 180 }));
    cardScale.value = withSequence(
      withSpring(1.12, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 140 })
    );
    artOpacity.value = withTiming(1, { duration: 200 });

    if (shouldConfetti) {
      const task = InteractionManager.runAfterInteractions(() => setShowConfetti(true));
      return () => task.cancel();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Animated.View style={[styles.pack, cardAnimatedStyle]}>
          <LinearGradient
            colors={result.isShiny ? ["#FFF7D6", "#FFD700", "#FFF7D6"] : ["#3A4A6B", "#232B41"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.packBody, { borderColor: rarityColor }]}
          >
            {!opened ? (
              <Pressable style={styles.mysteryFace} onPress={handleOpen}>
                <ThemedText style={styles.mysteryQuestion}>?</ThemedText>
                <ThemedText style={styles.tapToOpen}>Tap to open your pack</ThemedText>
              </Pressable>
            ) : (
              <Animated.View style={[styles.artWrap, artAnimatedStyle]}>
                <ExploreCard
                  collectible={{
                    name: result.collectibleName,
                    image_url: result.collectibleImageUrl,
                    rarity: result.collectibleRarity,
                  }}
                  isShiny={result.isShiny}
                  size={PACK_WIDTH - 40}
                  interactiveTilt
                  showName={false}
                />
              </Animated.View>
            )}
          </LinearGradient>

          <Animated.View style={[styles.packHeader, packTopAnimatedStyle]}>
            <LinearGradient
              colors={["#E8EDF7", "#B7C4E0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.packHeaderGradient}
            >
              <ThemedText style={styles.packHeaderText}>RIP HERE</ThemedText>
            </LinearGradient>
          </Animated.View>

          <Animated.View style={[styles.flashOverlay, flashAnimatedStyle]} pointerEvents="none" />
        </Animated.View>

        {opened && (
          <Animated.View entering={FadeInDown.duration(280)} style={{ alignItems: "center" }}>
            <View style={styles2.rarityBadge}>
              <ThemedText style={styles2.rarityBadgeText}>
                {EXPLORE_RARITY_LABELS[result.collectibleRarity]}
              </ThemedText>
            </View>
            {result.isShiny && (
              <View style={styles2.shinyBadge}>
                <ThemedText style={styles2.shinyBadgeText}>✨ Shiny</ThemedText>
              </View>
            )}
            <ThemedText type="heading" style={styles.collectibleName}>
              {result.collectibleName}
            </ThemedText>
            {result.collectibleFlavorText && (
              <ThemedText style={styles.flavorText}>{result.collectibleFlavorText}</ThemedText>
            )}
            <ThemedText style={styles.statusText}>
              {result.isNewCollectible ? "NEW! Added to your binder" : `Collection growing! ×${result.newCount}`}
            </ThemedText>
            <ThemedText style={styles.xpText}>+{result.xpAwarded} XP</ThemedText>

            {result.isFirstShiny && (
              <ThemedText style={styles.shinyNotice}>
                ✨ You found your first shiny {result.collectibleName}!
              </ThemedText>
            )}
            {badgeNotice && <ThemedText style={styles.badgeNotice}>{badgeNotice}</ThemedText>}

            <View style={styles.buttonRow}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() =>
                  router.replace({
                    pathname: "/(tabs)/activity/explore-collection",
                    params: { profileId: String(profileId ?? "") },
                  })
                }
              >
                <ThemedText style={styles.secondaryButtonText}>View Binder</ThemedText>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={() => router.back()}>
                <ThemedText style={styles.primaryButtonText}>Keep Exploring</ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>

      {showConfetti ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="none">
          <ConfettiCannon
            count={CONFETTI_PARTICLE_COUNT}
            origin={{ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 - 40 }}
            explosionSpeed={350}
            fallSpeed={3500}
            fadeOut
            autoStart
            colors={
              result.isShiny
                ? [EXPLORE_SHINY_GLOW_COLOR, "#FFFFFF", "#7FD8FF"]
                : [rarityColor, "#FFD700", "#FFFFFF"]
            }
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  pack: { width: PACK_WIDTH, height: PACK_HEIGHT, marginBottom: 24 },
  packBody: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
    overflow: "hidden" },
  packHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: PACK_HEADER_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden" },
  packHeaderGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderStyle: "dashed",
    borderBottomColor: "#8A93A6" },
  packHeaderText: { fontSize: 14, fontWeight: "900", color: "#4A5568", letterSpacing: 2 },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    borderRadius: 24 },
  mysteryFace: { alignItems: "center", justifyContent: "center", width: "100%", height: "100%" },
  mysteryQuestion: { fontSize: 72, fontWeight: "900", color: "#FFF" },
  tapToOpen: { marginTop: 8, color: "rgba(255,255,255,0.7)", fontWeight: "700" },
  artWrap: { alignItems: "center", justifyContent: "center" },
  collectibleName: { marginTop: 12, fontSize: 24, fontWeight: "800", color: "#FFF", textAlign: "center" },
  flavorText: {
    marginTop: 6,
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    paddingHorizontal: 16 },
  statusText: { marginTop: 12, fontSize: 15, fontWeight: "700", color: "#FFD700" },
  xpText: { marginTop: 4, fontSize: 15, fontWeight: "700", color: "#7FE0A0" },
  shinyNotice: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800",
    color: "#FFD700",
    textAlign: "center" },
  badgeNotice: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 24 },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#FFF" },
  secondaryButtonText: { color: "#FFF", fontWeight: "800" },
  primaryButton: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 24, backgroundColor: "#3E63C9" },
  primaryButtonText: { color: "#FFF", fontWeight: "800" },
  fallbackText: { color: "#FFF", textAlign: "center", marginTop: 100 },
  fallbackButton: { alignSelf: "center", marginTop: 20, padding: 12 },
  fallbackButtonText: { color: "#FFF", fontWeight: "800" },
});
