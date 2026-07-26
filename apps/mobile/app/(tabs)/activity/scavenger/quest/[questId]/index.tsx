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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { ItemPreviewFan } from "@/components/scavenger/ItemPreviewFan";
import {
  QuestToFindBadge,
  websiteVisitLabel,
} from "@/components/scavenger/QuestToFindBadge";
import {
  prefetchScavengerImages,
  ScavengerImage,
} from "@/components/scavenger/ScavengerImage";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  SCAVENGER_ACCENT,
  SCAVENGER_BG,
  SCAVENGER_GREEN,
} from "@/constants/scavengerTheme";
import {
  ensureQuestState,
  fetchQuestById,
  fetchQuestItems,
  fetchQuestState,
  isPlayUnlocked,
  restartQuest,
  type ScavengerQuest,
  type ScavengerQuestItem,
  type ScavengerQuestState,
} from "@/services/scavengerService";
import { clearActiveHuntSession, startActiveHuntSession } from "@/services/activeHuntSessionService";
import {
  getBlockingAdventure,
  getConflictingHuntSession,
  routeForBlockingAdventure,
} from "@/utils/adventureSessionGuard";

const PROFILE_KEY = "scavenger_selected_profile_id";
const ATTRACTION_FG = "#1A2E1E";
const ATTRACTION_MUTED = "rgba(26,46,30,0.75)";
const DEFAULT_FG = "#FFFFFF";
const DEFAULT_MUTED = "rgba(255,255,255,0.85)";

