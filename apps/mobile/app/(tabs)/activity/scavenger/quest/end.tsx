import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
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
  SCAVENGER_CTA_GRADIENT,
  SCAVENGER_GOLD,
  SCAVENGER_GREEN,
  SCAVENGER_LIGHT,
  scavengerSoftShadow,
} from "@/constants/scavengerTheme";
import { createHuntJournalEntry } from "@/services/journalService";
import {
  clearActiveHuntSession,
  getActiveHuntSession,
} from "@/services/activeHuntSessionService";
import {
  discardSessionPhotos,
  endHuntSession,
  fetchQuestById,
  fetchQuestItems,
  fetchQuestState,
  fetchSessionPhotos,
  type ScavengerQuest,
  type ScavengerSessionPhoto,
} from "@/services/scavengerService";

const PROFILE_KEY = "scavenger_selected_profile_id";

function StatCard({
  icon,
  value,
  label,
  scaleW,
  accent = SCAVENGER_GREEN,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  label: string;
  scaleW: (n: number) => number;
  accent?: string;
}) {
  return (
    <View style={[styles.statCard, { borderRadius: scaleW(16), padding: scaleW(14) }]}>
      <View
        style={[
          styles.statIcon,
          { width: scaleW(34), height: scaleW(34), borderRadius: scaleW(10), backgroundColor: `${accent}22` },
        ]}
      >
        <MaterialIcons name={icon} size={scaleW(19)} color={accent} />
      </View>
      <ThemedText style={{ marginTop: scaleW(8), fontSize: scaleW(20), fontWeight: "800", color: SCAVENGER_BG }}>
        {value}
      </ThemedText>
      <ThemedText style={{ marginTop: scaleW(1), fontSize: scaleW(12), fontWeight: "600", color: "#7A8A7C" }}>
        {label}
      </ThemedText>
    </View>
  );
}

