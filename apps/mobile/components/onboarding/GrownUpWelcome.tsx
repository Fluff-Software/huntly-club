import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { FKButton, FKScreen } from "@/components/fieldkit";
import { FK, FONT, RADIUS } from "@/constants/fieldKit";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const APP_ICON = require("@/assets/images/ios-light.png");
const GUIDE = require("@/assets/images/bella-close-smiling.png");

/** Evening sign-ups (the 8–9pm peak) are promised something for the morning. */
export function welcomeCopy(now = new Date()) {
  const h = now.getHours();
  if (h >= 17 || h < 5) {
    return {
      headline: "Tomorrow morning, your child gets a secret message from their guide.",
      sub: "Two minutes for you tonight. Five minutes for them at breakfast.",
    };
  }
  return {
    headline: "Today, your child gets a secret message from their guide.",
    sub: "Two minutes for you now. A real adventure for them this week.",
  };
}

export function GrownUpWelcome({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  const { scaleW, width } = useLayoutScale();
  const copy = welcomeCopy();
  const heroSize = Math.min(width - 44, scaleW(360));

  return (
    <FKScreen
      dark
      scroll={false}
      footer={
        <Animated.View entering={FadeInDown.duration(500).delay(350)}>
          <FKButton onDark label="Set it up" onPress={onStart} testID="welcome-set-it-up" />
          <FKButton label="I already have an account" variant="link" onDark onPress={onLogin} style={{ marginTop: 6 }} />
        </Animated.View>
      }
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={["#24402F", FK.ink]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
      />
      <View style={styles.topRow}>
        <Image source={APP_ICON} style={styles.icon} contentFit="cover" />
        <Text style={styles.forGrownUps}>FOR GROWN-UPS</Text>
      </View>
      <Animated.View entering={FadeIn.duration(600)} style={[styles.hero, { height: heroSize * 0.82 }]}>
        <Image source={GUIDE} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(500).delay(150)}>
        <Text style={[styles.headline, { fontSize: scaleW(34), lineHeight: scaleW(37) }]}>{copy.headline}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>
      </Animated.View>
    </FKScreen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  icon: { width: 64, height: 64, borderRadius: 16 },
  forGrownUps: { fontFamily: FONT.display, color: "#A9D18E", fontSize: 13, letterSpacing: 2 },
  hero: {
    width: "100%",
    borderTopLeftRadius: 200,
    borderTopRightRadius: 200,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    overflow: "hidden",
    backgroundColor: FK.forest,
    marginBottom: 22,
  },
  headline: { fontFamily: FONT.display, color: FK.white, letterSpacing: -0.8 },
  sub: { fontFamily: FONT.body, color: FK.mutedOnDark, fontSize: 17, lineHeight: 24, marginTop: 12 },
});
