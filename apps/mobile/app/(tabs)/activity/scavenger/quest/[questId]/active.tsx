import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { QuestItemsMap } from "@/components/scavenger/QuestItemsMap";
import {
  QuestViewSwitcher,
  type QuestView,
} from "@/components/scavenger/QuestViewSwitcher";
import {
  prefetchScavengerImages,
  ScavengerImage,
} from "@/components/scavenger/ScavengerImage";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  SCAVENGER_ACCENT,
  SCAVENGER_BG,
  SCAVENGER_CHECK,
  SCAVENGER_GREEN,
  SCAVENGER_LIGHT,
  SCAVENGER_WARNING,
} from "@/constants/scavengerTheme";
import {
  addSessionPhoto,
  ensureQuestState,
  fetchQuestById,
  fetchQuestItems,
  fetchQuestState,
  fetchSessionPhotos,
  markItemFound,
  validateItemAnswer,
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

export default function ScavengerActiveScreen() {
  const { questId, profileId: profileIdParam } = useLocalSearchParams<{
    questId: string;
    profileId?: string;
  }>();
  const router = useRouter();
  const { scaleW } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profiles } = usePlayer();

  const [profileId, setProfileId] = useState<number | null>(
    profileIdParam ? Number(profileIdParam) : null
  );
  const [quest, setQuest] = useState<ScavengerQuest | null>(null);
  const [items, setItems] = useState<ScavengerQuestItem[]>([]);
  const [state, setState] = useState<ScavengerQuestState | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ScavengerQuestItem | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [triviaOpen, setTriviaOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [triviaError, setTriviaError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<QuestView>("list");
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

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

  const refresh = useCallback(async () => {
    if (!questId || !profileId) return;
    const [q, itemRows, s, photos] = await Promise.all([
      fetchQuestById(questId),
      fetchQuestItems(questId),
      fetchQuestState(profileId, questId),
      fetchSessionPhotos(profileId, questId),
    ]);
    setQuest(q);
    setItems(itemRows);
    setState(s);
    setPhotoCount(photos.length);
    return itemRows;
  }, [questId, profileId]);

  useEffect(() => {
    (async () => {
      if (!questId || !profileId) return;
      setLoading(true);
      try {
        const blocking = await getBlockingAdventure("hunt");
        if (blocking) {
          router.replace(routeForBlockingAdventure(blocking) as Href);
          return;
        }
        const conflictingHunt = await getConflictingHuntSession(questId, profileId);
        if (conflictingHunt) {
          router.replace(routeForBlockingAdventure(conflictingHunt) as Href);
          return;
        }
        await ensureQuestState(profileId, questId);
        const [q, itemRows] = await Promise.all([
          fetchQuestById(questId),
          refresh(),
        ]);
        if (q) {
          const session = await startActiveHuntSession({
            questId,
            profileId,
            questName: q.name,
          });
          if (session.questId !== questId || session.profileId !== profileId) {
            router.replace(
              routeForBlockingAdventure({
                kind: "hunt",
                questId: session.questId,
                profileId: session.profileId,
              }) as Href
            );
            return;
          }
        }
        await prefetchScavengerImages(
          (itemRows ?? []).slice(0, 8).map((item) => item.image_url)
        );
      } catch (e) {
        Alert.alert("Couldn’t open scavenger hunt", e instanceof Error ? e.message : "Try again");
      } finally {
        setLoading(false);
      }
    })();
  }, [questId, profileId, refresh, router]);

  const foundIds = useMemo(
    () => new Set(state?.found_items ?? []),
    [state?.found_items]
  );
  const found = foundIds.size;
  const total = items.length;
  const ratio = total > 0 ? Math.min(1, found / total) : 0;
  const hasMap = useMemo(
    () => items.some((item) => item.lat != null && item.lng != null),
    [items]
  );

  useEffect(() => {
    if (!hasMap) return;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      } catch {
        // Map still works centered on item pins
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasMap]);

  useEffect(() => {
    if (!hasMap && viewMode === "map") setViewMode("list");
  }, [hasMap, viewMode]);

  const endSession = () => {
    if (!questId || !profileId || !quest) return;
    router.push(
      `/(tabs)/activity/scavenger/quest/${questId}/end?profileId=${profileId}&photoCount=${photoCount}`
    );
  };

  const afterMarkedFound = async (item: ScavengerQuestItem) => {
    setSelected(null);
    setShowHint(false);
    setTriviaOpen(false);
    setAnswer("");
    setTriviaError(null);
    await refresh();

    // Offer camera (Huntly-style); skip is fine
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted" || !user?.id || !profileId) return;

    Alert.alert("Snap a photo?", `Take a picture of ${item.name}?`, [
      { text: "No thanks", style: "cancel" },
      {
        text: "Camera",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });
          if (result.canceled || !result.assets[0]?.uri) return;
          try {
            await addSessionPhoto({
              userId: user.id,
              profileId,
              questId: questId!,
              questItemId: item.id,
              itemName: item.name,
              localUri: result.assets[0].uri,
            });
            await refresh();
          } catch (e) {
            Alert.alert("Photo upload failed", e instanceof Error ? e.message : "Try again");
          }
        },
      },
    ]);
  };

  const onFoundPress = async () => {
    if (!selected || !profileId) return;
    if (selected.has_question) {
      setTriviaOpen(true);
      return;
    }
    setBusy(true);
    try {
      const result = await markItemFound(profileId, selected.id);
      if (!result.ok) {
        Alert.alert("Couldn’t mark found", result.reason ?? "Try again");
        return;
      }
      await afterMarkedFound(selected);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Try again");
    } finally {
      setBusy(false);
    }
  };

  const submitTrivia = async () => {
    if (!selected || !profileId) return;
    setBusy(true);
    setTriviaError(null);
    try {
      const result = await validateItemAnswer(profileId, selected.id, answer);
      if (!result.ok) {
        setTriviaError(result.reason ?? "Something went wrong");
        return;
      }
      if (!result.is_correct) {
        setTriviaError("Not quite—have another go!");
        return;
      }
      await afterMarkedFound(selected);
    } catch (e) {
      setTriviaError(e instanceof Error ? e.message : "Try again");
    } finally {
      setBusy(false);
    }
  };

  const numColumns = 2;
  const tileSize = scaleW(156);

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={[styles.hero, { paddingHorizontal: scaleW(16), paddingBottom: scaleW(16) }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable onPress={endSession} hitSlop={10} style={styles.endBtn}>
              <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontWeight: "700", fontSize: scaleW(13) }}>
                End
              </ThemedText>
            </Pressable>
            <ThemedText lightColor="#fff" darkColor="#fff" numberOfLines={1} style={{ flex: 1, textAlign: "center", fontWeight: "800", fontSize: scaleW(16), marginHorizontal: scaleW(8) }}>
              {quest?.name ?? "Scavenger Hunt"}
            </ThemedText>
            <View style={{ width: scaleW(52) }} />
          </View>
          <ThemedText lightColor="rgba(255,255,255,0.85)" darkColor="rgba(255,255,255,0.85)" style={{ marginTop: scaleW(12), fontWeight: "700", fontSize: scaleW(15) }}>
            {found} of {total} found
          </ThemedText>
          <View style={[styles.progressTrack, { marginTop: scaleW(8), height: scaleW(8), borderRadius: scaleW(4) }]}>
            <View style={[styles.progressFill, { width: `${ratio * 100}%`, borderRadius: scaleW(4) }]} />
          </View>
          <ThemedText lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)" style={{ marginTop: scaleW(6), fontSize: scaleW(12) }}>
            {found >= total && total > 0 ? "All done!" : `${Math.max(0, total - found)} to go`}
          </ThemedText>
        </View>

        {loading ? (
          <ActivityIndicator color={SCAVENGER_GREEN} style={{ marginTop: scaleW(40) }} />
        ) : viewMode === "map" && hasMap ? (
          <View style={{ flex: 1 }}>
            <QuestItemsMap
              items={items}
              foundIds={foundIds}
              userCoords={userCoords}
              onMarkerPress={(item) => {
                setSelected(item);
                setShowHint(false);
              }}
            />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            contentContainerStyle={{
              padding: scaleW(12),
              paddingBottom: insets.bottom + scaleW(hasMap ? 88 : 24),
              gap: scaleW(12),
            }}
            columnWrapperStyle={{
              justifyContent: "center",
              gap: scaleW(12),
            }}
            renderItem={({ item }) => {
              const isFound = foundIds.has(item.id);
              return (
                <Pressable
                  onPress={() => {
                    setSelected(item);
                    setShowHint(false);
                  }}
                  style={[
                    styles.tile,
                    {
                      width: tileSize,
                      borderRadius: scaleW(14),
                      overflow: "hidden",
                      opacity: isFound ? 0.85 : 1,
                    },
                  ]}
                >
                  <ScavengerImage
                    uri={item.image_url}
                    style={{ width: "100%", height: scaleW(110) }}
                    fallback={
                      <View style={{ height: scaleW(110), backgroundColor: "#D7E4D7", alignItems: "center", justifyContent: "center" }}>
                        <MaterialIcons name="image" size={scaleW(28)} color={SCAVENGER_GREEN} />
                      </View>
                    }
                  />
                  <View style={{ padding: scaleW(10), alignItems: "center" }}>
                    <ThemedText style={{ fontWeight: "800", fontSize: scaleW(13), color: SCAVENGER_BG, textAlign: "center" }} numberOfLines={2}>
                      {item.name}
                    </ThemedText>
                    {!!item.warning && (
                      <View
                        style={[
                          styles.takeCarePill,
                          {
                            marginTop: scaleW(6),
                            paddingHorizontal: scaleW(10),
                            paddingVertical: scaleW(4),
                            borderRadius: scaleW(999),
                          },
                        ]}
                      >
                        <ThemedText style={{ fontSize: scaleW(11), fontWeight: "700", color: SCAVENGER_WARNING }}>
                          Take care
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  {isFound && (
                    <View style={styles.checkBadge}>
                      <MaterialIcons name="check-circle" size={scaleW(22)} color={SCAVENGER_CHECK} />
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        )}

        {hasMap && !loading ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.switcherWrap,
              { bottom: insets.bottom + scaleW(12), paddingHorizontal: scaleW(20) },
            ]}
          >
            <QuestViewSwitcher value={viewMode} onChange={setViewMode} />
          </View>
        ) : null}
      </SafeAreaView>

      <Modal visible={!!selected && !triviaOpen} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable
            style={[styles.sheet, { padding: scaleW(20), paddingBottom: insets.bottom + scaleW(20), borderTopLeftRadius: scaleW(24), borderTopRightRadius: scaleW(24) }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selected && (
              <>
                {selected.image_url ? (
                  <ScavengerImage
                    uri={selected.image_url}
                    style={{ width: "100%", height: scaleW(180), borderRadius: scaleW(14) }}
                  />
                ) : null}
                <ThemedText type="heading" style={{ marginTop: scaleW(14), fontSize: scaleW(22), fontWeight: "800", color: SCAVENGER_BG }}>
                  {selected.name}
                </ThemedText>
                {!!selected.description && (
                  <ThemedText style={{ marginTop: scaleW(8), color: "#4a4a4a", fontSize: scaleW(14), lineHeight: scaleW(20) }}>
                    {selected.description}
                  </ThemedText>
                )}
                {!!selected.hint && (
                  <Pressable onPress={() => setShowHint((v) => !v)} style={{ marginTop: scaleW(12) }}>
                    <ThemedText style={{ color: SCAVENGER_GREEN, fontWeight: "700" }}>
                      {showHint ? "Hide hint" : "Show hint"}
                    </ThemedText>
                  </Pressable>
                )}
                {showHint && !!selected.hint && (
                  <View style={[styles.hintBox, { marginTop: scaleW(8), padding: scaleW(14), borderRadius: scaleW(10) }]}>
                    <ThemedText style={{ color: "#333", fontSize: scaleW(14), lineHeight: scaleW(20) }}>
                      💡 {selected.hint}
                    </ThemedText>
                  </View>
                )}
                {!!selected.warning && (
                  <View
                    style={[
                      styles.warning,
                      {
                        marginTop: scaleW(12),
                        padding: scaleW(14),
                        borderRadius: scaleW(10),
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: scaleW(8),
                      },
                    ]}
                  >
                    <MaterialIcons name="warning-amber" size={scaleW(24)} color={SCAVENGER_WARNING} />
                    <ThemedText style={{ flex: 1, color: "#333", fontSize: scaleW(14), lineHeight: scaleW(20) }}>
                      {selected.warning}
                    </ThemedText>
                  </View>
                )}
                <Pressable
                  onPress={onFoundPress}
                  disabled={busy || foundIds.has(selected.id)}
                  style={[
                    styles.cta,
                    {
                      marginTop: scaleW(18),
                      paddingVertical: scaleW(14),
                      borderRadius: scaleW(28),
                      opacity: busy || foundIds.has(selected.id) ? 0.6 : 1,
                    },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontWeight: "800", fontSize: scaleW(16) }}>
                      {foundIds.has(selected.id) ? "Already found" : "I found it!"}
                    </ThemedText>
                  )}
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={triviaOpen} transparent animationType="fade" onRequestClose={() => setTriviaOpen(false)}>
        <View style={styles.modalBackdropCenter}>
          <View style={[styles.triviaCard, { marginHorizontal: scaleW(24), padding: scaleW(20), borderRadius: scaleW(18) }]}>
            <ThemedText type="heading" style={{ fontSize: scaleW(20), fontWeight: "800", color: SCAVENGER_BG }}>
              Quick question
            </ThemedText>
            <ThemedText style={{ marginTop: scaleW(10), color: "#333", fontSize: scaleW(15) }}>
              {selected?.question}
            </ThemedText>
            <TextInput
              value={answer}
              onChangeText={setAnswer}
              placeholder="Your answer"
              placeholderTextColor="#999"
              style={[styles.input, { marginTop: scaleW(14), padding: scaleW(12), borderRadius: scaleW(12) }]}
            />
            {!!triviaError && (
              <ThemedText style={{ color: "#B42318", marginTop: scaleW(8) }}>{triviaError}</ThemedText>
            )}
            <View style={{ flexDirection: "row", gap: scaleW(10), marginTop: scaleW(16) }}>
              <Pressable
                onPress={() => {
                  setTriviaOpen(false);
                  setAnswer("");
                  setTriviaError(null);
                }}
                style={[styles.secondaryBtn, { flex: 1, paddingVertical: scaleW(12), borderRadius: scaleW(24) }]}
              >
                <ThemedText style={{ textAlign: "center", fontWeight: "700", color: SCAVENGER_BG }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={submitTrivia}
                disabled={busy}
                style={[styles.cta, { flex: 1, paddingVertical: scaleW(12), borderRadius: scaleW(24) }]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText lightColor="#fff" darkColor="#fff" style={{ textAlign: "center", fontWeight: "800" }}>
                    Check
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SCAVENGER_LIGHT },
  hero: { backgroundColor: SCAVENGER_BG, paddingTop: 8 },
  endBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  progressTrack: { backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: SCAVENGER_ACCENT },
  tile: { backgroundColor: "#fff" },
  checkBadge: { position: "absolute", top: 8, right: 8 },
  takeCarePill: { backgroundColor: "rgba(226,161,0,0.2)" },
  hintBox: { backgroundColor: "rgba(98,169,79,0.15)" },
  switcherWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: "center",
  },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalBackdropCenter: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: "#fff", maxHeight: "88%" },
  warning: { backgroundColor: "rgba(226,161,0,0.15)" },
  cta: { backgroundColor: SCAVENGER_GREEN, alignItems: "center" },
  secondaryBtn: { backgroundColor: "#E8EEE8" },
  triviaCard: { backgroundColor: "#fff" },
  input: { backgroundColor: "#F3F5F3", color: "#1A2E1E" },
});
