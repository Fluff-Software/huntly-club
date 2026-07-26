import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
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
  SCAVENGER_BG_DEEP,
  SCAVENGER_CARD_GRADIENT,
  SCAVENGER_CTA_GRADIENT,
  SCAVENGER_GOLD,
  SCAVENGER_GOLD_GRADIENT,
  SCAVENGER_HAIRLINE,
  SCAVENGER_IMAGE_SCRIM,
  SCAVENGER_SCREEN_GRADIENT,
  SCAVENGER_TEXT_DIM,
  scavengerGoldGlow,
  scavengerSoftShadow,
} from "@/constants/scavengerTheme";
import {
  fetchGroupCompletionStatus,
  fetchQuestGroupById,
  fetchQuestStatesForProfile,
  fetchQuestsInGroup,
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
      const [g, q, s] = await Promise.all([
        fetchQuestGroupById(groupId),
        fetchQuestsInGroup(groupId),
        fetchQuestStatesForProfile(profileId),
      ]);
      setGroup(g);
      setQuests(q);
      setStates(s);

      setUnlocked(!g?.lockable);
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

  const visibleQuests = useMemo(
    () => quests.filter((quest) => !quest.lockable),
    [quests]
  );

  const completedCount = useMemo(
    () =>
      visibleQuests.filter((q) => states.find((s) => s.quest_id === q.id)?.complete)
        .length,
    [visibleQuests, states]
  );

  const statusFor = (
    questId: string
  ): { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string } | null => {
    const state = states.find((s) => s.quest_id === questId);
    if (!state) return null;
    if (state.complete) return { label: "Complete", icon: "check-circle", color: SCAVENGER_ACCENT };
    if (state.found_items.length > 0)
      return { label: "In progress", icon: "bolt", color: SCAVENGER_GOLD };
    return null;
  };

  const BackChip = (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={[styles.backChip, { width: scaleW(40), height: scaleW(40), borderRadius: scaleW(20) }]}
    >
      <MaterialIcons name="arrow-back" size={scaleW(22)} color="#fff" />
    </Pressable>
  );

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.root}>
        <LinearGradient colors={SCAVENGER_SCREEN_GRADIENT} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
          {loading || !group ? (
            <>
              <View style={{ padding: scaleW(16) }}>{BackChip}</View>
              <View style={styles.center}>
                <ActivityIndicator color="#fff" />
              </View>
            </>
          ) : !unlocked ? (
            <>
              <View style={{ padding: scaleW(16) }}>{BackChip}</View>
              <View style={{ padding: scaleW(24), alignItems: "center", marginTop: scaleW(40) }}>
                <View
                  style={[
                    styles.lockBadge,
                    { width: scaleW(96), height: scaleW(96), borderRadius: scaleW(48) },
                  ]}
                >
                  <MaterialIcons name="lock" size={scaleW(44)} color={SCAVENGER_GOLD} />
                </View>
                <ThemedText
                  lightColor="#fff"
                  darkColor="#fff"
                  type="heading"
                  style={{ marginTop: scaleW(20), fontSize: scaleW(22), fontWeight: "800", textAlign: "center" }}
                >
                  {group.name} is locked
                </ThemedText>
                <ThemedText
                  lightColor={SCAVENGER_TEXT_DIM}
                  darkColor={SCAVENGER_TEXT_DIM}
                  style={{ marginTop: scaleW(8), textAlign: "center", fontSize: scaleW(14), lineHeight: scaleW(20) }}
                >
                  This collection isn’t available yet.
                </ThemedText>
                <Pressable
                  onPress={() => router.replace("/(tabs)/activity/scavenger")}
                  style={{ marginTop: scaleW(24), borderRadius: scaleW(28), overflow: "hidden", ...scavengerSoftShadow }}
                >
                  <LinearGradient
                    colors={SCAVENGER_CTA_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingVertical: scaleW(14), paddingHorizontal: scaleW(28) }}
                  >
                    <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontWeight: "800", fontSize: scaleW(15) }}>
                      Back to hunts
                    </ThemedText>
                  </LinearGradient>
                </Pressable>
              </View>
            </>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: scaleW(40) }}
            >
              <View style={{ height: scaleW(230) }}>
                {group.cover_image_url ? (
                  <ScavengerImage
                    uri={group.cover_image_url}
                    tint="#fff"
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <LinearGradient colors={SCAVENGER_CARD_GRADIENT} style={{ flex: 1 }} />
                )}
                <LinearGradient colors={SCAVENGER_IMAGE_SCRIM} style={StyleSheet.absoluteFill} />
                <SafeAreaView edges={["top"]} style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
                  <View style={{ padding: scaleW(16) }}>{BackChip}</View>
                </SafeAreaView>
                <View style={{ position: "absolute", left: scaleW(20), right: scaleW(20), bottom: scaleW(18) }}>
                  <View
                    style={[
                      styles.collectionTag,
                      { paddingHorizontal: scaleW(10), paddingVertical: scaleW(5), borderRadius: scaleW(999) },
                    ]}
                  >
                    <MaterialIcons name="auto-awesome" size={scaleW(12)} color={SCAVENGER_BG_DEEP} />
                    <ThemedText style={{ fontSize: scaleW(11), fontWeight: "800", color: SCAVENGER_BG_DEEP }}>
                      {visibleQuests.length} hunt{visibleQuests.length === 1 ? "" : "s"}
                      {completedCount > 0 ? ` · ${completedCount} done` : ""}
                    </ThemedText>
                  </View>
                  <ThemedText
                    lightColor="#fff"
                    darkColor="#fff"
                    type="heading"
                    style={{ marginTop: scaleW(8), fontSize: scaleW(28), fontWeight: "800", lineHeight: scaleW(32) }}
                  >
                    {group.name}
                  </ThemedText>
                </View>
              </View>

              <View style={{ paddingHorizontal: scaleW(20), paddingTop: scaleW(16) }}>
                {!!group.description && (
                  <ThemedText
                    lightColor={SCAVENGER_TEXT_DIM}
                    darkColor={SCAVENGER_TEXT_DIM}
                    style={{ fontSize: scaleW(15), lineHeight: scaleW(22) }}
                  >
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
                    style={{ marginTop: scaleW(18), borderRadius: scaleW(18), overflow: "hidden", ...scavengerGoldGlow }}
                  >
                    <LinearGradient
                      colors={SCAVENGER_GOLD_GRADIENT}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ padding: scaleW(16) }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: scaleW(10) }}>
                        <View
                          style={[
                            styles.trophyChip,
                            { width: scaleW(38), height: scaleW(38), borderRadius: scaleW(12) },
                          ]}
                        >
                          <MaterialIcons name="emoji-events" size={scaleW(22)} color={SCAVENGER_BG_DEEP} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={{ fontWeight: "800", fontSize: scaleW(16), color: SCAVENGER_BG_DEEP }}>
                            {group.on_completion.cta}
                          </ThemedText>
                          {!!group.on_completion.copy && (
                            <ThemedText style={{ marginTop: scaleW(2), color: "rgba(27,49,34,0.75)", fontSize: scaleW(13) }}>
                              {group.on_completion.copy}
                            </ThemedText>
                          )}
                        </View>
                        <MaterialIcons name="chevron-right" size={scaleW(22)} color={SCAVENGER_BG_DEEP} />
                      </View>
                    </LinearGradient>
                  </Pressable>
                )}

                <View style={{ flexDirection: "row", alignItems: "center", gap: scaleW(8), marginTop: scaleW(24), marginBottom: scaleW(12) }}>
                  <View style={[styles.sectionIcon, { width: scaleW(26), height: scaleW(26), borderRadius: scaleW(8) }]}>
                    <MaterialIcons name="travel-explore" size={scaleW(16)} color={SCAVENGER_GOLD} />
                  </View>
                  <ThemedText
                    lightColor="#fff"
                    darkColor="#fff"
                    style={{ fontWeight: "800", textTransform: "uppercase", fontSize: scaleW(12), letterSpacing: 1 }}
                  >
                    Hunts in this group
                  </ThemedText>
                </View>

                {visibleQuests.map((quest, index) => {
                  const status = statusFor(quest.id);
                  return (
                    <Animated.View
                      key={quest.id}
                      entering={FadeInDown.duration(320).delay(Math.min(index, 6) * 40)}
                    >
                      <Pressable
                        onPress={() =>
                          router.push(
                            `/(tabs)/activity/scavenger/quest/${quest.id}?profileId=${profileId}`
                          )
                        }
                        style={({ pressed }) => [
                          styles.questCard,
                          {
                            borderRadius: scaleW(18),
                            padding: scaleW(10),
                            marginBottom: scaleW(10),
                            transform: [{ scale: pressed ? 0.985 : 1 }],
                          },
                        ]}
                      >
                        <View style={{ borderRadius: scaleW(14), overflow: "hidden" }}>
                          {quest.tile_image_url || quest.cover_image_url ? (
                            <ScavengerImage
                              uri={quest.tile_image_url || quest.cover_image_url}
                              tint="#fff"
                              style={{ width: scaleW(76), height: scaleW(76) }}
                            />
                          ) : (
                            <LinearGradient
                              colors={SCAVENGER_CTA_GRADIENT}
                              style={{ width: scaleW(76), height: scaleW(76), alignItems: "center", justifyContent: "center" }}
                            >
                              <MaterialIcons name="travel-explore" size={scaleW(28)} color="#fff" />
                            </LinearGradient>
                          )}
                        </View>
                        <View style={{ flex: 1, paddingHorizontal: scaleW(12), justifyContent: "center" }}>
                          <ThemedText
                            lightColor="#fff"
                            darkColor="#fff"
                            numberOfLines={2}
                            style={{ fontWeight: "800", fontSize: scaleW(15), lineHeight: scaleW(19) }}
                          >
                            {quest.name}
                          </ThemedText>
                          {status && (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: scaleW(4),
                                marginTop: scaleW(6),
                                alignSelf: "flex-start",
                                backgroundColor:
                                  status.color === SCAVENGER_ACCENT
                                    ? "rgba(98,169,79,0.18)"
                                    : "rgba(244,197,80,0.18)",
                                paddingHorizontal: scaleW(9),
                                paddingVertical: scaleW(4),
                                borderRadius: scaleW(999),
                              }}
                            >
                              <MaterialIcons name={status.icon} size={scaleW(13)} color={status.color} />
                              <ThemedText style={{ fontSize: scaleW(11), fontWeight: "800", color: status.color }}>
                                {status.label}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        <View
                          style={[
                            styles.chevChip,
                            { width: scaleW(30), height: scaleW(30), borderRadius: scaleW(15), alignSelf: "center" },
                          ]}
                        >
                          <MaterialIcons name="chevron-right" size={scaleW(20)} color="#fff" />
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SCAVENGER_BG_DEEP },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  backChip: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,37,26,0.45)",
  },
  lockBadge: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,197,80,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,197,80,0.25)",
  },
  collectionTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: SCAVENGER_GOLD,
  },
  trophyChip: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  sectionIcon: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,197,80,0.14)",
  },
  questCard: {
    flexDirection: "row",
    backgroundColor: SCAVENGER_CARD_GRADIENT[0],
    borderWidth: 1,
    borderColor: SCAVENGER_HAIRLINE,
    ...scavengerSoftShadow,
  },
  chevChip: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
});
