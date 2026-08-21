/**
 * Pack Inventory — banked, unopened Explore packs across the household,
 * grouped by profile. Shows pack art, not card art, since the card inside
 * isn't drawn until the pack is actually opened.
 */
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ExploreCardPackReveal } from "@/components/explore/ExploreCardPackReveal";
import { usePlayer } from "@/contexts/PlayerContext";
import { useBankedPacksByProfile } from "@/hooks/useBankedPacksByProfile";
import { openExplorePack, exploreUserMessage, ExploreStopsRequestError } from "@/services/exploreStopsService";
import type { ExploreAward, ExplorePackRecord } from "@/types/exploreStops";

const H_PAD = 12;
const GRID_GAP = 10;
const COLUMNS = 2;

/** Native pixel size of explore-pack-full.png (see ExploreCardPackReveal.tsx). */
const PACK_ASPECT = 501 / 1024;

const PACK_ART_BY_SOURCE: Record<ExplorePackRecord["source"], number> = {
  stop_claim: require("@/assets/images/explore-pack-full.png"),
  trade: require("@/assets/images/explore-pack-trade.png"),
};

/** Collapses same-source packs into one tile with a duplicate count. */
function groupBySource(
  packs: ExplorePackRecord[]
): { source: ExplorePackRecord["source"]; packs: ExplorePackRecord[] }[] {
  const bySource = new Map<ExplorePackRecord["source"], ExplorePackRecord[]>();
  for (const pack of packs) {
    const list = bySource.get(pack.source) ?? [];
    list.push(pack);
    bySource.set(pack.source, list);
  }
  return Array.from(bySource.entries()).map(([source, sourcePacks]) => ({
    source,
    packs: sourcePacks,
  }));
}

export default function ExplorePacksScreen() {
  const router = useRouter();
  const { profileId: profileIdParam } = useLocalSearchParams<{ profileId?: string }>();
  const { profiles, loading: profilesLoading } = usePlayer();
  const { bankedPacksByProfile, refresh } = useBankedPacksByProfile();

  const primaryProfileId = useMemo(() => {
    const parsed = typeof profileIdParam === "string" ? Number(profileIdParam) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }, [profileIdParam]);

  /** Primary profile's section first (if it has packs), then everyone else who does. */
  const sections = useMemo(() => {
    const withPacks = profiles
      .map((p) => ({ profile: p, packs: bankedPacksByProfile.get(p.id) ?? [] }))
      .filter((entry) => entry.packs.length > 0);
    if (primaryProfileId == null) return withPacks;
    const primaryIndex = withPacks.findIndex((e) => e.profile.id === primaryProfileId);
    if (primaryIndex <= 0) return withPacks;
    const [primary] = withPacks.splice(primaryIndex, 1);
    return primary ? [primary, ...withPacks] : withPacks;
  }, [profiles, bankedPacksByProfile, primaryProfileId]);

  const [packQueue, setPackQueue] = useState<ExplorePackRecord[] | null>(null);
  const [packQueueIndex, setPackQueueIndex] = useState(0);

  /** Opens the tapped group's packs first, then the rest of that profile's packs. */
  function openTile(profilePacks: ExplorePackRecord[], group: ExplorePackRecord[]) {
    const groupIds = new Set(group.map((p) => p.id));
    const rest = profilePacks.filter((p) => !groupIds.has(p.id));
    setPackQueueIndex(0);
    setPackQueue([...group, ...rest]);
  }

  function closeQueue() {
    setPackQueue(null);
    setPackQueueIndex(0);
    void refresh();
  }

  async function commitPackFromQueue(): Promise<ExploreAward> {
    const pack = packQueue?.[packQueueIndex];
    if (!pack) {
      throw new Error("Pack queue expired. Try again from your inventory.");
    }
    try {
      const result = await openExplorePack(pack.id);
      if (result.success) return result.award;
      throw new Error(
        exploreUserMessage(result.error, "Couldn’t open this pack. Please try again.")
      );
    } catch (err: unknown) {
      if (err instanceof ExploreStopsRequestError) {
        throw new Error(exploreUserMessage(err.exploreError.code, err.exploreError.message));
      }
      throw err instanceof Error ? err : new Error("Couldn’t open this pack. Please try again.");
    }
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={["#1B2E22", "#0C1710"]} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.iconBtn}
            >
              <MaterialIcons name="arrow-back" size={22} color="#FFF" />
            </Pressable>
            <ThemedText type="heading" lightColor="#FFF" darkColor="#FFF" style={styles.title}>
              Packs Waiting
            </ThemedText>
          </View>

          {profilesLoading && sections.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color="#FFF" />
            </View>
          ) : sections.length === 0 ? (
            <ThemedText
              lightColor="rgba(255,255,255,0.7)"
              darkColor="rgba(255,255,255,0.7)"
              style={{ textAlign: "center", marginTop: 24 }}
            >
              No packs waiting right now.
            </ThemedText>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: H_PAD, paddingBottom: 28 }}
              showsVerticalScrollIndicator={false}
            >
              {sections.map(({ profile, packs }) => (
                <View key={profile.id} style={styles.section}>
                  <View style={styles.sectionLabel}>
                    <MaterialIcons name="inventory-2" size={16} color="#B8F000" />
                    <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.sectionTitle}>
                      {(profile.nickname || profile.name || "Player") + "’s packs"}
                    </ThemedText>
                  </View>
                  <View style={styles.grid}>
                    {groupBySource(packs).map((group) => (
                      <Pressable
                        key={group.source}
                        onPress={() => openTile(packs, group.packs)}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${group.packs.length} pack${
                          group.packs.length === 1 ? "" : "s"
                        } from ${group.source === "trade" ? "trades" : "stops"}`}
                        style={styles.tileCard}
                      >
                        <View style={styles.tile}>
                          <Image
                            source={PACK_ART_BY_SOURCE[group.source]}
                            style={styles.tileImage}
                            resizeMode="contain"
                          />
                          {group.packs.length > 1 ? (
                            <View style={styles.countBadge}>
                              <ThemedText
                                lightColor="#132414"
                                darkColor="#132414"
                                style={styles.countBadgeText}
                              >
                                {group.packs.length}
                              </ThemedText>
                            </View>
                          ) : null}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </LinearGradient>

      {packQueue && packQueue[packQueueIndex] ? (
        <ExploreCardPackReveal
          key={packQueue[packQueueIndex]!.id}
          visible
          onRipComplete={commitPackFromQueue}
          onClose={closeQueue}
          queueRemaining={packQueue.length - packQueueIndex - 1}
          onOpenNext={() => setPackQueueIndex((i) => i + 1)}
          onViewBinder={(award) => {
            closeQueue();
            router.push({
              pathname: "/(tabs)/activity/explore-collection",
              params: { highlightCardId: award.card.id },
            });
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  title: { fontSize: 22, lineHeight: 26 },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(20,24,20,0.92)",
    borderWidth: 1,
    borderColor: "rgba(184,240,0,0.35)",
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  tileCard: {
    width: `${100 / COLUMNS - 3}%`,
    borderRadius: 18,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tile: {
    aspectRatio: PACK_ASPECT,
    alignItems: "center",
    justifyContent: "center",
  },
  tileImage: {
    width: "100%",
    height: "100%",
  },
  countBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B8F000",
    borderWidth: 2,
    borderColor: "#0C1710",
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
