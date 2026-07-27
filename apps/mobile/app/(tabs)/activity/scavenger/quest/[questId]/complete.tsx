import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Linking, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import ConfettiCannon from "react-native-confetti-cannon";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import {
  SCAVENGER_BG_DEEP,
  SCAVENGER_COMPLETE_GRADIENT,
  SCAVENGER_GOLD,
  SCAVENGER_GOLD_GRADIENT,
  SCAVENGER_TEXT_DIM,
  scavengerGoldGlow,
  scavengerShadow,
} from "@/constants/scavengerTheme";
import { fetchQuestById, type ScavengerQuest } from "@/services/scavengerService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ATTRACTION_FG = "#1A2E1E";
const ATTRACTION_MUTED = "rgba(26,46,30,0.75)";

export default function ScavengerCompleteScreen() {
  const { questId } = useLocalSearchParams<{ questId: string }>();
  const router = useRouter();
  const { scaleW } = useLayoutScale();
  const [quest, setQuest] = useState<ScavengerQuest | null>(null);
  const confettiRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    if (!questId) return;
    void fetchQuestById(questId).then(setQuest).catch(() => setQuest(null));
  }, [questId]);

  useEffect(() => {
    if (!quest) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const t = setTimeout(() => confettiRef.current?.start?.(), 120);
    return () => clearTimeout(t);
  }, [quest]);

  const completion = quest?.on_completion;
  const hasCustomBackground = Boolean(quest?.attraction_colour_hex);
  const solidColor = quest?.attraction_colour_hex || SCAVENGER_BG_DEEP;
  const titleColor = hasCustomBackground ? ATTRACTION_FG : "#fff";
  const bodyColor = hasCustomBackground ? ATTRACTION_MUTED : SCAVENGER_TEXT_DIM;

  return (
    <>
      <StatusBar style={hasCustomBackground ? "dark" : "light"} />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.root, { backgroundColor: solidColor }]}>
        {!hasCustomBackground && (
          <LinearGradient colors={SCAVENGER_COMPLETE_GRADIENT} style={StyleSheet.absoluteFill} />
        )}
        <SafeAreaView style={styles.safe}>
          {!quest ? (
            <ActivityIndicator
              color={hasCustomBackground ? ATTRACTION_FG : "#fff"}
              style={{ marginTop: scaleW(60) }}
            />
          ) : (
            <View style={{ flex: 1, padding: scaleW(24), justifyContent: "center" }}>
              <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: "center" }}>
                <View style={[styles.trophyGlow, { width: scaleW(140), height: scaleW(140), borderRadius: scaleW(70) }]}>
                  <LinearGradient
                    colors={SCAVENGER_GOLD_GRADIENT}
                    style={[styles.trophyInner, { width: scaleW(112), height: scaleW(112), borderRadius: scaleW(56) }]}
                  >
                    <MaterialIcons name="emoji-events" size={scaleW(62)} color={SCAVENGER_BG_DEEP} />
                  </LinearGradient>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(120)}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: scaleW(6), marginTop: scaleW(28) }}>
                  <MaterialIcons name="auto-awesome" size={scaleW(16)} color={SCAVENGER_GOLD} />
                  <ThemedText
                    lightColor={hasCustomBackground ? ATTRACTION_MUTED : SCAVENGER_GOLD}
                    darkColor={hasCustomBackground ? ATTRACTION_MUTED : SCAVENGER_GOLD}
                    style={{ fontSize: scaleW(13), fontWeight: "800", letterSpacing: 1.4 }}
                  >
                    HUNT COMPLETE
                  </ThemedText>
                  <MaterialIcons name="auto-awesome" size={scaleW(16)} color={SCAVENGER_GOLD} />
                </View>
                <ThemedText
                  lightColor={titleColor}
                  darkColor={titleColor}
                  type="heading"
                  style={{ marginTop: scaleW(10), fontSize: scaleW(32), fontWeight: "800", textAlign: "center", lineHeight: scaleW(38) }}
                >
                  {completion?.cta || "You did it!"}
                </ThemedText>
              </Animated.View>

              {!!completion?.copy && (
                <Animated.View entering={FadeInDown.duration(400).delay(220)}>
                  <ThemedText
                    lightColor={bodyColor}
                    darkColor={bodyColor}
                    style={{ marginTop: scaleW(14), fontSize: scaleW(16), lineHeight: scaleW(24), textAlign: "center" }}
                  >
                    {completion.copy}
                  </ThemedText>
                </Animated.View>
              )}

              <Animated.View entering={FadeInDown.duration(400).delay(320)}>
                {!!completion?.linkUrl && !!completion?.linkLabel && (
                  <Pressable
                    onPress={() => Linking.openURL(completion.linkUrl!).catch(() => {})}
                    style={{ marginTop: scaleW(24), borderRadius: scaleW(28), overflow: "hidden", alignSelf: "center", ...scavengerGoldGlow }}
                  >
                    <LinearGradient
                      colors={SCAVENGER_GOLD_GRADIENT}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ paddingVertical: scaleW(14), paddingHorizontal: scaleW(28), flexDirection: "row", alignItems: "center", gap: scaleW(8) }}
                    >
                      <ThemedText style={{ fontWeight: "800", fontSize: scaleW(16), color: SCAVENGER_BG_DEEP }}>
                        {completion.linkLabel}
                      </ThemedText>
                      <MaterialIcons name="arrow-forward" size={scaleW(18)} color={SCAVENGER_BG_DEEP} />
                    </LinearGradient>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => {
                    if (quest.group_id) {
                      router.replace(`/(tabs)/activity/scavenger/group/${quest.group_id}`);
                    } else {
                      router.replace("/(tabs)/activity/scavenger");
                    }
                  }}
                  style={[
                    styles.secondaryBtn,
                    {
                      marginTop: scaleW(16),
                      paddingVertical: scaleW(15),
                      borderRadius: scaleW(28),
                      alignSelf: "stretch",
                      backgroundColor: hasCustomBackground ? "rgba(26,46,30,0.08)" : "rgba(255,255,255,0.12)",
                      borderColor: hasCustomBackground ? "rgba(26,46,30,0.12)" : "rgba(255,255,255,0.2)",
                    },
                  ]}
                >
                  <MaterialIcons name="explore" size={scaleW(19)} color={titleColor} />
                  <ThemedText lightColor={titleColor} darkColor={titleColor} style={{ fontWeight: "800", fontSize: scaleW(16), textAlign: "center" }}>
                    Back to hunts
                  </ThemedText>
                </Pressable>
              </Animated.View>
            </View>
          )}
        </SafeAreaView>
        {quest ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <ConfettiCannon
              ref={confettiRef}
              count={120}
              origin={{ x: SCREEN_WIDTH / 2, y: -20 }}
              explosionSpeed={360}
              fallSpeed={3200}
              fadeOut
              autoStart={false}
              colors={["#F4C550", "#7FCB63", "#62A94F", "#FFD700", "#8FD873", "#E0A32E"]}
            />
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  trophyGlow: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,197,80,0.16)",
    ...scavengerGoldGlow,
  },
  trophyInner: {
    alignItems: "center",
    justifyContent: "center",
    ...scavengerShadow,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
  },
});
