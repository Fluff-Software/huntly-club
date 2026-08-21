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
  useWindowDimensions,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { BinderPageSheet } from "@/components/explore/BinderPageSheet";
import { ExploreCardPackReveal } from "@/components/explore/ExploreCardPackReveal";
import { EXPLORE_BINDER_SCREEN_BG } from "@/constants/exploreBinder";
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

export default function ExplorePacksScreen() {
  const router = useRouter();
  const { width: windowW } = useWindowDimensions();
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

  const tileWidth = (windowW - H_PAD * 2 - 8 * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS;
  const tileHeight = tileWidth / PACK_ASPECT;

  function openTile(profilePacks: ExplorePackRecord[], tapped: ExplorePackRecord) {
    const rest = profilePacks.filter((p) => p.id !== tapped.id);
    setPackQueueIndex(0);
    setPackQueue([tapped, ...rest]);
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
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
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
            <BinderPageSheet style={styles.sheet}>
              {sections.map(({ profile, packs }) => (
                <View key={profile.id} style={styles.section}>
                  <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.sectionTitle}>
                    {(profile.nickname || profile.name || "Player") + "’s packs"}
                  </ThemedText>
                  <View style={styles.grid}>
                    {packs.map((pack) => (
                      <Pressable
                        key={pack.id}
                        onPress={() => openTile(packs, pack)}
                        accessibilityRole="button"
                        accessibilityLabel={`Open pack from ${
                          pack.source === "trade" ? "a trade" : "a stop"
                        }`}
                        style={[styles.tile, { width: tileWidth, height: tileHeight }]}
                      >
                        <Image
                          source={PACK_ART_BY_SOURCE[pack.source]}
                          style={styles.tileImage}
                          resizeMode="contain"
                        />
                        {pack.source === "trade" ? (
                          <View style={styles.sourceTag}>
                            <ThemedText
                              lightColor="#132414"
                              darkColor="#132414"
                              style={styles.sourceTagText}
                            >
                              Traded
                            </ThemedText>
                          </View>
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </BinderPageSheet>
          </ScrollView>
        )}

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
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: EXPLORE_BINDER_SCREEN_BG },
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
  sheet: {
    width: "100%",
    borderRadius: 12,
    overflow: "visible",
  },
  section: {
    paddingTop: 16,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  tile: {
    alignItems: "center",
    justifyContent: "center",
  },
  tileImage: {
    width: "100%",
    height: "100%",
  },
  sourceTag: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#B8F000",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sourceTagText: {
    fontSize: 11,
    fontWeight: "800",
  },
});
