/**
 * Explore Card Binder — single scrolling grid of sleeve pockets.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { BinderCardPocket, fitBinderCardSize } from "@/components/explore/BinderCardPocket";
import {
  BinderInteractionProvider,
  useBinderInteraction,
} from "@/components/explore/BinderInteractionContext";
import { BinderFiltersModal } from "@/components/explore/BinderFiltersModal";
import { BinderPageSheet } from "@/components/explore/BinderPageSheet";
import { ExploreCardDetail } from "@/components/explore/ExploreCardDetail";
import { ExploreCardPackReveal } from "@/components/explore/ExploreCardPackReveal";
import {
  EXPLORE_BINDER_SCREEN_BG,
  EXPLORE_CARD_ART_ASPECT,
  EXPLORE_PACK_ART_BY_SOURCE,
} from "@/constants/exploreBinder";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useBankedPacksByProfile } from "@/hooks/useBankedPacksByProfile";
import {
  ExploreStopsRequestError,
  exploreUserMessage,
  getExploreCardCollection,
  openExplorePack,
  tradeExploreCards,
} from "@/services/exploreStopsService";
import { newIdempotencyKey } from "@/utils/idempotency";
import type { ExploreAward } from "@/types/exploreStops";
import {
  binderFiltersAreActive,
  completionPercent,
  filterBinderCardsFull,
  totalCopyCount,
  uniqueCollectedCount,
  type BinderCardEntry,
  type BinderCategoryFilter,
  type BinderSortOption,
  type BinderStatusFilter,
} from "@/utils/exploreBinder";

const H_PAD = 12;
const GRID_GAP = 4;
const INNER_PAD = 8;
const COLUMNS = 3;

const DEFAULT_CATEGORY: BinderCategoryFilter = "all";
const DEFAULT_STATUS: BinderStatusFilter = "all";
const DEFAULT_SORT: BinderSortOption = "default";

/** Groups filtered cards into fixed-size rows for the virtualized grid. */
function groupIntoRows(cards: BinderCardEntry[], columns: number): BinderCardEntry[][] {
  const rows: BinderCardEntry[][] = [];
  for (let i = 0; i < cards.length; i += columns) {
    rows.push(cards.slice(i, i + columns));
  }
  return rows;
}

type BinderGridRowProps = {
  row: BinderCardEntry[];
  columns: number;
  cardW: number;
  cardH: number;
  onOpenCard: (card: BinderCardEntry) => void;
};

function BinderGridRow({ row, columns, cardW, cardH, onOpenCard }: BinderGridRowProps) {
  const { pulledId, highlightId } = useBinderInteraction();
  const rowPulled = row.some((c) => pulledId === c.id);
  return (
    <View style={[styles.pageRow, { height: cardH }, rowPulled && { zIndex: 20 }]}>
      {row.map((card) => (
        <View
          key={card.id}
          style={[
            styles.cell,
            { width: cardW, height: cardH },
            pulledId === card.id && { zIndex: 20 },
          ]}
        >
          <BinderCardPocket
            card={card}
            width={cardW}
            height={cardH}
            highlighted={highlightId === card.id}
            isPulled={pulledId === card.id}
            onPress={() => onOpenCard(card)}
          />
        </View>
      ))}
      {row.length < columns
        ? Array.from({ length: columns - row.length }).map((_, i) => (
            <View key={`pad-${i}`} style={[styles.cell, { width: cardW, height: cardH }]} />
          ))
        : null}
    </View>
  );
}