export default function ScavengerQuestOverviewScreen() {
  const { questId, profileId: profileIdParam } = useLocalSearchParams<{
    questId: string;
    profileId?: string;
  }>();
  const router = useRouter();
  const { scaleW } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const { profiles } = usePlayer();

  const [profileId, setProfileId] = useState<number | null>(
    profileIdParam ? Number(profileIdParam) : null
  );
  const [quest, setQuest] = useState<ScavengerQuest | null>(null);
  const [items, setItems] = useState<ScavengerQuestItem[]>([]);
  const [state, setState] = useState<ScavengerQuestState | null>(null);
  const [unlocked, setUnlocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    if (profileId) return;
    (async () => {
      const stored = await AsyncStorage.getItem(PROFILE_KEY);
      const storedId = stored ? Number(stored) : NaN;
      if (!Number.isNaN(storedId) && profiles.some((p) => p.id === storedId)) {
        setProfileId(storedId);
      } else if (profiles[0]) {
        setProfileId(profiles[0].id);
      }
    })();
  }, [profileId, profiles]);

  const load = useCallback(async () => {
    if (!questId || !profileId) return;
    setLoading(true);
    try {
      const [q, itemRows, s] = await Promise.all([
        fetchQuestById(questId),
        fetchQuestItems(questId),
        fetchQuestState(profileId, questId),
      ]);
      setQuest(q);
      setItems(itemRows);
      setState(s);

      if (q?.lockable && q.lock_id) {
        const playOk = await isPlayUnlocked("quest", questId);
        setUnlocked(playOk);
      } else {
        setUnlocked(true);
      }

      // Warm hero + preview images before leaving the page spinner.
      if (q) {
        await prefetchScavengerImages([
          q.cover_image_url,
          q.attraction_logo_url,
          q.attraction_image_url,
          ...itemRows.slice(0, 3).map((item) => item.image_url),
        ]);
      }
    } catch (e) {
      Alert.alert("Couldn’t load hunt", e instanceof Error ? e.message : "Try again");
    } finally {
      setLoading(false);
    }
  }, [questId, profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const found = state?.found_items.length ?? 0;
  const total = items.length;
  const remaining = Math.max(0, total - found);

  const ctaLabel = useMemo(() => {
    if (!unlocked) return "Locked";
    if (state?.complete) return "Play again";
    if (found > 0) return "Continue exploring";
    return "Start hunt";
  }, [unlocked, state?.complete, found]);

  const beginHunt = useCallback(async () => {
    if (!questId || !profileId) return;
    if (!unlocked) {
      Alert.alert("Still locked", "This hunt isn’t available yet.");
      return;
    }
    setStarting(true);
    try {
      const blocking = await getBlockingAdventure("hunt");
      if (blocking) {
        router.replace(routeForBlockingAdventure(blocking));
        return;
      }
      const conflictingHunt = await getConflictingHuntSession(questId, profileId);
      if (conflictingHunt) {
        router.replace(routeForBlockingAdventure(conflictingHunt));
        return;
      }
      await ensureQuestState(profileId, questId);
      if (quest) {
        const session = await startActiveHuntSession({
          questId,
          profileId,
          questName: quest.name,
        });
        if (session.questId !== questId || session.profileId !== profileId) {
          router.replace(
            routeForBlockingAdventure({
              kind: "hunt",
              questId: session.questId,
              profileId: session.profileId,
            })
          );
          return;
        }
      }
      router.push(
        `/(tabs)/activity/scavenger/quest/${questId}/active?profileId=${profileId}`
      );
    } catch (e) {
      Alert.alert("Couldn’t start", e instanceof Error ? e.message : "Try again");
    } finally {
      setStarting(false);
    }
  }, [questId, profileId, unlocked, quest, router]);

  const confirmRestart = () => {
    if (!questId || !profileId) return;
    Alert.alert(
      "Start over?",
      "This clears your found items for this hunt so you can play again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restart",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setRestarting(true);
              try {
                const nextState = await restartQuest(profileId, questId);
                await clearActiveHuntSession();
                setState(nextState);
                await beginHunt();
              } catch (e) {
                Alert.alert("Couldn’t restart", e instanceof Error ? e.message : "Try again");
              } finally {
                setRestarting(false);
              }
            })();
          },
        },
      ]
    );
  };

  const start = async () => {
    if (!questId || !profileId) return;
    if (state?.complete) {
      confirmRestart();
      return;
    }
    await beginHunt();
  };

  // Attraction branding only — World theme stays the default when unset.
  const hasCustomBackground = Boolean(quest?.attraction_colour_hex);
  const panelColor = quest?.attraction_colour_hex || SCAVENGER_BG;
  const titleColor = hasCustomBackground ? ATTRACTION_FG : DEFAULT_FG;
  const bodyColor = hasCustomBackground ? ATTRACTION_MUTED : DEFAULT_MUTED;
  const linkColor = hasCustomBackground ? SCAVENGER_GREEN : SCAVENGER_ACCENT;
  const backIconColor = hasCustomBackground ? ATTRACTION_FG : "#fff";

  return (
    <>
      <StatusBar style={hasCustomBackground ? "dark" : "light"} />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.root, { backgroundColor: panelColor }]}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: scaleW(16) }}>
            <MaterialIcons name="arrow-back" size={scaleW(26)} color={backIconColor} />
          </Pressable>

          {loading || !quest ? (
            <ActivityIndicator color={hasCustomBackground ? SCAVENGER_GREEN : "#fff"} style={{ marginTop: scaleW(40) }} />
          ) : (
            <>
              <ScrollView contentContainerStyle={{ paddingBottom: scaleW(140) }}>
                {quest.cover_image_url ? (
                  <ScavengerImage
                    uri={quest.cover_image_url}
                    tint={hasCustomBackground ? SCAVENGER_GREEN : "#fff"}
                    style={{ width: "100%", height: scaleW(220) }}
                  />
                ) : null}
                <View
                  style={{
                    marginTop: quest.cover_image_url ? scaleW(-16) : 0,
                    paddingHorizontal: scaleW(20),
                    paddingTop: scaleW(20),
                    borderTopLeftRadius: scaleW(24),
                    borderTopRightRadius: scaleW(24),
                    backgroundColor: panelColor,
                  }}
                >
                  {!!quest.attraction_logo_url && (
                    <ScavengerImage
                      uri={quest.attraction_logo_url}
                      contentFit="contain"
                      tint={hasCustomBackground ? SCAVENGER_GREEN : "#fff"}
                      style={{ width: "50%", height: scaleW(72), marginBottom: scaleW(12), backgroundColor: "transparent" }}
                    />
                  )}

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: scaleW(12) }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <ThemedText
                        lightColor={titleColor}
                        darkColor={titleColor}
                        type="heading"
                        style={{ fontSize: scaleW(28), fontWeight: "800" }}
                      >
                        {quest.name}
                      </ThemedText>
                      {!!quest.attraction_name && (
                        <ThemedText
                          lightColor={bodyColor}
                          darkColor={bodyColor}
                          style={{ fontSize: scaleW(14), fontWeight: "600", marginTop: scaleW(4) }}
                        >
                          {quest.attraction_name}
                        </ThemedText>
                      )}
                    </View>
                    {remaining > 0 && !state?.complete ? <QuestToFindBadge count={remaining} /> : null}
                  </View>

                  {!!quest.description && (
                    <ThemedText
                      lightColor={bodyColor}
                      darkColor={bodyColor}
                      style={{ marginTop: scaleW(14), fontSize: scaleW(15), lineHeight: scaleW(22) }}
                    >
                      {quest.description}
                    </ThemedText>
                  )}

                  {!!quest.attraction_bio && (
                    <ThemedText
                      lightColor={bodyColor}
                      darkColor={bodyColor}
                      style={{ marginTop: scaleW(12), fontSize: scaleW(14), lineHeight: scaleW(20) }}
                    >
                      {quest.attraction_bio}
                    </ThemedText>
                  )}

                  <ItemPreviewFan
                    items={items}
                    onItemPress={() => {
                      if (unlocked) void start();
                    }}
                  />

                  {!!quest.attraction_image_url && (
                    <ScavengerImage
                      uri={quest.attraction_image_url}
                      tint={hasCustomBackground ? SCAVENGER_GREEN : "#fff"}
                      style={{
                        width: "100%",
                        height: scaleW(180),
                        borderRadius: scaleW(14),
                        marginTop: scaleW(8),
                      }}
                    />
                  )}

                  {!!quest.attraction_address && (
                    <View style={{ marginTop: scaleW(18), flexDirection: "row", alignItems: "flex-start", gap: scaleW(8) }}>
                      <MaterialIcons name="place" size={scaleW(18)} color={linkColor} style={{ marginTop: scaleW(2) }} />
                      <ThemedText lightColor={bodyColor} darkColor={bodyColor} style={{ flex: 1, fontSize: scaleW(14), lineHeight: scaleW(20) }}>
                        {quest.attraction_address}
                      </ThemedText>
                    </View>
                  )}

                  {quest.attraction_fun_facts.length > 0 && (
                    <View style={{ marginTop: scaleW(20) }}>
                      <ThemedText
                        lightColor={titleColor}
                        darkColor={titleColor}
                        style={{ fontSize: scaleW(16), fontWeight: "800", marginBottom: scaleW(8) }}
                      >
                        Fun Facts
                      </ThemedText>
                      {quest.attraction_fun_facts.map((fact, index) => (
                        <ThemedText
                          key={`${index}-${fact.slice(0, 24)}`}
                          lightColor={bodyColor}
                          darkColor={bodyColor}
                          style={{ fontSize: scaleW(14), lineHeight: scaleW(20), marginBottom: scaleW(6) }}
                        >
                          • {fact}
                        </ThemedText>
                      ))}
                    </View>
                  )}

                  {!!quest.attraction_website && (
                    <Pressable
                      onPress={() => Linking.openURL(quest.attraction_website!).catch(() => {})}
                      style={{ marginTop: scaleW(20), flexDirection: "row", alignItems: "center", gap: scaleW(6), alignSelf: "center" }}
                    >
                      <ThemedText lightColor={linkColor} darkColor={linkColor} style={{ fontWeight: "700", fontSize: scaleW(15) }}>
                        {websiteVisitLabel(quest.attraction_website)}
                      </ThemedText>
                      <MaterialIcons name="chevron-right" size={scaleW(16)} color={linkColor} />
                    </Pressable>
                  )}
                </View>
              </ScrollView>

              <View
                style={[
                  styles.footer,
                  {
                    paddingBottom: insets.bottom + scaleW(12),
                    paddingHorizontal: scaleW(20),
                    paddingTop: scaleW(12),
                    backgroundColor: hasCustomBackground ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.2)",
                  },
                ]}
              >
                <Pressable
                  onPress={start}
                  disabled={starting || restarting || !unlocked}
                  style={[styles.cta, { paddingVertical: scaleW(16), borderRadius: scaleW(28), opacity: starting || restarting ? 0.7 : 1 }]}
                >
                  {starting || restarting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontWeight: "800", fontSize: scaleW(17) }}>
                      {ctaLabel}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0 },
  cta: { backgroundColor: SCAVENGER_GREEN, alignItems: "center" },
});
