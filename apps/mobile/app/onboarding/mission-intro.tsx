import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useUser } from "@/contexts/UserContext";
import { START_MISSION_STEP } from "@/constants/startMissionOnboarding";
import { getActivityByName } from "@/services/packService";

const BG = "#4F6F52";
const CREAM = "#F4F0EB";

export default function OnboardingMissionIntroScreen() {
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
          gap: scaleW(28),
        },
        title: {
          fontSize: scaleW(34),
          fontWeight: "700",
          color: CREAM,
          textAlign: "center",
        },
        cta: {
          minWidth: scaleW(260),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(28),
          borderRadius: scaleW(30),
          backgroundColor: CREAM,
          alignItems: "center",
        },
        ctaText: {
          fontSize: scaleW(20),
          fontWeight: "700",
          color: BG,
        },
      }),
    [scaleW]
  );

  const handleAcceptMission = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const starterMission = await getActivityByName("build_your_base");
      if (!starterMission?.id) return;
      await updateStartMissionStep(START_MISSION_STEP.MISSION_IN_PROGRESS);
      router.replace({
        pathname: "/(tabs)/activity/mission",
        params: { id: String(starterMission.id), onboardingFlow: "start-mission" },
      });
    } finally {
      setSaving(false);
    }
  }, [saving, updateStartMissionStep]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.duration(600).springify().damping(16)}>
          <ThemedText style={styles.title}>Your first mission is ready</ThemedText>
        </Animated.View>
        <Pressable style={styles.cta} onPress={handleAcceptMission} disabled={saving}>
          <ThemedText style={styles.ctaText}>Accept the mission</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
