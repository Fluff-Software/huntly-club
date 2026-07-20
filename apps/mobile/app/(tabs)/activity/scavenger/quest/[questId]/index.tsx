import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  SCAVENGER_ACCENT,
  SCAVENGER_BG,
  SCAVENGER_GREEN,
  SCAVENGER_LIGHT,
} from "@/constants/scavengerTheme";
import {
  ensureQuestState,
  fetchLockById,
  fetchQuestById,
  fetchQuestItems,
  fetchQuestState,
  isPlayUnlocked,
  unlockWithCode,
  unlockWithLocation,
  type ScavengerQuest,
  type ScavengerQuestItem,
  type ScavengerQuestState,
} from "@/services/scavengerService";
import { startActiveHuntSession } from "@/services/activeHuntSessionService";
import {
  getBlockingAdventure,
  getConflictingHuntSession,
  routeForBlockingAdventure,
} from "@/utils/adventureSessionGuard";

const PROFILE_KEY = "scavenger_selected_profile_id";

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
  const [needsCode, setNeedsCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

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

      let playOk = true;
      let lockRequiresCode = false;
      let lockRequiresLocation = false;

      if (q?.lockable && q.lock_id) {
        const [unlockedPlay, lock] = await Promise.all([
          isPlayUnlocked("quest", questId),
          fetchLockById(q.lock_id),
        ]);
        playOk = unlockedPlay;
        lockRequiresCode = Boolean(lock?.requires_code);
        lockRequiresLocation = Boolean(lock?.requires_location);

        // Re-check location unlock on overview (OG Huntly parity)
        if (!playOk && lockRequiresLocation) {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === "granted") {
              const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              const result = await unlockWithLocation(
                "quest",
                questId,
                pos.coords.latitude,
                pos.coords.longitude
              );
              if (result.ok) {
                playOk = await isPlayUnlocked("quest", questId);
              }
            }
          } catch {
            // Keep prior unlock state if GPS/unlock fails
          }
        }

        setUnlocked(playOk);
        setNeedsCode(lockRequiresCode && !playOk);
      } else {
        setUnlocked(true);
        setNeedsCode(false);
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
    if (needsCode && !unlocked) return "Got a code?";
    if (!unlocked) return "Locked";
    if (state?.complete) return "Open hunt";
    if (found > 0) return "Continue exploring";
    return "Start hunt";
  }, [needsCode, unlocked, state?.complete, found]);

  const start = async () => {
    if (!questId || !profileId) return;
    if (needsCode && !unlocked) {
      setCodeOpen(true);
      return;
    }
    if (!unlocked) {
      Alert.alert("Still locked", "Visit the unlock location or enter a code first.");
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
  };

  const submitCode = async () => {
    if (!questId || !code.trim()) return;
    setCodeBusy(true);
    setCodeError(null);
    try {
      const result = await unlockWithCode("quest", questId, code.trim());
      if (!result.ok || !result.play_unlocked) {
        setCodeError("That code didn’t work. Try again?");
        return;
      }
      setCodeOpen(false);
      setCode("");
      await load();
    } catch (e) {
      setCodeError(e instanceof Error ? e.message : "Unlock failed");
    } finally {
      setCodeBusy(false);
    }
  };

  // Temporarily keep every hunt on the Huntly World background.
  // const panelColor = quest?.attraction_colour_hex || SCAVENGER_BG;
  const panelColor = SCAVENGER_BG;

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.root, { backgroundColor: panelColor }]}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: scaleW(16) }}>
            <MaterialIcons name="arrow-back" size={scaleW(26)} color="#fff" />
          </Pressable>

          {loading || !quest ? (
            <ActivityIndicator color="#fff" style={{ marginTop: scaleW(40) }} />
          ) : (
            <>
              <ScrollView contentContainerStyle={{ paddingBottom: scaleW(140) }}>
                {quest.cover_image_url ? (
                  <Image source={{ uri: quest.cover_image_url }} style={{ width: "100%", height: scaleW(220) }} />
                ) : null}
                <View style={{ paddingHorizontal: scaleW(20), paddingTop: scaleW(16) }}>
                  {!!quest.attraction_name && (
                    <ThemedText lightColor="rgba(255,255,255,0.8)" darkColor="rgba(255,255,255,0.8)" style={{ fontSize: scaleW(13), fontWeight: "600", marginBottom: scaleW(4) }}>
                      {quest.attraction_name}
                    </ThemedText>
                  )}
                  <ThemedText lightColor="#fff" darkColor="#fff" type="heading" style={{ fontSize: scaleW(28), fontWeight: "800" }}>
                    {quest.name}
                  </ThemedText>
                  {!!quest.description && (
                    <ThemedText lightColor="rgba(255,255,255,0.85)" darkColor="rgba(255,255,255,0.85)" style={{ marginTop: scaleW(10), fontSize: scaleW(15), lineHeight: scaleW(22) }}>
                      {quest.description}
                    </ThemedText>
                  )}

                  <View style={[styles.badge, { marginTop: scaleW(16), paddingHorizontal: scaleW(12), paddingVertical: scaleW(8), borderRadius: scaleW(20), alignSelf: "flex-start" }]}>
                    <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontWeight: "800", fontSize: scaleW(13) }}>
                      {remaining === 0 && total > 0 ? "All found!" : `${remaining} to find`}
                    </ThemedText>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: scaleW(18) }} contentContainerStyle={{ gap: scaleW(10) }}>
                    {items.slice(0, 8).map((item) => (
                      <View key={item.id} style={{ width: scaleW(72), alignItems: "center" }}>
                        {item.image_url ? (
                          <Image source={{ uri: item.image_url }} style={{ width: scaleW(64), height: scaleW(64), borderRadius: scaleW(12) }} />
                        ) : (
                          <View style={{ width: scaleW(64), height: scaleW(64), borderRadius: scaleW(12), backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                            <MaterialIcons name="image" size={scaleW(24)} color="#fff" />
                          </View>
                        )}
                      </View>
                    ))}
                  </ScrollView>

                  {!!quest.attraction_website && (
                    <Pressable
                      onPress={() => Linking.openURL(quest.attraction_website!).catch(() => {})}
                      style={{ marginTop: scaleW(20), flexDirection: "row", alignItems: "center", gap: scaleW(6) }}
                    >
                      <ThemedText lightColor={SCAVENGER_ACCENT} darkColor={SCAVENGER_ACCENT} style={{ fontWeight: "700" }}>
                        Visit website
                      </ThemedText>
                      <MaterialIcons name="open-in-new" size={scaleW(16)} color={SCAVENGER_ACCENT} />
                    </Pressable>
                  )}
                </View>
              </ScrollView>

              <View style={[styles.footer, { paddingBottom: insets.bottom + scaleW(12), paddingHorizontal: scaleW(20), paddingTop: scaleW(12) }]}>
                <Pressable
                  onPress={start}
                  disabled={starting || (!unlocked && !needsCode)}
                  style={[styles.cta, { paddingVertical: scaleW(16), borderRadius: scaleW(28), opacity: starting ? 0.7 : 1 }]}
                >
                  {starting ? (
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

      <Modal visible={codeOpen} transparent animationType="slide" onRequestClose={() => setCodeOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCodeOpen(false)}>
          <Pressable style={[styles.modalSheet, { padding: scaleW(20), borderTopLeftRadius: scaleW(24), borderTopRightRadius: scaleW(24) }]} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="heading" style={{ fontSize: scaleW(22), fontWeight: "800", color: SCAVENGER_BG }}>
              Enter unlock code
            </ThemedText>
            <TextInput
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              placeholder="Code"
              placeholderTextColor="#999"
              style={[styles.input, { marginTop: scaleW(16), padding: scaleW(14), borderRadius: scaleW(12), fontSize: scaleW(16) }]}
            />
            {!!codeError && (
              <ThemedText style={{ color: "#B42318", marginTop: scaleW(8) }}>{codeError}</ThemedText>
            )}
            <Pressable
              onPress={submitCode}
              disabled={codeBusy}
              style={[styles.cta, { marginTop: scaleW(16), paddingVertical: scaleW(14), borderRadius: scaleW(28) }]}
            >
              {codeBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontWeight: "800" }}>
                  Unlock
                </ThemedText>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  badge: { backgroundColor: "rgba(0,0,0,0.25)" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.2)" },
  cta: { backgroundColor: SCAVENGER_GREEN, alignItems: "center" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: { backgroundColor: SCAVENGER_LIGHT },
  input: { backgroundColor: "#fff", color: "#1A2E1E" },
});
