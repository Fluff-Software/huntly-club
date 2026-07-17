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

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      {/* Temporarily ignore quest attraction colours for a consistent background. */}
      <SafeAreaView style={[styles.safe, { backgroundColor: SCAVENGER_BG }]}>
        {!quest ? (
          <ActivityIndicator color="#fff" style={{ marginTop: scaleW(60) }} />
        ) : (
          <View style={{ flex: 1, padding: scaleW(24), justifyContent: "center" }}>
            <ThemedText lightColor="#fff" darkColor="#fff" type="heading" style={{ fontSize: scaleW(32), fontWeight: "800", textAlign: "center" }}>
              {completion?.cta || "Hunt complete!"}
            </ThemedText>
            {!!(completion?.copy) && (
              <ThemedText lightColor="rgba(255,255,255,0.85)" darkColor="rgba(255,255,255,0.85)" style={{ marginTop: scaleW(14), fontSize: scaleW(16), lineHeight: scaleW(24), textAlign: "center" }}>
                {completion.copy}
              </ThemedText>
            )}
            {!!completion?.linkUrl && !!completion?.linkLabel && (
              <Pressable
                onPress={() => Linking.openURL(completion.linkUrl!).catch(() => {})}
                style={{ marginTop: scaleW(20), alignItems: "center" }}
              >
                <ThemedText lightColor={SCAVENGER_ACCENT} darkColor={SCAVENGER_ACCENT} style={{ fontWeight: "800", fontSize: scaleW(16) }}>
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
