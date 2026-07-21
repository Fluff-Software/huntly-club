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
  SCAVENGER_GREEN,
  SCAVENGER_LIGHT,
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
          router.replace(
            `/(tabs)/activity/scavenger/quest/${questId}/complete?profileId=${profileId}`
          );
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
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <ActivityIndicator
          color={SCAVENGER_GREEN}
          style={{ marginTop: scaleW(60) }}
        />
        {!!xpMessage && (
          <ThemedText
            style={{
              textAlign: "center",
              marginTop: scaleW(16),
              color: SCAVENGER_GREEN,
              fontWeight: "700",
            }}
          >
            {xpMessage}
          </ThemedText>
        )}
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScrollView
          contentContainerStyle={{
            padding: scaleW(20),
            paddingBottom: insets.bottom + scaleW(120),
          }}
        >
          <ThemedText
            type="heading"
            style={{
              fontSize: scaleW(28),
              fontWeight: "800",
              color: SCAVENGER_BG,
            }}
          >
            Nice work!
          </ThemedText>
          <ThemedText
            style={{ marginTop: scaleW(8), color: "#5a5a5a", fontSize: scaleW(15) }}
          >
            {found} of {total} found this hunt
            {Number(photoCountParam) > 0 || photos.length > 0
              ? ` · ${photos.length} photo${photos.length === 1 ? "" : "s"}`
              : ""}
          </ThemedText>
          {!!xpMessage && (
            <ThemedText
              style={{
                marginTop: scaleW(10),
                color: SCAVENGER_ACCENT,
                fontWeight: "800",
              }}
            >
              {xpMessage}
            </ThemedText>
          )}

          <View style={{ marginTop: scaleW(20), gap: scaleW(12) }}>
            {photos.map((photo) => (
              <View
                key={photo.id}
                style={[
                  styles.photoCard,
                  { borderRadius: scaleW(14), overflow: "hidden" },
                ]}
              >
                <ScavengerImage
                  uri={photo.photo_url}
                  style={{ width: "100%", height: scaleW(220) }}
                />
                {!!photo.item_name && (
                  <View style={{ padding: scaleW(12) }}>
                    <ThemedText
                      style={{ fontWeight: "700", color: SCAVENGER_BG }}
                    >
                      {photo.item_name}
                    </ThemedText>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + scaleW(12),
              paddingHorizontal: scaleW(20),
              paddingTop: scaleW(12),
              gap: scaleW(10),
            },
          ]}
        >
          <Pressable
            onPress={() => finish(false, quest, complete, photos)}
            disabled={busy}
            style={[
              styles.cta,
              {
                paddingVertical: scaleW(14),
                borderRadius: scaleW(28),
                opacity: busy ? 0.7 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText
                lightColor="#fff"
                darkColor="#fff"
                style={{ fontWeight: "800", fontSize: scaleW(16) }}
              >
                Keep photos & finish
              </ThemedText>
            )}
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
                fontWeight: "700",
                fontSize: scaleW(15),
                color: SCAVENGER_BG,
                textAlign: "center",
              }}
            >
              Discard photos & finish
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SCAVENGER_LIGHT },
  photoCard: { backgroundColor: "#fff" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SCAVENGER_LIGHT,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  cta: { backgroundColor: SCAVENGER_GREEN, alignItems: "center" },
  secondary: { backgroundColor: "#E5EDE5" },
});
