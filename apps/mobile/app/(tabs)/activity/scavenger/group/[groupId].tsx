import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import {
  prefetchScavengerImages,
  ScavengerImage,
} from "@/components/scavenger/ScavengerImage";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  SCAVENGER_ACCENT,
  SCAVENGER_BG,
  SCAVENGER_CARD,
  SCAVENGER_GREEN,
} from "@/constants/scavengerTheme";
import {
  fetchGroupCompletionStatus,
  fetchQuestGroupById,
  fetchQuestStatesForProfile,
  fetchQuestsInGroup,
  isPlayUnlocked,
  type ScavengerQuest,
  type ScavengerQuestGroup,
  type ScavengerQuestState,
} from "@/services/scavengerService";

const PROFILE_KEY = "scavenger_selected_profile_id";

export default function ScavengerGroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { scaleW } = useLayoutScale();
  const { profiles } = usePlayer();

  const [profileId, setProfileId] = useState<number | null>(null);
  const [group, setGroup] = useState<ScavengerQuestGroup | null>(null);
  const [quests, setQuests] = useState<ScavengerQuest[]>([]);
  const [states, setStates] = useState<ScavengerQuestState[]>([]);
  const [unlocked, setUnlocked] = useState(true);
  const [groupComplete, setGroupComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(PROFILE_KEY);
      const storedId = stored ? Number(stored) : NaN;
      if (!Number.isNaN(storedId) && profiles.some((p) => p.id === storedId)) {
        setProfileId(storedId);
      } else if (profiles[0]) {
        setProfileId(profiles[0].id);
      }
    })();
  }, [profiles]);

  const load = useCallback(async () => {
    if (!groupId || !profileId) return;
    setLoading(true);
    try {
      const [g, q, s, playUnlocked] = await Promise.all([
        fetchQuestGroupById(groupId),
        fetchQuestsInGroup(groupId),
        fetchQuestStatesForProfile(profileId),
        isPlayUnlocked("questGroup", groupId),
      ]);
      setGroup(g);
      setQuests(q);
      setStates(s);

      setUnlocked(!g?.lockable || playUnlocked);
      if (g) {
        const completion = await fetchGroupCompletionStatus(profileId, groupId);
        setGroupComplete(completion.all_completed && completion.has_cta);
      }
      await prefetchScavengerImages([
        g?.cover_image_url,
        ...q.slice(0, 8).flatMap((quest) => [quest.tile_image_url, quest.cover_image_url]),
      ]);
    } catch (e) {
      Alert.alert("Couldn’t load group", e instanceof Error ? e.message : "Try again");
    } finally {
      setLoading(false);
    }
  }, [groupId, profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusFor = (questId: string) => {
    const state = states.find((s) => s.quest_id === questId);
    if (!state) return null;
    if (state.complete) return "Complete";
    if (state.found_items.length > 0) return "In progress";
    return null;
  };

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: scaleW(16) }}>
          <MaterialIcons name="arrow-back" size={scaleW(26)} color="#fff" />
        </Pressable>

        {loading || !group ? (
          <ActivityIndicator color="#fff" style={{ marginTop: scaleW(40) }} />
        ) : !unlocked ? (
          <View style={{ padding: scaleW(24), alignItems: "center" }}>
            <MaterialIcons name="lock" size={scaleW(48)} color={SCAVENGER_ACCENT} />
            <ThemedText lightColor="#fff" darkColor="#fff" type="heading" style={{ marginTop: scaleW(16), textAlign: "center" }}>
              {group.name} is locked
            </ThemedText>
            <ThemedText lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)" style={{ marginTop: scaleW(8), textAlign: "center" }}>
              This collection isn’t available yet.
            </ThemedText>
            <Pressable
              onPress={() => router.replace("/(tabs)/activity/scavenger")}
              style={[styles.primaryBtn, { marginTop: scaleW(20), paddingVertical: scaleW(14), paddingHorizontal: scaleW(24), borderRadius: scaleW(28) }]}
            >
              <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontWeight: "800" }}>
                Back to hunts
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: scaleW(20), paddingBottom: scaleW(40) }}>
            {group.cover_image_url ? (
              <ScavengerImage
                uri={group.cover_image_url}
                tint="#fff"
                style={{ width: "100%", height: scaleW(180), borderRadius: scaleW(16) }}
              />
            ) : null}
            <ThemedText lightColor="#fff" darkColor="#fff" type="heading" style={{ marginTop: scaleW(16), fontSize: scaleW(26), fontWeight: "800" }}>
              {group.name}
            </ThemedText>
            {!!group.description && (
              <ThemedText lightColor="rgba(255,255,255,0.75)" darkColor="rgba(255,255,255,0.75)" style={{ marginTop: scaleW(8), fontSize: scaleW(15), lineHeight: scaleW(22) }}>
                {group.description}
              </ThemedText>
            )}

            {groupComplete && group.on_completion?.cta && (
              <Pressable
                onPress={() => {
                  if (group.on_completion?.linkUrl) {
                    void Linking.openURL(group.on_completion.linkUrl);
                  }
                }}
                style={[styles.completeBanner, { marginTop: scaleW(16), padding: scaleW(16), borderRadius: scaleW(14) }]}
              >
                <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontWeight: "800", fontSize: scaleW(16) }}>
                  {group.on_completion.cta}
                </ThemedText>
                {!!group.on_completion.copy && (
                  <ThemedText lightColor="rgba(255,255,255,0.8)" darkColor="rgba(255,255,255,0.8)" style={{ marginTop: scaleW(6) }}>
                    {group.on_completion.copy}
                  </ThemedText>
                )}
              </Pressable>
            )}

            <ThemedText lightColor="rgba(255,255,255,0.85)" darkColor="rgba(255,255,255,0.85)" style={{ marginTop: scaleW(24), marginBottom: scaleW(10), fontWeight: "700", textTransform: "uppercase", fontSize: scaleW(12), letterSpacing: 0.6 }}>
              Scavenger hunts in this group
            </ThemedText>

            {quests.map((quest) => {
              const label = statusFor(quest.id);
              return (
                <Pressable
                  key={quest.id}
                  onPress={() =>
                    router.push(
                      `/(tabs)/activity/scavenger/quest/${quest.id}?profileId=${profileId}`
                    )
                  }
                  style={[styles.card, { borderRadius: scaleW(14), marginBottom: scaleW(10), flexDirection: "row", overflow: "hidden" }]}
                >
                  {(quest.tile_image_url || quest.cover_image_url) && (
                    <ScavengerImage
                      uri={quest.tile_image_url || quest.cover_image_url}
                      tint="#fff"
                      style={{ width: scaleW(72), height: scaleW(72) }}
                    />
                  )}
                  <View style={{ flex: 1, padding: scaleW(12), justifyContent: "center" }}>
                    <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontWeight: "800", fontSize: scaleW(15) }}>
                      {quest.name}
                    </ThemedText>
                    {!!label && (
                      <ThemedText lightColor={SCAVENGER_ACCENT} darkColor={SCAVENGER_ACCENT} style={{ marginTop: scaleW(4), fontSize: scaleW(12), fontWeight: "700" }}>
                        {label}
                      </ThemedText>
                    )}
                  </View>
                  <MaterialIcons name="chevron-right" size={scaleW(22)} color="rgba(255,255,255,0.45)" style={{ alignSelf: "center", marginRight: scaleW(8) }} />
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SCAVENGER_BG },
  card: { backgroundColor: SCAVENGER_CARD },
  primaryBtn: { backgroundColor: SCAVENGER_GREEN },
  completeBanner: { backgroundColor: "rgba(98,169,79,0.35)" },
});
