import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Text,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { getActivityById, getActivityImageSource } from "@/services/packService";
import { useUser } from "@/contexts/UserContext";
import { isStartMissionOnboardingActive } from "@/constants/startMissionOnboarding";
import type { Activity } from "@/types/activity";
import type { MissionStep } from "@/types/activity";

const LIGHT_GREEN_HEADER = "#7FAF8A";
const DARK_BG = "#2F3336";
const TIP_BG = "rgba(127, 175, 138, 0.12)";
const HUNTLY_GREEN = "#4F6F52";

function buildSteps(activity: Activity): MissionStep[] {
  return activity.steps ?? [];
}

export default function StepsScreen() {
  const router = useRouter();
  const { id, step } = useLocalSearchParams<{ id?: string; step?: string }>();
  const { scaleW, isTablet } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const { userData } = useUser();
  const onboardingActive = isStartMissionOnboardingActive(userData?.start_mission_step);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = Math.max(0, parseInt(step ?? "0", 10) || 0);
  const steps = useMemo(() => (activity ? buildSteps(activity) : []), [activity]);
  const totalSteps = steps.length;
  const currentStep = totalSteps > 0 ? steps[stepIndex] : null;
  const isLastStep = totalSteps > 0 && stepIndex === totalSteps - 1;

  const loadActivity = useCallback(async () => {
    if (!id) {
      setError("No activity selected");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await getActivityById(Number(id));
      setActivity(data ?? null);
      if (!data) setError("Activity not found");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
      setActivity(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const backScale = useSharedValue(1);
  const doneScale = useSharedValue(1);
  const backStyle = useAnimatedStyle(() => ({ transform: [{ scale: backScale.value }] }));
  const doneStyle = useAnimatedStyle(() => ({ transform: [{ scale: doneScale.value }] }));

  const handleBack = () => {
    if (!activity?.id) return;
    if (stepIndex > 0) {
      router.setParams({ step: String(stepIndex - 1) });
    } else {
      router.replace({
        pathname: "/(tabs)/activity/mission/prep",
        params: { id: String(activity.id) },
      });
    }
  };

  const handleDone = () => {
    if (!activity?.id) return;
    if (isLastStep) {
      router.push({
        pathname: "/(tabs)/activity/mission/completion",
        params: { id: String(activity.id) },
      });
    } else {
      router.setParams({ step: String(stepIndex + 1) });
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: LIGHT_GREEN_HEADER },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: scaleW(24),
        },
        errorText: { fontSize: scaleW(17), color: "#FFF", textAlign: "center" },
        header: {
          backgroundColor: LIGHT_GREEN_HEADER,
          paddingTop: scaleW(20),
          paddingBottom: scaleW(24),
          paddingHorizontal: scaleW(20),
          borderBottomLeftRadius: scaleW(24),
          borderBottomRightRadius: scaleW(24),
        },
        missionTitle: {
          fontSize: scaleW(16),
          color: "rgba(47,51,54,0.8)",
          marginBottom: scaleW(8),
        },
        stepLabel: {
          fontSize: scaleW(28),
          fontWeight: "800",
          color: "#FFF",
        },
        stepLabelSmall: { fontSize: scaleW(18), fontWeight: "600", color: "rgba(255,255,255,0.8)" },
        progressRow: {
          flexDirection: "row",
          gap: scaleW(8),
          marginTop: scaleW(12),
        },
        progressLine: {
          flex: 1,
          height: scaleW(4),
          borderRadius: 2,
          backgroundColor: "rgba(255,255,255,0.5)",
        },
        progressLineDone: { backgroundColor: "#FFF" },
        scroll: { flex: 1, backgroundColor: DARK_BG },
        scrollContent: { padding: scaleW(20), paddingBottom: scaleW(24) },
        mediaPlaceholder: {
          width: "100%",
          height: scaleW(220),
          borderRadius: scaleW(16),
          backgroundColor: "rgba(255,255,255,0.1)",
          marginBottom: scaleW(20),
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: "rgba(255,255,255,0.3)",
          alignItems: "center",
          justifyContent: "center",
        },
        mediaImage: {
          width: "100%",
          height: scaleW(220),
          borderRadius: scaleW(16),
          marginBottom: scaleW(20),
        },
        instructionText: {
          fontSize: scaleW(20),
          fontWeight: "700",
          color: "#FFF",
          marginBottom: scaleW(16),
          lineHeight: scaleW(28),
        },
        tipCard: {
          backgroundColor: TIP_BG,
          borderRadius: scaleW(14),
          paddingVertical: scaleW(12),
          paddingHorizontal: scaleW(16),
          borderLeftWidth: scaleW(4),
          borderLeftColor: HUNTLY_GREEN,
        },
        tipText: { fontSize: scaleW(15), color: "rgba(255,255,255,0.9)", lineHeight: scaleW(22) },
        footer: {
          flexDirection: "row",
          gap: scaleW(12),
          backgroundColor: DARK_BG,
          paddingTop: scaleW(12),
          paddingHorizontal: scaleW(20),
          paddingBottom:
            insets.bottom +
            (onboardingActive ? scaleW(20) : scaleW(12)) +
            (isTablet ? scaleW(36) : 0),
          marginBottom: onboardingActive ? 0 : scaleW(24),
        },
        backButton: {
          flex: 1,
          backgroundColor: "rgba(255,255,255,0.15)",
          borderRadius: scaleW(24),
          minHeight: scaleW(56),
          alignItems: "center",
          justifyContent: "center",
        },
        doneButton: {
          flex: 1,
          backgroundColor: HUNTLY_GREEN,
          borderRadius: scaleW(24),
          minHeight: scaleW(56),
          alignItems: "center",
          justifyContent: "center",
        },
        buttonText: { fontSize: scaleW(16), fontWeight: "700", color: "#FFF", lineHeight: scaleW(20) },
      }),
    [scaleW, insets.bottom, onboardingActive, isTablet]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={["top", "left", "right"]}>
        <ActivityIndicator size="large" color={LIGHT_GREEN_HEADER} />
        <ThemedText style={[styles.errorText, { marginTop: scaleW(16) }]}>Loading…</ThemedText>
      </SafeAreaView>
    );
  }

  if (error || !activity) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={["top", "left", "right"]}>
        <ThemedText style={styles.errorText}>{error ?? "Activity not found"}</ThemedText>
      </SafeAreaView>
    );
  }

  if (totalSteps === 0) {
    router.replace({
      pathname: "/(tabs)/activity/mission/completion",
      params: { id: String(activity.id) },
    });
    return null;
  }

  const mediaUrl = currentStep?.media_url?.trim();
  const mainImage = activity.image;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <ThemedText style={styles.missionTitle}>{activity.title}</ThemedText>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: scaleW(4) }}>
          <ThemedText type="heading" style={styles.stepLabel}>
            Step {stepIndex + 1}
          </ThemedText>
          <ThemedText style={styles.stepLabelSmall}>/ {totalSteps}</ThemedText>
        </View>
        <View style={styles.progressRow}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressLine,
                i <= stepIndex && styles.progressLineDone,
                i > stepIndex && { borderStyle: "dashed", borderWidth: 1, backgroundColor: "transparent" },
              ]}
            />
          ))}
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          {mediaUrl ? (
            <Image
              source={{ uri: mediaUrl }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
          ) : mainImage ? (
            <Image
              source={getActivityImageSource(mainImage) as { uri: string }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.mediaPlaceholder} />
          )}
          <ThemedText type="heading" style={styles.instructionText}>
            {currentStep?.instruction}
          </ThemedText>
          {currentStep?.tip != null && currentStep.tip.trim() !== "" && (
            <View style={styles.tipCard}>
              <ThemedText style={styles.tipText}>
                Tip: {currentStep.tip}
              </ThemedText>
            </View>
          )}
        </Animated.View>
      </ScrollView>
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: DARK_BG }}>
        <View style={styles.footer}>
          <Animated.View style={[backStyle, { flex: 1 }]}>
            <Pressable
              onPress={handleBack}
              onPressIn={() => {
                backScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                backScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
              style={styles.backButton}
            >
              <Text style={styles.buttonText}>Back</Text>
            </Pressable>
          </Animated.View>
          <Animated.View style={[doneStyle, { flex: 1 }]}>
            <Pressable
              onPress={handleDone}
              onPressIn={() => {
                doneScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                doneScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
              style={styles.doneButton}
            >
              <Text style={styles.buttonText}>That's done!</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}
