import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import {
  SCAVENGER_ACCENT,
  SCAVENGER_BG,
  SCAVENGER_GREEN,
} from "@/constants/scavengerTheme";
import { fetchQuestById, type ScavengerQuest } from "@/services/scavengerService";

const ATTRACTION_FG = "#1A2E1E";
const ATTRACTION_MUTED = "rgba(26,46,30,0.75)";

export default function ScavengerCompleteScreen() {
  const { questId } = useLocalSearchParams<{ questId: string }>();
  const router = useRouter();
  const { scaleW } = useLayoutScale();
  const [quest, setQuest] = useState<ScavengerQuest | null>(null);

  useEffect(() => {
    if (!questId) return;
    void fetchQuestById(questId).then(setQuest).catch(() => setQuest(null));
  }, [questId]);

  const completion = quest?.on_completion;
  const hasCustomBackground = Boolean(quest?.attraction_colour_hex);
  const panelColor = quest?.attraction_colour_hex || SCAVENGER_BG;
  const titleColor = hasCustomBackground ? ATTRACTION_FG : "#fff";
  const bodyColor = hasCustomBackground ? ATTRACTION_MUTED : "rgba(255,255,255,0.85)";
  const linkColor = hasCustomBackground ? SCAVENGER_GREEN : SCAVENGER_ACCENT;

  return (
    <>
      <StatusBar style={hasCustomBackground ? "dark" : "light"} />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: panelColor }]}>
        {!quest ? (
          <ActivityIndicator
            color={hasCustomBackground ? SCAVENGER_GREEN : "#fff"}
            style={{ marginTop: scaleW(60) }}
          />
        ) : (
          <View style={{ flex: 1, padding: scaleW(24), justifyContent: "center" }}>
            <ThemedText
              lightColor={titleColor}
              darkColor={titleColor}
              type="heading"
              style={{ fontSize: scaleW(32), fontWeight: "800", textAlign: "center" }}
            >
              {completion?.cta || "Hunt complete!"}
            </ThemedText>
            {!!completion?.copy && (
              <ThemedText
                lightColor={bodyColor}
                darkColor={bodyColor}
                style={{ marginTop: scaleW(14), fontSize: scaleW(16), lineHeight: scaleW(24), textAlign: "center" }}
              >
                {completion.copy}
              </ThemedText>
            )}
            {!!completion?.linkUrl && !!completion?.linkLabel && (
              <Pressable
                onPress={() => Linking.openURL(completion.linkUrl!).catch(() => {})}
                style={{ marginTop: scaleW(20), alignItems: "center" }}
              >
                <ThemedText lightColor={linkColor} darkColor={linkColor} style={{ fontWeight: "800", fontSize: scaleW(16) }}>
                  {completion.linkLabel}
                </ThemedText>
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
              style={[styles.cta, { marginTop: scaleW(32), paddingVertical: scaleW(16), borderRadius: scaleW(28) }]}
            >
              <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontWeight: "800", fontSize: scaleW(16), textAlign: "center" }}>
                Back to hunts
              </ThemedText>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  cta: { backgroundColor: SCAVENGER_GREEN },
});
