import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  SCAVENGER_ACCENT,
  SCAVENGER_BG,
  SCAVENGER_CARD,
  SCAVENGER_GREEN,
} from "@/constants/scavengerTheme";
import {
  prefetchScavengerImages,
  ScavengerImage,
} from "@/components/scavenger/ScavengerImage";
import {
  fetchPublishedQuestGroups,
  fetchPublishedQuests,
  fetchQuestStatesForProfile,
  type ScavengerQuest,
  type ScavengerQuestGroup,
  type ScavengerQuestState,
} from "@/services/scavengerService";
import { distanceKm as haversineKm, formatDistanceKm } from "@/utils/geo";

const PROFILE_KEY = "scavenger_selected_profile_id";
const NEARBY_RADIUS_KM = 8;

type Coords = { lat: number; lng: number };

type ListRow =
  | { kind: "header"; id: string; title: string }
  | { kind: "group"; id: string; group: ScavengerQuestGroup }
  | { kind: "quest"; id: string; quest: ScavengerQuest; distanceKm?: number };

export default function ScavengerBrowseScreen() {
  const router = useRouter();
  const { scaleW } = useLayoutScale();
  const { profiles } = usePlayer();

  const [profileId, setProfileId] = useState<number | null>(null);
  const [quests, setQuests] = useState<ScavengerQuest[]>([]);
  const [groups, setGroups] = useState<ScavengerQuestGroup[]>([]);
  const [states, setStates] = useState<ScavengerQuestState[]>([]);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const selectProfile = async (id: number) => {
    setProfileId(id);
    await AsyncStorage.setItem(PROFILE_KEY, String(id));
  };

  const load = useCallback(async () => {
    if (!profileId) return;
    try {
      const [q, g, s] = await Promise.all([
        fetchPublishedQuests(),
        fetchPublishedQuestGroups(),
        fetchQuestStatesForProfile(profileId),
      ]);
      setQuests(q);
      setGroups(g);
      setStates(s);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } else {
        setCoords(null);
      }

      await prefetchScavengerImages([
        ...g.slice(0, 4).map((group) => group.cover_image_url),
        ...q.slice(0, 8).flatMap((quest) => [quest.tile_image_url, quest.cover_image_url]),
      ]);
    } catch (e) {
      Alert.alert("Couldn’t load scavenger hunts", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (profileId) {
      setLoading(true);
      void load();
    }
  }, [profileId, load]);

  const stateByQuest = useMemo(() => {
    const map = new Map<string, ScavengerQuestState>();
    for (const state of states) map.set(state.quest_id, state);
    return map;
  }, [states]);

  const visibleQuests = useMemo(
    () => quests.filter((quest) => !quest.lockable),
    [quests]
  );

  const visibleGroups = useMemo(
    () => groups.filter((group) => !group.lockable),
    [groups]
  );

  const nearbyQuests = useMemo(() => {
    if (!coords) return [] as { quest: ScavengerQuest; distanceKm: number }[];
    return visibleQuests
      .filter((q) => q.attraction_lat != null && q.attraction_lng != null)
      .map((quest) => ({
        quest,
        distanceKm: haversineKm(coords, {
          lat: quest.attraction_lat!,
          lng: quest.attraction_lng!,
        }),
      }))
      .filter((item) => item.distanceKm <= NEARBY_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [visibleQuests, coords]);

  const nearbyQuestIds = useMemo(
    () => new Set(nearbyQuests.map((item) => item.quest.id)),
    [nearbyQuests]
  );

  const otherQuests = useMemo(
    () => visibleQuests.filter((quest) => !nearbyQuestIds.has(quest.id)),
    [visibleQuests, nearbyQuestIds]
  );

  const listData = useMemo((): ListRow[] => {
    const rows: ListRow[] = [];
    if (nearbyQuests.length) {
      rows.push({ kind: "header", id: "nearby-h", title: "Nearby" });
      for (const item of nearbyQuests) {
        rows.push({
          kind: "quest",
          id: `nearby-${item.quest.id}`,
          quest: item.quest,
          distanceKm: item.distanceKm,
        });
      }
    }
    if (visibleGroups.length) {
      rows.push({ kind: "header", id: "groups-h", title: "Quest groups" });
      for (const g of visibleGroups) {
        rows.push({ kind: "group", id: g.id, group: g });
      }
    }
    if (otherQuests.length) {
      rows.push({
        kind: "header",
        id: "quests-h",
        title: nearbyQuests.length ? "More scavenger hunts" : "Scavenger hunts",
      });
      for (const q of otherQuests) {
        rows.push({ kind: "quest", id: q.id, quest: q });
      }
    }
    return rows;
  }, [nearbyQuests, visibleGroups, otherQuests]);

  const statusLabel = (questId: string) => {
    const state = stateByQuest.get(questId);
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
        <View style={[styles.header, { paddingHorizontal: scaleW(20), paddingBottom: scaleW(16) }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={scaleW(26)} color="#fff" />
          </Pressable>
          <ThemedText type="heading" lightColor="#fff" darkColor="#fff" style={{ fontSize: scaleW(26), fontWeight: "800" }}>
            Scavenger Hunt
          </ThemedText>
          <ThemedText lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)" style={{ marginTop: scaleW(4), fontSize: scaleW(14) }}>
            Find clues and explore outdoors
          </ThemedText>
        </View>

        {profiles.length > 1 && (
          <View style={{ paddingHorizontal: scaleW(20), marginBottom: scaleW(12), flexDirection: "row", flexWrap: "wrap", gap: scaleW(8) }}>
            {profiles.map((profile) => {
              const active = profile.id === profileId;
              return (
                <Pressable
                  key={profile.id}
                  onPress={() => selectProfile(profile.id)}
                  style={[
                    styles.chip,
                    { paddingHorizontal: scaleW(12), paddingVertical: scaleW(8), borderRadius: scaleW(16) },
                    active && styles.chipActive,
                  ]}
                >
                  <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontSize: scaleW(13), fontWeight: active ? "700" : "500" }}>
                    {profile.nickname}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}

        {loading || !profileId ? (
          <ActivityIndicator color="#fff" style={{ marginTop: scaleW(40) }} />
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: scaleW(20), paddingBottom: scaleW(40), gap: scaleW(12) }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void load();
                }}
                tintColor="#fff"
              />
            }
            ListEmptyComponent={
              <ThemedText lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)" style={{ textAlign: "center", marginTop: scaleW(40) }}>
                No scavenger hunts available yet. Check back soon!
              </ThemedText>
            }
            renderItem={({ item }) => {
              if (item.kind === "header") {
                return (
                  <ThemedText lightColor="rgba(255,255,255,0.85)" darkColor="rgba(255,255,255,0.85)" style={{ fontSize: scaleW(13), fontWeight: "700", marginTop: scaleW(8), textTransform: "uppercase", letterSpacing: 0.6 }}>
                    {item.title}
                  </ThemedText>
                );
              }
              if (item.kind === "group") {
                const group = item.group;
                return (
                  <Pressable
                    onPress={() => router.push(`/(tabs)/activity/scavenger/group/${group.id}`)}
                    style={[styles.card, { borderRadius: scaleW(16), overflow: "hidden" }]}
                  >
                    {group.cover_image_url ? (
                      <ScavengerImage
                        uri={group.cover_image_url}
                        tint="#fff"
                        style={{ width: "100%", height: scaleW(120) }}
                      />
                    ) : (
                      <View style={{ height: scaleW(80), backgroundColor: SCAVENGER_GREEN, alignItems: "center", justifyContent: "center" }}>
                        <MaterialIcons name="collections" size={scaleW(32)} color="#fff" />
                      </View>
                    )}
                    <View style={{ padding: scaleW(14) }}>
                      <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontSize: scaleW(18), fontWeight: "800" }}>
                        {group.name}
                      </ThemedText>
                      {!!group.description && (
                        <ThemedText lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)" numberOfLines={2} style={{ marginTop: scaleW(4), fontSize: scaleW(13) }}>
                          {group.description}
                        </ThemedText>
                      )}
                    </View>
                  </Pressable>
                );
              }
              const quest = item.quest;
              const label = statusLabel(quest.id);
              return (
                <Pressable
                  onPress={() => router.push(`/(tabs)/activity/scavenger/quest/${quest.id}?profileId=${profileId}`)}
                  style={[styles.card, { borderRadius: scaleW(16), overflow: "hidden", flexDirection: "row" }]}
                >
                  {quest.tile_image_url || quest.cover_image_url ? (
                    <ScavengerImage
                      uri={quest.tile_image_url || quest.cover_image_url}
                      tint="#fff"
                      style={{ width: scaleW(88), height: scaleW(88) }}
                    />
                  ) : (
                    <View style={{ width: scaleW(88), height: scaleW(88), backgroundColor: SCAVENGER_GREEN, alignItems: "center", justifyContent: "center" }}>
                      <MaterialIcons name="travel-explore" size={scaleW(28)} color="#fff" />
                    </View>
                  )}
                  <View style={{ flex: 1, padding: scaleW(12), justifyContent: "center" }}>
                    <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontSize: scaleW(16), fontWeight: "800" }}>
                      {quest.name}
                    </ThemedText>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: scaleW(6), marginTop: scaleW(6) }}>
                      {item.distanceKm != null && (
                        <View style={[styles.pill, { paddingHorizontal: scaleW(8), paddingVertical: scaleW(3), borderRadius: scaleW(10) }]}>
                          <ThemedText lightColor={SCAVENGER_ACCENT} darkColor={SCAVENGER_ACCENT} style={{ fontSize: scaleW(11), fontWeight: "700" }}>
                            {formatDistanceKm(item.distanceKm)}
                          </ThemedText>
                        </View>
                      )}
                      {!!label && (
                        <View style={[styles.pill, { paddingHorizontal: scaleW(8), paddingVertical: scaleW(3), borderRadius: scaleW(10) }]}>
                          <ThemedText lightColor={SCAVENGER_ACCENT} darkColor={SCAVENGER_ACCENT} style={{ fontSize: scaleW(11), fontWeight: "700" }}>
                            {label}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={scaleW(24)} color="rgba(255,255,255,0.45)" style={{ alignSelf: "center", marginRight: scaleW(8) }} />
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SCAVENGER_BG },
  header: { paddingTop: 8 },
  backBtn: { alignSelf: "flex-start", marginBottom: 16, padding: 4 },
  chip: { backgroundColor: "rgba(255,255,255,0.12)" },
  chipActive: { backgroundColor: "rgba(98,169,79,0.45)" },
  card: { backgroundColor: SCAVENGER_CARD },
  pill: { backgroundColor: "rgba(98,169,79,0.18)", alignSelf: "flex-start" },
});
