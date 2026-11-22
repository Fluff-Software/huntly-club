/**
 * Packs to open: banked, unopened Explore packs across the household,
 * grouped by explorer. Shows pack art, not card art, since the card inside
 * isn't drawn until the pack is actually opened.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { ExploreCardPackReveal } from "@/components/explore/ExploreCardPackReveal";
import { FKButton, FKCard, FKLoading, FKPageHeader } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { explorePackArt } from "@/constants/exploreBinder";
import { usePlayer } from "@/contexts/PlayerContext";
import { useBankedPacksByProfile } from "@/hooks/useBankedPacksByProfile";
import { openExplorePack, exploreUserMessage, ExploreStopsRequestError } from "@/services/exploreStopsService";
import type { ExploreAward, ExplorePackRecord } from "@/types/exploreStops";

const H_PAD = 20;
const GRID_GAP = 12;
const COLUMNS = 2;

/** Native pixel size of explore-pack-full.png (see ExploreCardPackReveal.tsx). */
const PACK_ASPECT = 501 / 1024;

type PackGroup = {
  key: string;
  source: ExplorePackRecord["source"];
  eventSlug: string | null;
  packs: ExplorePackRecord[];
};

/** Collapses same-source, same-event packs into one tile with a duplicate count. */
function groupPacks(packs: ExplorePackRecord[]): PackGroup[] {
  const groups = new Map<string, PackGroup>();
  for (const pack of packs) {
    const eventSlug = pack.eventSlug ?? null;
    const key = `${pack.source}:${eventSlug ?? ""}`;
    const group = groups.get(key);
    if (group) {
      group.packs.push(pack);
    } else {
      groups.set(key, { key, source: pack.source, eventSlug, packs: [pack] });
    }
  }
  return Array.from(groups.values());
}

/** Short caption under a pack tile. */
function packCaption(group: PackGroup): string {
  if (group.eventSlug) {
    const name = group.eventSlug.replace(/[-_]+/g, " ");
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} pack`;
  }
  return group.source === "trade" ? "Swap pack" : "Explore pack";
}

function explorerName(p: { name: string; nickname?: string | null }): string {
  return (p.nickname || p.name || "").trim() || "Explorer";
}

export default function ExplorePacksScreen() {
  const router = useRouter();
  const { profileId: profileIdParam } = useLocalSearchParams<{ profileId?: string }>();
  const { profiles, loading: profilesLoading } = usePlayer();
  const { bankedPacksByProfile, refresh } = useBankedPacksByProfile();

  /**
   * Ready once every explorer's packs have arrived, so the screen never flashes
   * "nothing to open" before the first fetch lands. The hook swallows errors,
   * so a timer stops the loading state hanging if a fetch fails.
   */
  const packsArrived =
    !profilesLoading &&
    (profiles.length === 0 || profiles.every((p) => bankedPacksByProfile.has(p.id)));
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);
  const ready = packsArrived || timedOut;

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.navigate("/(tabs)/me");
  }

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
      throw new Error("That pack timed out. Try again from your packs.");
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

  const first = sections[0];
  const totalPacks = sections.reduce((n, sec) => n + sec.packs.length, 0);
  const primaryLabel = !first
    ? ""
    : sections.length > 1
      ? `Open ${explorerName(first.profile)}’s packs`
      : first.packs.length === 1
        ? "Open the pack"
        : "Open the packs";

  return (
    <>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        {!ready ? (
          <>
            <View style={styles.headerPad}>
              <FKPageHeader title="Packs to open" onBack={goBack} />
            </View>
            <View style={{ flex: 1 }}>
              <FKLoading />
            </View>
          </>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <FKPageHeader title="Packs to open" onBack={goBack} />
            {sections.length === 0 ? (
              <FKCard>
                <Text style={TYPE.heading}>Nothing to open right now</Text>
                <Text style={[TYPE.bodySmall, styles.emptyBody]}>
                  Packs turn up at Explore stops on the map. Any you save for later will wait here.
                </Text>
              </FKCard>
            ) : (
              <>
                <Text style={styles.intro}>
                  {totalPacks === 1
                    ? "There’s one pack waiting. Tap it to open."
                    : `There are ${totalPacks} packs waiting. Tap one to open.`}
                </Text>
                {sections.map(({ profile, packs }) => (
                  <View key={profile.id} style={styles.section}>
                    {sections.length > 1 || profiles.length > 1 ? (
                      <Text style={styles.sectionTitle} accessibilityRole="header">
                        {explorerName(profile)}’s packs
                      </Text>
                    ) : null}
                    <View style={styles.grid}>
                      {groupPacks(packs).map((group) => (
                        <Pressable
                          key={group.key}
                          onPress={() => openTile(packs, group.packs)}
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${group.packs.length} ${packCaption(group).toLowerCase()}${
                            group.packs.length === 1 ? "" : "s"
                          }`}
                          style={styles.tileCard}
                        >
                          <View style={styles.tile}>
                            <Image
                              source={explorePackArt(group.source, group.eventSlug)}
                              style={styles.tileImage}
                              resizeMode="contain"
                            />
                            {group.packs.length > 1 ? (
                              <View style={styles.countBadge}>
                                <Text style={styles.countBadgeText}>×{group.packs.length}</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.tileCaption} numberOfLines={1}>
                            {packCaption(group)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        )}
        {ready && first ? (
          <View style={styles.footer}>
            <FKButton
              label={primaryLabel}
              onPress={() => openTile(first.packs, first.packs)}
            />
          </View>
        ) : null}
      </SafeAreaView>

      {packQueue && packQueue[packQueueIndex] ? (
        <ExploreCardPackReveal
          key={packQueue[packQueueIndex]!.id}
          visible
          packSource={explorePackArt(
            packQueue[packQueueIndex]!.source,
            packQueue[packQueueIndex]!.eventSlug
          )}
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
  safe: { flex: 1, backgroundColor: FK.moss },
  headerPad: { paddingHorizontal: H_PAD, paddingTop: 12 },
  content: { paddingHorizontal: H_PAD, paddingTop: 12, paddingBottom: 24 },
  intro: { ...TYPE.body, color: FK.muted, marginTop: -6, marginBottom: 18 },
  emptyBody: { marginTop: 6 },
  section: { marginBottom: 24 },
  sectionTitle: { ...TYPE.heading, marginBottom: 12 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  tileCard: {
    width: `${100 / COLUMNS - 3}%`,
    borderRadius: RADIUS.lg,
    padding: 14,
    backgroundColor: FK.paper,
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
  tileCaption: {
    fontFamily: FONT.displayBold,
    fontSize: 16,
    color: FK.ink,
    textAlign: "center",
    marginTop: 10,
  },
  countBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 34,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FK.ink,
  },
  countBadgeText: {
    fontFamily: FONT.display,
    fontSize: 15,
    color: FK.white,
  },
  footer: { paddingHorizontal: H_PAD, paddingTop: 8, paddingBottom: 16 },
});