export default function ExploreCollectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowW } = useWindowDimensions();
  const { profileId: profileIdParam, highlightCardId, mode } = useLocalSearchParams<{
    profileId?: string;
    highlightCardId?: string;
    mode?: string;
  }>();
  const { session } = useAuth();
  const { profiles, loading: profilesLoading } = usePlayer();
  const showProfilePicker = profiles.length > 1;

  const paramProfileId = useMemo(() => {
    const parsed = typeof profileIdParam === "string" ? Number(profileIdParam) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }, [profileIdParam]);

  /**
   * Which collection to show. `null` means every player in the household —
   * the default when no particular player was asked for, so the binder can't
   * read empty just because a sibling collected the cards.
   */
  const defaultProfileId = useMemo((): number | null => {
    if (mode === "all") return null;
    if (paramProfileId != null && profiles.some((p) => p.id === paramProfileId)) {
      return paramProfileId;
    }
    if (profiles.length === 1) return profiles[0]!.id;
    return null;
  }, [mode, paramProfileId, profiles]);

  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const profileChosenByUserRef = useRef(false);
  const viewingAllProfiles = selectedProfileId == null;
  const [category, setCategory] = useState<BinderCategoryFilter>(DEFAULT_CATEGORY);
  const [status, setStatus] = useState<BinderStatusFilter>(DEFAULT_STATUS);
  const [sort, setSort] = useState<BinderSortOption>(DEFAULT_SORT);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cards, setCards] = useState<BinderCardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BinderCardEntry | null>(null);
  const [pulledId, setPulledId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(
    typeof highlightCardId === "string" ? highlightCardId : null
  );
  const [tradeSession, setTradeSession] = useState<
    { card: BinderCardEntry; profileId: number; packId: string } | null
  >(null);
  const { bankedPacksByProfile, refresh: refreshBankedPacks } = useBankedPacksByProfile();
  /** Per-card copies owned by each individual profile, so trading can work
   * from "All players" view without making the user switch profiles first. */
  const perCardOwnersRef = useRef<
    Map<string, { profileId: number; name: string; count: number }[]>
  >(new Map());

  const listRef = useRef<FlatList<BinderCardEntry[]>>(null);

  const pageWidth = Math.max(0, windowW - H_PAD * 2);
  const gridWidth = Math.max(0, pageWidth - INNER_PAD * 2);
  const cellW = gridWidth > 0 ? (gridWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS : 0;
  const cardSize = fitBinderCardSize(cellW, cellW / EXPLORE_CARD_ART_ASPECT);
  const rowStride = cardSize.h + GRID_GAP;

  const resetFilters = useCallback(() => {
    setCategory(DEFAULT_CATEGORY);
    setStatus(DEFAULT_STATUS);
    setSort(DEFAULT_SORT);
    profileChosenByUserRef.current = false;
    setSelectedProfileId(defaultProfileId);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [defaultProfileId]);

  // Follow the requested / default player until the user picks one themselves,
  // and fall back if the chosen profile is no longer in the household.
  useEffect(() => {
    const chosenStillExists =
      selectedProfileId != null && profiles.some((p) => p.id === selectedProfileId);
    if (profileChosenByUserRef.current && (selectedProfileId == null || chosenStillExists)) {
      return;
    }
    profileChosenByUserRef.current = false;
    setSelectedProfileId(defaultProfileId);
  }, [profiles, defaultProfileId, selectedProfileId]);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!session) {
        setError("Sign in to open the Card Binder.");
        setCards([]);
        setLoading(false);
        return;
      }

      if (profiles.length === 0) {
        // Profiles are still arriving — keep the spinner rather than flashing
        // an error the user can't act on.
        if (profilesLoading) {
          setError(null);
          setLoading(true);
          return;
        }
        setError("Create a player profile to view cards.");
        setCards([]);
        setLoading(false);
        return;
      }

      if (!opts?.soft) setLoading(true);
      setError(null);
      try {
        if (viewingAllProfiles) {
          const results = await Promise.all(
            profiles.map((p) => getExploreCardCollection(p.id))
          );

          const mergedByCardId = new Map<string, BinderCardEntry>();
          const perCardOwners = new Map<
            string,
            { profileId: number; name: string; count: number }[]
          >();
          results.forEach((result, index) => {
            const profile = profiles[index]!;
            const collectorName = (profile.nickname || profile.name || "").trim();

            for (const item of result.items) {
              const id = item.card.id;
              const existing = mergedByCardId.get(id);
              const ownsCard = item.collected || item.count > 0;
              if (item.count > 0) {
                const owners = perCardOwners.get(id) ?? [];
                owners.push({ profileId: profile.id, name: collectorName, count: item.count });
                perCardOwners.set(id, owners);
              }
              const collectedBy =
                ownsCard && collectorName
                  ? [...(existing?.collectedBy ?? []), collectorName]
                  : existing?.collectedBy;

              const base: BinderCardEntry = {
                id,
                slug: item.card.slug,
                name: item.card.name,
                description: item.card.description,
                category: item.card.category,
                rarity: item.card.rarity,
                imageUrl: item.card.imageUrl,
                sortOrder: item.card.sortOrder ?? 0,
                habitatWeights: item.card.habitatWeights ?? {},
                count: item.count,
                collected: item.collected,
                firstCollectedAt: item.firstCollectedAt,
                lastCollectedAt: item.lastCollectedAt,
                collectedBy,
              };

              if (!existing) {
                mergedByCardId.set(id, base);
                continue;
              }

              const first =
                existing.firstCollectedAt == null ||
                (item.firstCollectedAt != null &&
                  new Date(item.firstCollectedAt).getTime() <
                    new Date(existing.firstCollectedAt).getTime())
                  ? item.firstCollectedAt
                  : existing.firstCollectedAt;

              const last =
                existing.lastCollectedAt == null ||
                (item.lastCollectedAt != null &&
                  new Date(item.lastCollectedAt).getTime() >
                    new Date(existing.lastCollectedAt).getTime())
                  ? item.lastCollectedAt
                  : existing.lastCollectedAt;

              mergedByCardId.set(id, {
                ...existing,
                count: existing.count + item.count,
                collected: existing.collected || item.collected || item.count > 0,
                firstCollectedAt: first,
                lastCollectedAt: last,
                collectedBy,
              });
            }
          });

          perCardOwnersRef.current = perCardOwners;
          setCards(Array.from(mergedByCardId.values()));
        } else {
          const result = await getExploreCardCollection(selectedProfileId!);
          const profile = profiles.find((p) => p.id === selectedProfileId);
          const collectorName = (profile?.nickname || profile?.name || "").trim();
          const perCardOwners = new Map<
            string,
            { profileId: number; name: string; count: number }[]
          >();
          for (const item of result.items) {
            if (item.count > 0) {
              perCardOwners.set(item.card.id, [
                { profileId: selectedProfileId!, name: collectorName, count: item.count },
              ]);
            }
          }
          perCardOwnersRef.current = perCardOwners;
          setCards(
            result.items.map((item) => ({
              id: item.card.id,
              slug: item.card.slug,
              name: item.card.name,
              description: item.card.description,
              category: item.card.category,
              rarity: item.card.rarity,
              imageUrl: item.card.imageUrl,
              sortOrder: item.card.sortOrder ?? 0,
              habitatWeights: item.card.habitatWeights ?? {},
              count: item.count,
              collected: item.collected,
              firstCollectedAt: item.firstCollectedAt,
              lastCollectedAt: item.lastCollectedAt,
            }))
          );
        }
      } catch (err: unknown) {
        if (err instanceof ExploreStopsRequestError) {
          setError(
            exploreUserMessage(err.exploreError.code, err.exploreError.message)
          );
        } else {
          setError("Couldn’t load your binder. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [session, viewingAllProfiles, profiles, profilesLoading, selectedProfileId]
  );

  const loadRef = useRef(load);
  loadRef.current = load;
  const refreshBankedPacksRef = useRef(refreshBankedPacks);
  refreshBankedPacksRef.current = refreshBankedPacks;

  /** Total banked packs relevant to the current view, for the badge count. */
  const bankedPackCount = useMemo(() => {
    if (!viewingAllProfiles) {
      return (bankedPacksByProfile.get(selectedProfileId ?? -1) ?? []).length;
    }
    let total = 0;
    for (const packs of bankedPacksByProfile.values()) total += packs.length;
    return total;
  }, [viewingAllProfiles, selectedProfileId, bankedPacksByProfile]);

  const defaultProfileIdRef = useRef(defaultProfileId);
  defaultProfileIdRef.current = defaultProfileId;
  const playerFilterKeyRef = useRef<string | null>(null);

  // Refresh when landing on the binder (backpack / View in binder). Stable deps so
  // closing the card modal or load() identity changes do not re-fetch.
  useFocusEffect(
    useCallback(() => {
      playerFilterKeyRef.current = null;
      void loadRef.current();
      void refreshBankedPacksRef.current();
      return () => {
        setFiltersOpen(false);
        setCategory(DEFAULT_CATEGORY);
        setStatus(DEFAULT_STATUS);
        setSort(DEFAULT_SORT);
        profileChosenByUserRef.current = false;
        setSelectedProfileId(defaultProfileIdRef.current);
        setSelected(null);
        setPulledId(null);
        playerFilterKeyRef.current = null;
      };
    }, [])
  );

  // Soft-reload when the player filter changes while staying on the page,
  // or when household profiles finish loading after landing.
  useEffect(() => {
    const key = `${viewingAllProfiles ? "all" : String(selectedProfileId ?? "none")}:${profiles
      .map((p) => p.id)
      .join(",")}`;
    if (playerFilterKeyRef.current == null) {
      playerFilterKeyRef.current = key;
      return;
    }
    if (playerFilterKeyRef.current === key) return;
    playerFilterKeyRef.current = key;
    void loadRef.current({ soft: true });
  }, [selectedProfileId, viewingAllProfiles, profiles]);

  useEffect(() => {
    if (loading || cards.length === 0) return;
    const urls = [
      ...new Set(
        cards
          .map((c) => c.imageUrl)
          .filter((u): u is string => typeof u === "string" && u.startsWith("http"))
      ),
    ];
    urls.forEach((uri) => {
      void Image.prefetch(uri).catch(() => undefined);
    });
  }, [cards, loading]);

  const filtered = useMemo(
    () => filterBinderCardsFull(cards, category, status, sort),
    [cards, category, status, sort]
  );

  const rows = useMemo(() => groupIntoRows(filtered, COLUMNS), [filtered]);

  const filtersActive = binderFiltersAreActive(category, status, sort);
  const profileChangedFromDefault =
    showProfilePicker && selectedProfileId !== defaultProfileId;
  const showFilterBadge = filtersActive || profileChangedFromDefault;

  const overallUnique = uniqueCollectedCount(cards);
  const overallTotal = cards.length;
  const overallCopies = totalCopyCount(cards);
  const overallPct = completionPercent(overallUnique, overallTotal);

  /** Whose binder is on screen — only when a specific player is selected. */
  const scopeLabel = useMemo(() => {
    if (profiles.length <= 1 || selectedProfileId == null) return null;
    const profile = profiles.find((p) => p.id === selectedProfileId);
    if (!profile) return null;
    return profile.nickname || profile.name;
  }, [profiles, selectedProfileId]);

  useEffect(() => {
    if (!highlightId) return;
    setCategory(DEFAULT_CATEGORY);
    setStatus(DEFAULT_STATUS);
    setSort(DEFAULT_SORT);
  }, [highlightId]);

  useEffect(() => {
    if (!highlightId || filtered.length === 0) return;
    const idx = filtered.findIndex((c) => c.id === highlightId);
    if (idx < 0) return;

    const row = Math.floor(idx / COLUMNS);
    const y = 14 + row * rowStride;
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: Math.max(0, y - 8), animated: true });
    });
    const card = filtered[idx];
    if (card) {
      setPulledId(card.id);
      setSelected(card);
    }
    const t = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(t);
  }, [highlightId, filtered, rowStride]);

  function openCard(card: BinderCardEntry) {
    setPulledId(card.id);
    setSelected(card);
  }

  function closeDetail() {
    setSelected(null);
    setPulledId(null);
  }

  /** Which profile(s) actually hold 6+ copies of this card (trading costs 5,
   * requiring 6 so no one ever ends up with 0) — works the same whether
   * viewing a single profile or "All players" merged. */
  function tradeCandidatesFor(card: BinderCardEntry) {
    return (perCardOwnersRef.current.get(card.id) ?? []).filter((o) => o.count >= 6);
  }

  /**
   * Pays the trade cost and banks an unopened pack right away, then opens
   * the reveal ready to rip. Closing the reveal without ripping isn't a
   * separate "save" action -- the pack is already banked, so it just stays
   * that way and shows up in the "packs waiting" banner.
   */
  async function startTrade(card: BinderCardEntry, profileId: number) {
    // Close first so the popup never shows a now-stale count while the
    // trade is in flight.
    closeDetail();
    try {
      const result = await tradeExploreCards({
        profileId,
        cardId: card.id,
        idempotencyKey: newIdempotencyKey(),
        deferReveal: true,
      });
      if (result.success && result.packId) {
        void load({ soft: true });
        setTradeSession({ card, profileId, packId: result.packId });
        return;
      }
      Alert.alert(
        "Couldn’t start trade",
        !result.success
          ? exploreUserMessage(result.error, "Please try again.")
          : "Please try again."
      );
    } catch (err: unknown) {
      const message =
        err instanceof ExploreStopsRequestError
          ? exploreUserMessage(err.exploreError.code, err.exploreError.message)
          : "Please try again.";
      Alert.alert("Couldn’t start trade", message);
    }
  }

  const TRADE_EXPLAINER =
    "Trade 5 copies for a brand-new pack. Guaranteed: you won't get this card back. This can't be undone.";

  function handleTrade(card: BinderCardEntry) {
    const candidates = tradeCandidatesFor(card);
    if (candidates.length === 0) return;

    if (candidates.length === 1) {
      const only = candidates[0]!;
      // In a single-profile view it's obviously "you"; only name the
      // player when viewing the merged "All players" binder.
      const who = viewingAllProfiles ? ` for ${only.name || "this player"}` : "";
      Alert.alert(`Trade 5 ${card.name}${who}?`, TRADE_EXPLAINER, [
        { text: "Cancel", style: "cancel" },
        { text: "Trade", onPress: () => void startTrade(card, only.profileId) },
      ]);
      return;
    }

    // More than one player has 6+ copies — ask which one is trading.
    Alert.alert(
      `Trade 5 ${card.name}?`,
      `${TRADE_EXPLAINER}\n\nWhose copies are trading?`,
      [
        ...candidates.map((c) => ({
          text: c.name || "Player",
          onPress: () => void startTrade(card, c.profileId),
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  }

  const commitTradeClaim = useCallback(async (): Promise<ExploreAward> => {
    if (!tradeSession) {
      throw new Error("Trade session expired. Try again from the binder.");
    }
    try {
      const result = await openExplorePack(tradeSession.packId);
      if (result.success) {
        void load({ soft: true });
        return result.award;
      }
      throw new Error(
        exploreUserMessage(result.error, "Couldn’t open this pack. Please try again.")
      );
    } catch (err: unknown) {
      if (err instanceof ExploreStopsRequestError) {
        throw new Error(exploreUserMessage(err.exploreError.code, err.exploreError.message));
      }
      throw err instanceof Error ? err : new Error("Couldn’t open this pack. Please try again.");
    }
  }, [tradeSession, load]);

  function openPacksInventory() {
    router.push({
      pathname: "/(tabs)/activity/explore-packs",
      params: viewingAllProfiles ? {} : { profileId: String(selectedProfileId) },
    });
  }

  function applyCategory(next: BinderCategoryFilter) {
    setCategory(next);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }

  function applyStatus(next: BinderStatusFilter) {
    setStatus(next);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }

  function applySort(next: BinderSortOption) {
    setSort(next);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.listHeader}>
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.iconBtn}
            >
              <MaterialIcons name="arrow-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <ThemedText type="heading" lightColor="#FFF" darkColor="#FFF" style={styles.title}>
                Card Binder
              </ThemedText>
              <ThemedText
                lightColor="rgba(255,255,255,0.75)"
                darkColor="rgba(255,255,255,0.75)"
                style={styles.subtitle}
              >
                {overallTotal > 0
                  ? [
                      scopeLabel,
                      overallCopies > overallUnique
                        ? `${overallUnique} of ${overallTotal} found · ${overallCopies} cards in total`
                        : `${overallUnique} of ${overallTotal} found`,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : loading
                    ? "Loading…"
                    : "No cards"}
              </ThemedText>
            </View>
            {bankedPackCount > 0 ? (
              <Pressable
                onPress={openPacksInventory}
                accessibilityRole="button"
                accessibilityLabel={`${bankedPackCount} pack${bankedPackCount === 1 ? "" : "s"} waiting — Open`}
                style={styles.iconBtn}
              >
                <MaterialCommunityIcons name="cards" size={20} color="#B8F000" />
                <View style={styles.packCountBadge}>
                  <ThemedText lightColor="#132414" darkColor="#132414" style={styles.packCountText}>
                    {bankedPackCount}
                  </ThemedText>
                </View>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => setFiltersOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Open filters"
              style={styles.iconBtn}
            >
              <MaterialIcons name="tune" size={22} color="#FFF" />
              {showFilterBadge ? <View style={styles.filterDot} /> : null}
            </Pressable>
          </View>

          {overallTotal > 0 ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${overallPct}%` }]} />
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <ThemedText lightColor="#FFD8D8" darkColor="#FFD8D8" style={{ textAlign: "center" }}>
                {error}
              </ThemedText>
              <Pressable onPress={() => void load()} style={[styles.retryBtn, { marginTop: 8 }]}>
                <ThemedText lightColor="#FFF" darkColor="#FFF">
                  Retry
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>

        {loading && cards.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color="#FFF" />
          </View>
        ) : filtered.length === 0 && !loading && !error ? (
          <ThemedText
            lightColor="rgba(255,255,255,0.7)"
            darkColor="rgba(255,255,255,0.7)"
            style={{ textAlign: "center", marginTop: 24 }}
          >
            No cards match these filters.
          </ThemedText>
        ) : (
          <View style={styles.pageWrap}>
            <BinderInteractionProvider pulledId={pulledId} highlightId={highlightId}>
              <BinderPageSheet style={styles.sheet}>
                {cardSize.w > 0 ? (
                  <FlatList
                    ref={listRef}
                    data={rows}
                    keyExtractor={(_, index) => `row-${index}`}
                    renderItem={({ item }) => (
                      <BinderGridRow
                        row={item}
                        columns={COLUMNS}
                        cardW={cardSize.w}
                        cardH={cardSize.h}
                        onOpenCard={openCard}
                      />
                    )}
                    getItemLayout={(_, index) => ({
                      length: rowStride,
                      offset: rowStride * index,
                      index,
                    })}
                    ItemSeparatorComponent={() => <View style={{ height: GRID_GAP }} />}
                    contentContainerStyle={{
                      paddingTop: 2,
                      paddingBottom: 28 + insets.bottom,
                    }}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={8}
                    removeClippedSubviews
                  />
                ) : null}
              </BinderPageSheet>
            </BinderInteractionProvider>
          </View>
        )}

        <BinderFiltersModal
          visible={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          onReset={resetFilters}
          profiles={profiles}
          showProfilePicker={showProfilePicker}
          selectedProfileId={selectedProfileId}
          onSelectProfile={(id) => {
            profileChosenByUserRef.current = true;
            setSelectedProfileId(id);
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
          }}
          category={category}
          onSelectCategory={applyCategory}
          status={status}
          onSelectStatus={applyStatus}
          sort={sort}
          onSelectSort={applySort}
        />

        <ExploreCardDetail
          card={selected}
          onClose={closeDetail}
          onTrade={
            selected && tradeCandidatesFor(selected).length > 0 ? handleTrade : undefined
          }
          tradeLabel={
            selected
              ? (() => {
                  const candidates = tradeCandidatesFor(selected);
                  if (candidates.length === 0) return undefined;
                  if (!viewingAllProfiles) {
                    return "You can trade 5 copies of this card for a new pack";
                  }
                  if (candidates.length === 1) {
                    return `${candidates[0]!.name || "This player"} can trade 5 copies of this card for a new pack`;
                  }
                  return "Trade 5 copies of this card for a new pack";
                })()
              : undefined
          }
        />

        {tradeSession ? (
          <ExploreCardPackReveal
            visible
            packSource={EXPLORE_PACK_ART_BY_SOURCE.trade}
            onRipComplete={commitTradeClaim}
            onClose={() => {
              setTradeSession(null);
              // Closing without ripping leaves the pack banked -- refresh
              // so the pack badge picks it up immediately.
              void refreshBankedPacks();
            }}
            onViewBinder={(award) => {
              setTradeSession(null);
              setHighlightId(award.card.id);
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
  listHeader: { paddingBottom: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  filterDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#62A94F",
  },
  packCountBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B8F000",
    borderWidth: 1,
    borderColor: EXPLORE_BINDER_SCREEN_BG,
  },
  packCountText: {
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14,
  },
  title: { fontSize: 22, lineHeight: 26 },
  subtitle: { fontSize: 12, marginTop: 2 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    marginHorizontal: 12,
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#62A94F",
  },
  retryBtn: {
    backgroundColor: "#62A94F",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorBox: { paddingHorizontal: 16, paddingVertical: 8, alignItems: "center" },
  pageWrap: {
    flex: 1,
    paddingHorizontal: H_PAD,
  },
  sheet: {
    width: "100%",
    borderRadius: 12,
    overflow: "visible",
  },
  pageRow: {
    flexDirection: "row",
    gap: GRID_GAP,
    overflow: "visible",
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
});
