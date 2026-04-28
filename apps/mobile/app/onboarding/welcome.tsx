import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Asset } from "expo-asset";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useUser } from "@/contexts/UserContext";
import { START_MISSION_STEP } from "@/constants/startMissionOnboarding";

const BG = "#4F6F52";
const CREAM = "#F4F0EB";
const EXPLORER_BADGE = require("@/assets/images/explorer-badge.png");

export default function OnboardingWelcomeScreen() {
  const { scaleW } = useLayoutScale();
  const { userData, updateStartMissionStep } = useUser();
  const [saving, setSaving] = useState(false);
  const [badgeReady, setBadgeReady] = useState(false);
  const spinY = useSharedValue(0);

  useEffect(() => {
    let mounted = true;
    Asset.loadAsync(EXPLORER_BADGE)
      .then(() => {
        if (mounted) setBadgeReady(true);
      })
      .catch(() => {
        if (mounted) setBadgeReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!badgeReady) return;
    spinY.value = 0;
    spinY.value = withTiming(360, {
      duration: 950,
      easing: Easing.out(Easing.cubic) });
  }, [badgeReady, spinY]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateY: `${spinY.value}deg` },
    ] }));

  const handleSpinBadge = useCallback(() => {
    const nextFullTurn = Math.ceil(spinY.value / 360) + 1;
    spinY.value = withTiming(nextFullTurn * 360, {
      duration: 850,
      easing: Easing.out(Easing.cubic) });
  }, [spinY]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: BG },
        content: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: scaleW(24),
          gap: scaleW(24) },
        title: {
          fontSize: scaleW(36),
          fontWeight: "700",
          color: CREAM,
          textAlign: "center" },
        badge: {
          width: scaleW(220),
          height: scaleW(220) },
        badgeWrap: {
          width: scaleW(220),
          height: scaleW(220),
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: scaleW(10) },
          shadowOpacity: 0.28,
          shadowRadius: scaleW(14),
          elevation: 10 },
        badgePlaceholder: {
          width: scaleW(220),
          height: scaleW(220) },
        cta: {
          minWidth: scaleW(220),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(28),
          borderRadius: scaleW(30),
          backgroundColor: CREAM,
          alignItems: "center" },
        ctaText: {
          fontSize: scaleW(20),
          fontWeight: "700",
          color: BG } }),
    [scaleW]
  );

  const handleContinue = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      if ((userData?.start_mission_step ?? 0) < START_MISSION_STEP.TEASER) {
        await updateStartMissionStep(START_MISSION_STEP.TEASER);
      }
      router.replace("/onboarding/teaser");
    } finally {
      setSaving(false);
    }
  }, [saving, updateStartMissionStep, userData?.start_mission_step]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      {badgeReady ? (
        <View style={styles.content}>
          <Animated.View>
            <ThemedText style={styles.title}>Welcome Explorer!</ThemedText>
          </Animated.View>
          <Pressable onPress={handleSpinBadge} accessibilityRole="button" accessibilityLabel="Spin badge">
            <Animated.View style={[styles.badgeWrap, badgeAnimatedStyle]}>
              <Image
                source={EXPLORER_BADGE}
                style={styles.badge}
                resizeMode="contain"
                fadeDuration={Platform.OS === "android" ? 0 : undefined}
              />
            </Animated.View>
          </Pressable>
          <Pressable style={styles.cta} onPress={handleContinue} disabled={saving}>
            <ThemedText style={styles.ctaText}>Continue</ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.content} />
      )}
    </SafeAreaView>
  );
}