export default function ScavengerEndSessionScreen() {
  const {
    questId,
    profileId: profileIdParam,
    photoCount: photoCountParam,
  } = useLocalSearchParams<{
    questId: string;
    profileId?: string;
    photoCount?: string;
  }>();
  const router = useRouter();
  const { scaleW } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const { profiles } = usePlayer();
  const { user } = useAuth();
  const finishingRef = useRef(false);

  const [profileId, setProfileId] = useState<number | null>(
    profileIdParam ? Number(profileIdParam) : null
  );
  const [quest, setQuest] = useState<ScavengerQuest | null>(null);
  const [photos, setPhotos] = useState<ScavengerSessionPhoto[] | null>(null);
  const [found, setFound] = useState(0);
  const [total, setTotal] = useState(0);
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [xpMessage, setXpMessage] = useState<string | null>(null);

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

  const finish = useCallback(
    async (
      discardPhotos: boolean,
      currentQuest: ScavengerQuest | null,
      isComplete: boolean,
      sessionPhotos: ScavengerSessionPhoto[]
    ) => {
      if (!questId || !profileId || finishingRef.current) return;
      finishingRef.current = true;
      setBusy(true);
      try {
        const photosForJournal = discardPhotos ? [] : sessionPhotos;
        if (discardPhotos) {
          await discardSessionPhotos(profileId, questId);
        }
        const activeSession = await getActiveHuntSession();
        const result = await endHuntSession(profileId, questId);
        if (result.awarded && result.message) {
          setXpMessage(`${result.message} (+${result.xp} XP)`);
          await new Promise((r) => setTimeout(r, 900));
        }

        const sessionItemIds = new Set(result.item_ids ?? []);
        const sessionStartedAt = activeSession?.startedAt
          ? new Date(activeSession.startedAt).getTime()
          : 0;

        // Only photos for items found in THIS session (not prior sessions).
        const sessionPhotosForJournal = photosForJournal.filter((photo) => {
          if (photo.quest_item_id && sessionItemIds.has(photo.quest_item_id)) {
            return true;
          }
          if (!photo.quest_item_id && sessionStartedAt > 0) {
            return new Date(photo.created_at).getTime() >= sessionStartedAt;
          }
          return false;
        });

        // Log session to journal only when something was found this session.
        // XP already comes from scavenger_end_session.
        if (user?.id && currentQuest && sessionItemIds.size > 0) {
          try {
            const profile = profiles.find((p) => p.id === profileId);
            const today = new Date().toISOString().slice(0, 10);
            const questItems = await fetchQuestItems(questId);
            const nameById = new Map(questItems.map((item) => [item.id, item.name]));
            const foundItemNames = result.item_ids
              .map((id) => nameById.get(id))
              .filter((name): name is string => Boolean(name));

            await createHuntJournalEntry({
              userId: user.id,
              profileId,
              questId,
              questName: currentQuest.name,
              itemsFoundThisSession: sessionItemIds.size,
              foundItemNames,
              xp: result.xp ?? 0,
              complete: Boolean(result.complete || isComplete),
              endedAt: new Date().toISOString(),
              entryDate: today,
              selectedProfiles: profile
                ? [{ id: profile.id, nickname: profile.nickname }]
                : [],
              photoUrls: sessionPhotosForJournal.map((p) => p.photo_url),
            });
          } catch (journalError) {
            console.error("Failed to create hunt journal entry:", journalError);
          }
        }

        // Always clear session photos so the next hunt session starts clean.
        if (!discardPhotos) {
          await discardSessionPhotos(profileId, questId);
        }

        await clearActiveHuntSession();

        const allDone = result.complete || isComplete;
        const hasCompletion = Boolean(currentQuest?.on_completion?.cta);

        if (allDone && hasCompletion) {
          router.replace({
            pathname: "/(tabs)/activity/scavenger/quest/complete",
            params: { questId, profileId: String(profileId) },
          });
          return;
        }
        if (currentQuest?.group_id) {
          router.replace(
            `/(tabs)/activity/scavenger/group/${currentQuest.group_id}`
          );
          return;
        }
        router.replace("/(tabs)/activity/scavenger");
      } catch (e) {
        finishingRef.current = false;
        Alert.alert(
          "Couldn’t end session",
          e instanceof Error ? e.message : "Try again"
        );
      } finally {
        setBusy(false);
      }
    },
    [questId, profileId, router, user?.id, profiles]
  );

  useEffect(() => {
    if (!questId || !profileId) return;
    (async () => {
      try {
        const [q, items, state, sessionPhotos] = await Promise.all([
          fetchQuestById(questId),
          fetchQuestItems(questId),
          fetchQuestState(profileId, questId),
          fetchSessionPhotos(profileId, questId),
        ]);
        setQuest(q);
        setTotal(items.length);
        setFound(state?.found_items.length ?? 0);
        setComplete(Boolean(state?.complete));
        if (sessionPhotos.length === 0) {
          setPhotos(sessionPhotos);
          await finish(false, q, Boolean(state?.complete), sessionPhotos);
          return;
        }
        await prefetchScavengerImages(sessionPhotos.map((photo) => photo.photo_url));
        setPhotos(sessionPhotos);
      } catch (e) {
        Alert.alert(
          "Couldn’t end session",
          e instanceof Error ? e.message : "Try again"
        );
      }
    })();
  }, [questId, profileId, finish]);

  if (photos === null || (photos.length === 0 && !xpMessage)) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe}>
          <StatusBar style="dark" />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={SCAVENGER_GREEN} />
            {!!xpMessage && (
              <ThemedText
                style={{
                  textAlign: "center",
                  marginTop: scaleW(16),
                  color: SCAVENGER_GREEN,
                  fontWeight: "800",
                }}
              >
                {xpMessage}
              </ThemedText>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const photoCount = Number(photoCountParam) > 0 || photos.length > 0 ? photos.length : 0;

  return (
    <>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: scaleW(20),
              paddingBottom: insets.bottom + scaleW(140),
            }}
          >
            <Animated.View entering={FadeInDown.duration(360)}>
              <View style={[styles.badge, { width: scaleW(60), height: scaleW(60), borderRadius: scaleW(20) }]}>
                <MaterialIcons name={complete ? "emoji-events" : "check-circle"} size={scaleW(34)} color={complete ? SCAVENGER_GOLD : SCAVENGER_ACCENT} />
              </View>
              <ThemedText
                type="heading"
                style={{ marginTop: scaleW(14), fontSize: scaleW(28), fontWeight: "800", color: SCAVENGER_BG }}
              >
                {complete ? "Hunt complete!" : "Nice work!"}
              </ThemedText>
              <ThemedText style={{ marginTop: scaleW(4), color: "#5a6a5c", fontSize: scaleW(15), lineHeight: scaleW(21) }}>
                {quest?.name ? `${quest.name} · ` : ""}Here’s how you did.
              </ThemedText>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(360).delay(100)} style={{ flexDirection: "row", gap: scaleW(10), marginTop: scaleW(18) }}>
              <StatCard icon="stars" value={`${found}/${total}`} label="Found" scaleW={scaleW} accent={SCAVENGER_GREEN} />
              <StatCard icon="photo-camera" value={String(photoCount)} label={photoCount === 1 ? "Photo" : "Photos"} scaleW={scaleW} accent={SCAVENGER_GOLD} />
            </Animated.View>

            {!!xpMessage && (
              <Animated.View entering={FadeInDown.duration(360).delay(160)}>
                <View style={[styles.xpPill, { marginTop: scaleW(14), paddingVertical: scaleW(12), paddingHorizontal: scaleW(14), borderRadius: scaleW(14) }]}>
                  <MaterialIcons name="auto-awesome" size={scaleW(18)} color={SCAVENGER_GOLD} />
                  <ThemedText style={{ flex: 1, color: SCAVENGER_BG, fontWeight: "800", fontSize: scaleW(14) }}>
                    {xpMessage}
                  </ThemedText>
                </View>
              </Animated.View>
            )}

            {photos.length > 0 && (
              <ThemedText style={{ marginTop: scaleW(24), marginBottom: scaleW(2), fontSize: scaleW(12), fontWeight: "800", color: "#7A8A7C", textTransform: "uppercase", letterSpacing: 1 }}>
                Your snaps
              </ThemedText>
            )}
            <View style={{ marginTop: scaleW(12), gap: scaleW(14) }}>
              {photos.map((photo, index) => (
                <Animated.View
                  key={photo.id}
                  entering={FadeInDown.duration(360).delay(Math.min(index, 6) * 60)}
                  style={[
                    styles.photoCard,
                    { borderRadius: scaleW(18) },
                  ]}
                >
                  <View style={{ borderRadius: scaleW(18), overflow: "hidden" }}>
                    <ScavengerImage
                      uri={photo.photo_url}
                      style={{ width: "100%", height: scaleW(220) }}
                    />
                    {!!photo.item_name && (
                      <View style={[styles.photoCaption, { paddingHorizontal: scaleW(12), paddingVertical: scaleW(6), borderRadius: scaleW(999), bottom: scaleW(12), left: scaleW(12) }]}>
                        <MaterialIcons name="check-circle" size={scaleW(13)} color="#fff" />
                        <ThemedText style={{ fontWeight: "800", color: "#fff", fontSize: scaleW(12) }}>
                          {photo.item_name}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </Animated.View>
              ))}
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingBottom: insets.bottom + scaleW(12),
                paddingHorizontal: scaleW(20),
                paddingTop: scaleW(14),
                gap: scaleW(10),
              },
            ]}
          >
            <Pressable
              onPress={() => finish(false, quest, complete, photos)}
              disabled={busy}
              style={[
                styles.ctaWrap,
                { borderRadius: scaleW(28), opacity: busy ? 0.7 : 1 },
              ]}
            >
              <LinearGradient
                colors={SCAVENGER_CTA_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.cta, { paddingVertical: scaleW(15), borderRadius: scaleW(28) }]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="collections-bookmark" size={scaleW(19)} color="#fff" />
                    <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontWeight: "800", fontSize: scaleW(16) }}>
                      Keep photos & finish
                    </ThemedText>
                  </>
                )}
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => finish(true, quest, complete, photos)}
              disabled={busy}
              style={[
                styles.secondary,
                { paddingVertical: scaleW(14), borderRadius: scaleW(28) },
              ]}
            >
              <ThemedText
                style={{
                  fontWeight: "800",
                  fontSize: scaleW(15),
                  color: "#6b7a6d",
                  textAlign: "center",
                }}
              >
                Discard photos & finish
              </ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SCAVENGER_LIGHT },
  safe: { flex: 1 },
  badge: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    ...scavengerSoftShadow,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    ...scavengerSoftShadow,
  },
  statIcon: { alignItems: "center", justifyContent: "center" },
  xpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(244,197,80,0.16)",
    borderWidth: 1,
    borderColor: "rgba(244,197,80,0.35)",
  },
  photoCard: { backgroundColor: "#fff", ...scavengerSoftShadow },
  photoCaption: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: SCAVENGER_ACCENT,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SCAVENGER_LIGHT,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  ctaWrap: { overflow: "hidden", ...scavengerSoftShadow },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  secondary: { backgroundColor: "#E5EDE5" },
});
