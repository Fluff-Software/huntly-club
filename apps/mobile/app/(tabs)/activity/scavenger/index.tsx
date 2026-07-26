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
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import Animated, { FadeInDown } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  SCAVENGER_ACCENT,
  SCAVENGER_BG_DEEP,
  SCAVENGER_CARD_GRADIENT,
  SCAVENGER_CTA_GRADIENT,
  SCAVENGER_GOLD,
  SCAVENGER_GREEN,
  SCAVENGER_HAIRLINE,
  SCAVENGER_HEADER_GRADIENT,
  SCAVENGER_IMAGE_SCRIM,
  SCAVENGER_SCREEN_GRADIENT,
  SCAVENGER_TEXT_DIM,
  SCAVENGER_TEXT_FAINT,
  scavengerShadow,
  scavengerSoftShadow,
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
  | { kind: "header"; id: string; title: string; icon: keyof typeof MaterialIcons.glyphMap }
  | { kind: "group"; id: string; group: ScavengerQuestGroup }
  | { kind: "quest"; id: string; quest: ScavengerQuest; distanceKm?: number };

type StatusTone = "progress" | "complete";

function StatusPill({
  label,
  icon,
  tone,
  scaleW,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  tone: StatusTone;
  scaleW: (n: number) => number;
}) {
  const color = tone === "complete" ? SCAVENGER_ACCENT : SCAVENGER_GOLD;
  return (
    <View
      style={[
        styles.pill,
        {
          paddingHorizontal: scaleW(9),
          paddingVertical: scaleW(4),
          borderRadius: scaleW(999),
          backgroundColor:
            tone === "complete" ? "rgba(98,169,79,0.18)" : "rgba(244,197,80,0.18)",
        },
      ]}
    >
      <MaterialIcons name={icon} size={scaleW(13)} color={color} />
      <ThemedText style={{ fontSize: scaleW(11), fontWeight: "800", color }}>
        {label}
      </ThemedText>
    </View>
  );
}

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
      rows.push({ kind: "header", id: "nearby-h", title: "Nearby", icon: "near-me" });
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
      rows.push({ kind: "header", id: "groups-h", title: "Quest groups", icon: "auto-awesome-mosaic" });
      for (const g of visibleGroups) {
        rows.push({ kind: "group", id: g.id, group: g });
      }
    }
    if (otherQuests.length) {
      rows.push({
        kind: "header",
        id: "quests-h",
        title: nearbyQuests.length ? "More scavenger hunts" : "Scavenger hunts",
        icon: "travel-explore",
      });
      for (const q of otherQuests) {
        rows.push({ kind: "quest", id: q.id, quest: q });
      }
    }
    return rows;
  }, [nearbyQuests, visibleGroups, otherQuests]);

  const statusFor = (
    questId: string
  ): { label: string; icon: keyof typeof MaterialIcons.glyphMap; tone: StatusTone } | null => {
    const state = stateByQuest.get(questId);
    if (!state) return null;
    if (state.complete) return { label: "Complete", icon: "check-circle", tone: "complete" };
    if (state.found_items.length > 0)
      return { label: "In progress", icon: "bolt", tone: "progress" };
    return null;
  };

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.root}>
        <LinearGradient
          colors={SCAVENGER_SCREEN_GRADIENT}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
          {loading || !profileId ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <FlatList
              data={listData}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: scaleW(40), gap: scaleW(12) }}
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
              ListHeaderComponent={
                <View>
                  <LinearGradient
                    colors={SCAVENGER_HEADER_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.hero,
                      {
                        paddingHorizontal: scaleW(20),
                        paddingTop: scaleW(8),
                        paddingBottom: scaleW(28),
                        borderBottomLeftRadius: scaleW(28),
                        borderBottomRightRadius: scaleW(28),
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="travel-explore"
                      size={scaleW(180)}
                      color="rgba(255,255,255,0.06)"
                      style={{ position: "absolute", right: scaleW(-36), top: scaleW(-24) }}
                    />
                    <Pressable
                      onPress={() => router.back()}
                      hitSlop={12}
                      style={[styles.iconChip, { width: scaleW(40), height: scaleW(40), borderRadius: scaleW(20) }]}
                    >
                      <MaterialIcons name="arrow-back" size={scaleW(22)} color="#fff" />
                    </Pressable>
                    <View style={{ marginTop: scaleW(18), flexDirection: "row", alignItems: "center", gap: scaleW(6) }}>
                      <MaterialIcons name="hiking" size={scaleW(15)} color={SCAVENGER_GOLD} />
                      <ThemedText
                        lightColor={SCAVENGER_GOLD}
                        darkColor={SCAVENGER_GOLD}
                        style={{ fontSize: scaleW(12), fontWeight: "800", letterSpacing: 1.2 }}
                      >
                        EXPLORE OUTDOORS
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="heading"
                      lightColor="#fff"
                      darkColor="#fff"
                      style={{ marginTop: scaleW(4), fontSize: scaleW(30), fontWeight: "800", lineHeight: scaleW(34) }}
                    >
                      Scavenger Hunt
                    </ThemedText>
                    <ThemedText
                      lightColor={SCAVENGER_TEXT_DIM}
                      darkColor={SCAVENGER_TEXT_DIM}
                      style={{ marginTop: scaleW(6), fontSize: scaleW(14), lineHeight: scaleW(20) }}
                    >
                      Find hidden clues and discover the world around you.
                    </ThemedText>
                  </LinearGradient>

                  {profiles.length > 1 && (
                    <View
                      style={{
                        paddingHorizontal: scaleW(20),
                        marginTop: scaleW(16),
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: scaleW(8),
                      }}
                    >
                      {profiles.map((profile) => {
                        const active = profile.id === profileId;
                        return (
                          <Pressable
                            key={profile.id}
                            onPress={() => selectProfile(profile.id)}
                            style={[
                              styles.chip,
                              {
                                paddingHorizontal: scaleW(14),
                                paddingVertical: scaleW(9),
                                borderRadius: scaleW(999),
                              },
                              active && styles.chipActive,
                            ]}
                          >
                            {active && (
                              <MaterialIcons name="person" size={scaleW(14)} color="#fff" />
                            )}
                            <ThemedText
                              lightColor="#fff"
                              darkColor="#fff"
                              style={{ fontSize: scaleW(13), fontWeight: active ? "800" : "600" }}
                            >
                              {profile.nickname}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  <View style={{ height: scaleW(4) }} />
                </View>
              }
              ListEmptyComponent={
                <View style={{ alignItems: "center", paddingHorizontal: scaleW(40), marginTop: scaleW(48) }}>
                  <View
                    style={[
                      styles.emptyIcon,
                      { width: scaleW(88), height: scaleW(88), borderRadius: scaleW(44) },
                    ]}
                  >
                    <MaterialIcons name="explore" size={scaleW(44)} color={SCAVENGER_GOLD} />
                  </View>
                  <ThemedText
                    lightColor="#fff"
                    darkColor="#fff"
                    style={{ marginTop: scaleW(18), fontSize: scaleW(18), fontWeight: "800", textAlign: "center" }}
                  >
                    No hunts just yet
                  </ThemedText>
                  <ThemedText
                    lightColor={SCAVENGER_TEXT_DIM}
                    darkColor={SCAVENGER_TEXT_DIM}
                    style={{ marginTop: scaleW(6), textAlign: "center", fontSize: scaleW(14), lineHeight: scaleW(20) }}
                  >
                    New adventures are on their way — check back soon!
                  </ThemedText>
                </View>
              }
              renderItem={({ item, index }) => {
                if (item.kind === "header") {
                  return (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: scaleW(8),
                        marginTop: scaleW(14),
                        marginBottom: scaleW(2),
                        paddingHorizontal: scaleW(20),
                      }}
                    >
                      <View
                        style={[
                          styles.sectionIcon,
                          { width: scaleW(26), height: scaleW(26), borderRadius: scaleW(8) },
                        ]}
                      >
                        <MaterialIcons name={item.icon} size={scaleW(16)} color={SCAVENGER_GOLD} />
                      </View>
                      <ThemedText
                        lightColor="#fff"
                        darkColor="#fff"
                        style={{ fontSize: scaleW(13), fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 }}
                      >
                        {item.title}
                      </ThemedText>
                    </View>
                  );
                }
                if (item.kind === "group") {
                  const group = item.group;
                  return (
                    <Animated.View
                      entering={FadeInDown.duration(320).delay(Math.min(index, 6) * 40)}
                      style={{ paddingHorizontal: scaleW(20) }}
                    >
                      <Pressable
                        onPress={() => router.push(`/(tabs)/activity/scavenger/group/${group.id}`)}
                        style={({ pressed }) => [
                          styles.groupCard,
                          { borderRadius: scaleW(22), transform: [{ scale: pressed ? 0.985 : 1 }] },
                        ]}
                      >
                        <View style={{ height: scaleW(150) }}>
                          {group.cover_image_url ? (
                            <ScavengerImage
                              uri={group.cover_image_url}
                              tint="#fff"
                              style={{ width: "100%", height: "100%" }}
                            />
                          ) : (
                            <LinearGradient
                              colors={SCAVENGER_CARD_GRADIENT}
                              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                            >
                              <MaterialIcons name="collections" size={scaleW(40)} color="rgba(255,255,255,0.7)" />
                            </LinearGradient>
                          )}
                          <LinearGradient
                            colors={SCAVENGER_IMAGE_SCRIM}
                            style={StyleSheet.absoluteFill}
                          />
                          <View
                            style={[
                              styles.collectionTag,
                              {
                                top: scaleW(12),
                                left: scaleW(12),
                                paddingHorizontal: scaleW(10),
                                paddingVertical: scaleW(5),
                                borderRadius: scaleW(999),
                              },
                            ]}
                          >
                            <MaterialIcons name="auto-awesome" size={scaleW(12)} color={SCAVENGER_BG_DEEP} />
                            <ThemedText style={{ fontSize: scaleW(11), fontWeight: "800", color: SCAVENGER_BG_DEEP }}>
                              Collection
                            </ThemedText>
                          </View>
                          <View style={{ position: "absolute", left: scaleW(16), right: scaleW(16), bottom: scaleW(14) }}>
                            <ThemedText
                              lightColor="#fff"
                              darkColor="#fff"
                              numberOfLines={1}
                              style={{ fontSize: scaleW(20), fontWeight: "800" }}
                            >
                              {group.name}
                            </ThemedText>
                            {!!group.description && (
                              <ThemedText
                                lightColor="rgba(255,255,255,0.82)"
                                darkColor="rgba(255,255,255,0.82)"
                                numberOfLines={1}
                                style={{ marginTop: scaleW(2), fontSize: scaleW(13) }}
                              >
                                {group.description}
                              </ThemedText>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                }
                const quest = item.quest;
                const status = statusFor(quest.id);
                return (
                  <Animated.View
                    entering={FadeInDown.duration(320).delay(Math.min(index, 6) * 40)}
                    style={{ paddingHorizontal: scaleW(20) }}
                  >
                    <Pressable
                      onPress={() =>
                        router.push(`/(tabs)/activity/scavenger/quest/${quest.id}?profileId=${profileId}`)
                      }
                      style={({ pressed }) => [
                        styles.questCard,
                        {
                          borderRadius: scaleW(18),
                          padding: scaleW(10),
                          transform: [{ scale: pressed ? 0.985 : 1 }],
                        },
                      ]}
                    >
                      <View style={{ borderRadius: scaleW(14), overflow: "hidden" }}>
                        {quest.tile_image_url || quest.cover_image_url ? (
                          <ScavengerImage
                            uri={quest.tile_image_url || quest.cover_image_url}
                            tint="#fff"
                            style={{ width: scaleW(84), height: scaleW(84) }}
                          />
                        ) : (
                          <LinearGradient
                            colors={SCAVENGER_CTA_GRADIENT}
                            style={{ width: scaleW(84), height: scaleW(84), alignItems: "center", justifyContent: "center" }}
                          >
                            <MaterialIcons name="travel-explore" size={scaleW(30)} color="#fff" />
                          </LinearGradient>
                        )}
                      </View>
                      <View style={{ flex: 1, paddingHorizontal: scaleW(12), justifyContent: "center" }}>
                        <ThemedText
                          lightColor="#fff"
                          darkColor="#fff"
                          numberOfLines={2}
                          style={{ fontSize: scaleW(16), fontWeight: "800", lineHeight: scaleW(20) }}
                        >
                          {quest.name}
                        </ThemedText>
                        {!!quest.attraction_name && (
                          <ThemedText
                            lightColor={SCAVENGER_TEXT_FAINT}
                            darkColor={SCAVENGER_TEXT_FAINT}
                            numberOfLines={1}
                            style={{ marginTop: scaleW(2), fontSize: scaleW(12) }}
                          >
                            {quest.attraction_name}
                          </ThemedText>
                        )}
                        {(item.distanceKm != null || status) && (
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: scaleW(6), marginTop: scaleW(8) }}>
                            {item.distanceKm != null && (
                              <StatusPill
                                label={formatDistanceKm(item.distanceKm)}
                                icon="place"
                                tone="progress"
                                scaleW={scaleW}
                              />
                            )}
                            {status && (
                              <StatusPill
                                label={status.label}
                                icon={status.icon}
                                tone={status.tone}
                                scaleW={scaleW}
                              />
                            )}
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
              }}
            />
          )}
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SCAVENGER_BG_DEEP },
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { overflow: "hidden" },
  iconChip: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: SCAVENGER_HAIRLINE,
  },
  chipActive: {
    backgroundColor: SCAVENGER_GREEN,
    borderColor: SCAVENGER_ACCENT,
  },
  sectionIcon: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,197,80,0.14)",
  },
  groupCard: {
    backgroundColor: SCAVENGER_CARD_GRADIENT[0],
    overflow: "hidden",
    ...scavengerShadow,
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
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  collectionTag: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: SCAVENGER_GOLD,
  },
  emptyIcon: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,197,80,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,197,80,0.25)",
  },
});
