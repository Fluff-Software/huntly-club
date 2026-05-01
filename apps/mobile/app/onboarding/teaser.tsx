import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, {} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useUser } from "@/contexts/UserContext";
import { START_MISSION_STEP } from "@/constants/startMissionOnboarding";
import { getWeekOneRippedMapChapterId } from "@/services/startMissionOnboardingService";

const BG = "#4F6F52";
const CREAM = "#F4F0EB";

export default function OnboardingTeaserScreen() {
  const { scaleW } = useLayoutScale();
  const { updateStartMissionStep } = useUser();
  const [saving, setSaving] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: BG },
        content: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: scaleW(24),
          gap: scaleW(28) },
        title: {
          fontSize: scaleW(34),
          fontWeight: "700",
          color: CREAM,
          textAlign: "center" },
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

  const handleFindOut = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const chapterId = await getWeekOneRippedMapChapterId();
      if (!chapterId) return;
      await updateStartMissionStep(START_MISSION_STEP.STORY);
      router.replace({
        pathname: "/(tabs)/story/slides",
        params: {
          source: "chapter",
          chapterId: String(chapterId),
          onboardingFlow: "start-mission" } });
    } finally {
      setSaving(false);
    }
  }, [saving, updateStartMissionStep]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.content}>
        <Animated.View>
          <ThemedText style={styles.title}>Something&apos;s happened in Huntly World.</ThemedText>
        </Animated.View>
        <Pressable style={styles.cta} onPress={handleFindOut} disabled={saving}>
          <ThemedText style={styles.ctaText}>Find out</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
