import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar, setStatusBarStyle } from "expo-status-bar";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { FKButton, FKLoading } from "@/components/fieldkit";
import { FK, FONT, RADIUS } from "@/constants/fieldKit";
import { getActivityById, getActivityImageSource } from "@/services/packService";
import type { Activity, MissionStep } from "@/types/activity";

/** One instruction per screen, big and readable, with the grown-up tip underneath. */
export default function StepsScreen() {
  // Other screens set the status bar style imperatively when they focus or blur,
  // which overrides <StatusBar>. Re-assert light icons on this dark screen.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
    }, [])
  );
  const router = useRouter();
  const { id, step } = useLocalSearchParams<{ id?: string; step?: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = Math.max(0, parseInt(step ?? "0", 10) || 0);
  const steps: MissionStep[] = useMemo(() => activity?.steps ?? [], [activity]);
  const totalSteps = steps.length;
  const currentStep = totalSteps > 0 ? steps[Math.min(stepIndex, totalSteps - 1)] : null;
  const isLastStep = totalSteps > 0 && stepIndex >= totalSteps - 1;

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
    void loadActivity();
  }, [loadActivity]);

  const handleBack = () => {
    if (!activity?.id) return;
    if (stepIndex > 0) {
      router.setParams({ step: String(stepIndex - 1) });
    } else {
      router.replace({ pathname: "/(tabs)/activity/mission/prep", params: { id: String(activity.id) } });
    }
  };

  const handleDone = () => {
    if (!activity?.id) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    if (isLastStep) {
      router.push({ pathname: "/(tabs)/activity/mission/completion", params: { id: String(activity.id) } });
    } else {
      router.setParams({ step: String(stepIndex + 1) });
    }
  };

  const handleClose = () => {
    Alert.alert("Pause this mission?", "Your mission will be waiting in the Clubhouse whenever you're ready.", [
      { text: "Keep going", style: "cancel" },
      { text: "Pause", onPress: () => router.replace("/(tabs)") },
    ]);
  };

  if (loading) return <FKLoading dark />;
  if (error || !activity || !currentStep) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <StatusBar style="light" />
        <Text style={styles.error}>{error ?? "This mission has no steps yet."}</Text>
        <FKButton onDark label="Back to Missions" icon="arrow-back" onPress={() => router.replace("/(tabs)/missions")} style={{ marginTop: 20, alignSelf: "stretch" }} />
      </SafeAreaView>
    );
  }

  const imageSource = currentStep.media_url ? { uri: currentStep.media_url } : getActivityImageSource(activity.image ?? null);

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <Pressable onPress={handleClose} style={styles.close} hitSlop={8} accessibilityLabel="Pause mission">
          <Ionicons name="close" size={26} color={FK.white} />
        </Pressable>
        <View style={styles.progress}>
          {steps.map((_, i) => (
            <View key={i} style={[styles.seg, { backgroundColor: i <= stepIndex ? FK.sunbeam : "#2F4A3B" }]} />
          ))}
        </View>
        <Text style={styles.count}>
          {stepIndex + 1} of {totalSteps}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View key={`img-${stepIndex}`} entering={FadeIn.duration(300)} style={styles.imageWrap}>
          <Image source={imageSource} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        </Animated.View>
        <Animated.View key={`txt-${stepIndex}`} entering={FadeInDown.duration(300)}>
          <Text style={styles.stepLabel}>STEP {stepIndex + 1}</Text>
          <Text style={styles.instruction}>{currentStep.instruction}</Text>
          {currentStep.tip ? (
            <View style={styles.tip}>
              <Ionicons name="sparkles" size={18} color={FK.sunbeam} />
              <Text style={styles.tipText}>{currentStep.tip}</Text>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={handleBack} style={styles.backCircle} accessibilityLabel="Previous step">
          <Ionicons name="arrow-back" size={26} color={FK.white} />
        </Pressable>
        <FKButton
          onDark
          label={isLastStep ? "Finish mission" : "Done! Next step"}
          icon={isLastStep ? "flag" : "checkmark"}
          onPress={handleDone}
          style={{ flex: 1 }}
          testID="step-done"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FK.ink },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  error: { fontFamily: FONT.displayBold, fontSize: 17, color: FK.white, textAlign: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  close: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1F3A2C",
    alignItems: "center",
    justifyContent: "center",
  },
  progress: { flex: 1, flexDirection: "row", gap: 6 },
  seg: { flex: 1, height: 8, borderRadius: 4 },
  count: { fontFamily: FONT.display, fontSize: 16, color: "#A9C79A" },
  content: { paddingHorizontal: 20, paddingBottom: 16 },
  imageWrap: { height: 280, borderRadius: RADIUS.lg, overflow: "hidden", backgroundColor: FK.forest, marginBottom: 22 },
  stepLabel: { fontFamily: FONT.display, fontSize: 14, letterSpacing: 1.8, color: FK.sunbeam, marginBottom: 8 },
  instruction: { fontFamily: FONT.display, fontSize: 30, lineHeight: 34, color: FK.white, letterSpacing: -0.5 },
  tip: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: FK.forest,
    borderRadius: RADIUS.md,
    padding: 16,
    marginTop: 18,
    alignItems: "flex-start",
  },
  tipText: { flex: 1, fontFamily: FONT.body, fontSize: 17, lineHeight: 24, color: "#DDE6D8" },
  footer: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, alignItems: "center" },
  backCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: "#2F4A3B",
    alignItems: "center",
    justifyContent: "center",
  },
});
