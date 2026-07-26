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
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
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
  SCAVENGER_CTA_GRADIENT,
  SCAVENGER_GOLD,
  SCAVENGER_GREEN,
  SCAVENGER_HEADER_GRADIENT,
  SCAVENGER_IMAGE_SCRIM,
  SCAVENGER_LIGHT,
  SCAVENGER_WARNING,
  scavengerSoftShadow,
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
  const allDone = found >= total && total > 0;
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
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
        <LinearGradient
          colors={SCAVENGER_HEADER_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.hero,
            {
              paddingHorizontal: scaleW(16),
              paddingBottom: scaleW(18),
              borderBottomLeftRadius: scaleW(24),
              borderBottomRightRadius: scaleW(24),
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable onPress={endSession} hitSlop={10} style={styles.endBtn}>
              <MaterialIcons name="flag" size={scaleW(14)} color="#fff" />
              <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontWeight: "800", fontSize: scaleW(13) }}>
                End
              </ThemedText>
            </Pressable>
            <ThemedText lightColor="#fff" darkColor="#fff" numberOfLines={1} style={{ flex: 1, textAlign: "center", fontWeight: "800", fontSize: scaleW(16), marginHorizontal: scaleW(8) }}>
              {quest?.name ?? "Scavenger Hunt"}
            </ThemedText>
            <View style={{ width: scaleW(64) }} />
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: scaleW(14) }}>
            <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontWeight: "800", fontSize: scaleW(15) }}>
              {allDone ? "All found — amazing!" : `${found} of ${total} found`}
            </ThemedText>
            <View style={[styles.countBadge, { paddingHorizontal: scaleW(10), paddingVertical: scaleW(3), borderRadius: scaleW(999) }]}>
              {allDone && <MaterialIcons name="emoji-events" size={scaleW(13)} color={SCAVENGER_BG} />}
              <ThemedText style={{ fontSize: scaleW(12), fontWeight: "800", color: SCAVENGER_BG }}>
                {Math.round(ratio * 100)}%
              </ThemedText>
            </View>
          </View>

          <View style={[styles.progressTrack, { marginTop: scaleW(8), height: scaleW(10), borderRadius: scaleW(6) }]}>
            <LinearGradient
              colors={allDone ? (["#F7CE5E", "#E0A32E"] as const) : (["#8FD873", "#5FA84C"] as const)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: `${ratio * 100}%`, height: "100%", borderRadius: scaleW(6) }}
            />
          </View>
        </LinearGradient>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={SCAVENGER_GREEN} />
          </View>
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
            showsVerticalScrollIndicator={false}
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
                    void Haptics.selectionAsync();
                    setSelected(item);
                    setShowHint(false);
                  }}
                  style={({ pressed }) => [
                    styles.tile,
                    {
                      width: tileSize,
                      borderRadius: scaleW(18),
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  <View style={{ borderRadius: scaleW(18), overflow: "hidden" }}>
                    <View>
                      <ScavengerImage
                        uri={item.image_url}
                        style={{ width: "100%", height: scaleW(118) }}
                        fallback={
                          <View style={{ height: scaleW(118), backgroundColor: "#D7E4D7", alignItems: "center", justifyContent: "center" }}>
                            <MaterialIcons name="image" size={scaleW(28)} color={SCAVENGER_GREEN} />
                          </View>
                        }
                      />
                      {isFound && (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(45,90,39,0.35)" }]} />
                      )}
                      {!!item.warning && (
                        <View
                          style={[
                            styles.warnCorner,
                            { top: scaleW(8), left: scaleW(8), paddingHorizontal: scaleW(8), paddingVertical: scaleW(3), borderRadius: scaleW(999) },
                          ]}
                        >
                          <MaterialIcons name="warning-amber" size={scaleW(11)} color="#fff" />
                          <ThemedText style={{ fontSize: scaleW(10), fontWeight: "800", color: "#fff" }}>Care</ThemedText>
                        </View>
                      )}
                      {isFound && (
                        <View style={[styles.checkBadge, { width: scaleW(30), height: scaleW(30), borderRadius: scaleW(15), top: scaleW(8), right: scaleW(8) }]}>
                          <MaterialIcons name="check" size={scaleW(20)} color="#fff" />
                        </View>
                      )}
                    </View>
                    <View style={{ padding: scaleW(10), alignItems: "center" }}>
                      <ThemedText style={{ fontWeight: "800", fontSize: scaleW(13), color: SCAVENGER_BG, textAlign: "center" }} numberOfLines={2}>
                        {item.name}
                      </ThemedText>
                      {isFound ? (
                        <ThemedText style={{ marginTop: scaleW(4), fontSize: scaleW(11), fontWeight: "800", color: SCAVENGER_ACCENT }}>
                          Found!
                        </ThemedText>
                      ) : (
                        <ThemedText style={{ marginTop: scaleW(4), fontSize: scaleW(11), fontWeight: "700", color: "#8AA08D" }}>
                          Tap to find
                        </ThemedText>
                      )}
                    </View>
                  </View>
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
            style={[styles.sheet, { padding: scaleW(20), paddingBottom: insets.bottom + scaleW(20), borderTopLeftRadius: scaleW(28), borderTopRightRadius: scaleW(28) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.grabber, { width: scaleW(44), height: scaleW(5), borderRadius: scaleW(3), marginBottom: scaleW(14) }]} />
            {selected && (
              <>
                {selected.image_url ? (
                  <View style={{ borderRadius: scaleW(18), overflow: "hidden" }}>
                    <ScavengerImage
                      uri={selected.image_url}
                      style={{ width: "100%", height: scaleW(190) }}
                    />
                    {foundIds.has(selected.id) && (
                      <>
                        <LinearGradient colors={SCAVENGER_IMAGE_SCRIM} style={StyleSheet.absoluteFill} />
                        <View style={[styles.foundTag, { bottom: scaleW(12), left: scaleW(12), paddingHorizontal: scaleW(10), paddingVertical: scaleW(5), borderRadius: scaleW(999) }]}>
                          <MaterialIcons name="check-circle" size={scaleW(14)} color="#fff" />
                          <ThemedText style={{ fontSize: scaleW(12), fontWeight: "800", color: "#fff" }}>Found</ThemedText>
                        </View>
                      </>
                    )}
                  </View>
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
                  <Pressable
                    onPress={() => setShowHint((v) => !v)}
                    style={{ marginTop: scaleW(12), flexDirection: "row", alignItems: "center", gap: scaleW(6), alignSelf: "flex-start" }}
                  >
                    <MaterialIcons name={showHint ? "lightbulb" : "lightbulb-outline"} size={scaleW(18)} color={SCAVENGER_GREEN} />
                    <ThemedText style={{ color: SCAVENGER_GREEN, fontWeight: "800" }}>
                      {showHint ? "Hide hint" : "Show hint"}
                    </ThemedText>
                  </Pressable>
                )}
                {showHint && !!selected.hint && (
                  <View style={[styles.hintBox, { marginTop: scaleW(10), padding: scaleW(14), borderRadius: scaleW(14) }]}>
                    <ThemedText style={{ color: "#2f4a33", fontSize: scaleW(14), lineHeight: scaleW(20) }}>
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
                        borderRadius: scaleW(14),
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: scaleW(10),
                      },
                    ]}
                  >
                    <MaterialIcons name="warning-amber" size={scaleW(22)} color={SCAVENGER_WARNING} />
                    <ThemedText style={{ flex: 1, color: "#6b5200", fontSize: scaleW(14), lineHeight: scaleW(20) }}>
                      {selected.warning}
                    </ThemedText>
                  </View>
                )}
                <Pressable
                  onPress={onFoundPress}
                  disabled={busy || foundIds.has(selected.id)}
                  style={({ pressed }) => [
                    styles.ctaWrap,
                    {
                      marginTop: scaleW(18),
                      borderRadius: scaleW(28),
                      opacity: busy || foundIds.has(selected.id) ? 0.6 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={foundIds.has(selected.id) ? (["#9AAE9D", "#7E927F"] as const) : SCAVENGER_CTA_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.cta, { paddingVertical: scaleW(15), borderRadius: scaleW(28) }]}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name={foundIds.has(selected.id) ? "check-circle" : "search"} size={scaleW(20)} color="#fff" />
                        <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontWeight: "800", fontSize: scaleW(16) }}>
                          {foundIds.has(selected.id) ? "Already found" : "I found it!"}
                        </ThemedText>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={triviaOpen} transparent animationType="fade" onRequestClose={() => setTriviaOpen(false)}>
        <View style={styles.modalBackdropCenter}>
          <View style={[styles.triviaCard, { marginHorizontal: scaleW(24), padding: scaleW(22), borderRadius: scaleW(22) }]}>
            <View style={[styles.quizIcon, { width: scaleW(48), height: scaleW(48), borderRadius: scaleW(16), marginBottom: scaleW(12) }]}>
              <MaterialIcons name="quiz" size={scaleW(26)} color="#fff" />
            </View>
            <ThemedText type="heading" style={{ fontSize: scaleW(20), fontWeight: "800", color: SCAVENGER_BG }}>
              Quick question
            </ThemedText>
            <ThemedText style={{ marginTop: scaleW(8), color: "#333", fontSize: scaleW(15), lineHeight: scaleW(21) }}>
              {selected?.question}
            </ThemedText>
            <TextInput
              value={answer}
              onChangeText={setAnswer}
              placeholder="Your answer"
              placeholderTextColor="#9AA79B"
              style={[styles.input, { marginTop: scaleW(14), padding: scaleW(14), borderRadius: scaleW(14) }]}
            />
            {!!triviaError && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: scaleW(6), marginTop: scaleW(10) }}>
                <MaterialIcons name="error-outline" size={scaleW(16)} color="#B42318" />
                <ThemedText style={{ color: "#B42318", fontWeight: "600" }}>{triviaError}</ThemedText>
              </View>
            )}
            <View style={{ flexDirection: "row", gap: scaleW(10), marginTop: scaleW(18) }}>
              <Pressable
                onPress={() => {
                  setTriviaOpen(false);
                  setAnswer("");
                  setTriviaError(null);
                }}
                style={[styles.secondaryBtn, { flex: 1, paddingVertical: scaleW(13), borderRadius: scaleW(24) }]}
              >
                <ThemedText style={{ textAlign: "center", fontWeight: "800", color: SCAVENGER_BG }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={submitTrivia}
                disabled={busy}
                style={[styles.ctaWrap, { flex: 1, borderRadius: scaleW(24) }]}
              >
                <LinearGradient
                  colors={SCAVENGER_CTA_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.cta, { paddingVertical: scaleW(13), borderRadius: scaleW(24) }]}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText lightColor="#fff" darkColor="#fff" style={{ textAlign: "center", fontWeight: "800" }}>
                      Check
                    </ThemedText>
                  )}
                </LinearGradient>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: SCAVENGER_GOLD,
  },
  progressTrack: { backgroundColor: "rgba(0,0,0,0.22)", overflow: "hidden" },
  tile: { backgroundColor: "#fff", ...scavengerSoftShadow },
  checkBadge: {
    position: "absolute",
    backgroundColor: SCAVENGER_CHECK,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  warnCorner: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(226,161,0,0.92)",
  },
  switcherWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: "center",
  },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalBackdropCenter: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { backgroundColor: "#fff", maxHeight: "88%" },
  grabber: { backgroundColor: "#D2DED3", alignSelf: "center" },
  foundTag: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: SCAVENGER_ACCENT,
  },
  hintBox: { backgroundColor: "rgba(98,169,79,0.15)" },
  warning: { backgroundColor: "rgba(226,161,0,0.15)" },
  ctaWrap: { overflow: "hidden" },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  secondaryBtn: { backgroundColor: "#E8EEE8" },
  triviaCard: { backgroundColor: "#fff", ...scavengerSoftShadow },
  quizIcon: { backgroundColor: SCAVENGER_GREEN, alignItems: "center", justifyContent: "center" },
  input: { backgroundColor: "#F3F5F3", color: "#1A2E1E", borderWidth: 1, borderColor: "#E1E8E1" },
});
