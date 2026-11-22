import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { FKButton, FKEyebrow, FKProgressHeader, FKScreen } from "@/components/fieldkit";
import { FK, FONT, RADIUS } from "@/constants/fieldKit";
import { guideForTeamName } from "@/constants/guides";
import { ONBOARDING_STEPS } from "@/constants/onboarding";
import { useSignUp } from "@/contexts/SignUpContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { fetchFirstMissionPreview, type MissionPreview } from "@/services/firstMissionService";
import { familySentence } from "@/utils/familyNames";
import { settleIn } from "@/constants/motion";

/** Step 3: the guide introduces the first mission in one line (child-facing). */
export default function SignUpGuideScreen() {
  const { players, selectedTeamName } = useSignUp();
  const { profiles } = usePlayer();
  const guide = guideForTeamName(selectedTeamName);
  const [mission, setMission] = useState<MissionPreview | null>(null);

  useEffect(() => {
    fetchFirstMissionPreview().then(setMission).catch(() => undefined);
  }, []);

  const names = (players.length ? players.map((p) => p.name) : profiles.map((p) => p.name)).filter(Boolean);
  const hello = names.length >= 1 && names.length <= 3 ? `Hi ${familySentence(names)}!` : names.length > 3 ? "Hi explorers!" : "Hi explorer!";

  const line = mission
    ? `Welcome to the ${guide.teamName}. I've saved your very first mission: ${mission.title}.`
    : `Welcome to the ${guide.teamName}. I've saved your very first mission, and it's a good one.`;

  const handleBack = () => (router.canGoBack() ? router.back() : router.replace("/sign-up/team"));

  return (
    <FKScreen
      backgroundColor={FK.forest}
      footer={<FKButton label="Plan our first adventure" onPress={() => router.push("/sign-up/plan")} testID="guide-continue" />}
    >
      <StatusBar style="light" />
      <View style={styles.headerWrap}>
        <FKProgressHeader step={3} total={ONBOARDING_STEPS} onBack={handleBack} dark />
      </View>
      <Animated.View entering={FadeIn.duration(400)}>
        <FKEyebrow color={FK.sunbeam}>YOUR GUIDE</FKEyebrow>
        <Text style={styles.hello}>{hello}</Text>
      </Animated.View>

      <Animated.View entering={settleIn(100)} style={[styles.ring, { borderColor: guide.colour }]}>
        <View style={styles.circle}>
          <Image source={guide.waving} style={styles.guideImg} contentFit="contain" contentPosition="bottom" />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(450).delay(350)} style={styles.bubble}>
        <View style={styles.bubbleTail} />
        <Text style={styles.bubbleName}>{guide.guideName}</Text>
        <Text style={styles.bubbleText}>{line}</Text>
        <Text style={styles.bubbleHint}>Your grown-up will help you pick when. Let's go!</Text>
      </Animated.View>
    </FKScreen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { marginHorizontal: -4 },
  hello: { fontFamily: FONT.display, fontSize: 38, lineHeight: 41, color: FK.white, letterSpacing: -1, marginTop: 6 },
  ring: {
    alignSelf: "center",
    width: 236,
    height: 236,
    borderRadius: 118,
    borderWidth: 10,
    marginTop: 18,
    overflow: "hidden",
  },
  circle: { flex: 1, backgroundColor: FK.forestSoft, alignItems: "center", justifyContent: "flex-end" },
  guideImg: { width: "100%", height: "112%" },
  bubble: {
    backgroundColor: FK.paper,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginTop: 22,
  },
  bubbleTail: {
    position: "absolute",
    top: -10,
    left: "50%",
    marginLeft: -10,
    width: 20,
    height: 20,
    backgroundColor: FK.paper,
    transform: [{ rotate: "45deg" }],
  },
  bubbleName: { fontFamily: FONT.display, fontSize: 14, letterSpacing: 1.4, color: FK.muted, textTransform: "uppercase" },
  bubbleText: { fontFamily: FONT.displayBold, fontSize: 21, lineHeight: 27, color: FK.ink, marginTop: 6 },
  bubbleHint: { fontFamily: FONT.body, fontSize: 16, color: FK.muted, marginTop: 10 },
});
