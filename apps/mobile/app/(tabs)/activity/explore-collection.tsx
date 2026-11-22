/**
 * Explore card binder: whose cards, how many found, packs to open, then one
 * scrolling grid of card pockets.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BinderCardPocket, fitBinderCardSize } from "@/components/explore/BinderCardPocket";
import {
  BinderInteractionProvider,
  useBinderInteraction,
} from "@/components/explore/BinderInteractionContext";
import { BINDER_STATUS_LABELS, BinderFiltersModal } from "@/components/explore/BinderFiltersModal";
import { ExploreCardDetail } from "@/components/explore/ExploreCardDetail";
import { ExploreCardPackReveal } from "@/components/explore/ExploreCardPackReveal";
import { FKButton, FKCard, FKLoading, FKPageHeader } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import {
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
import { familyHeading, familySentence } from "@/utils/familyNames";
import { newIdempotencyKey } from "@/utils/idempotency";
import type { ExploreAward } from "@/types/exploreStops";
import {
  BINDER_FILTERS,
  BINDER_SORT_OPTIONS,
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

const H_PAD = 20;
const GRID_GAP = 10;
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
    <View style={[styles.pageRow, { height: cardH }, rowPulled ? styles.raised : null]}>
      {row.map((card) => (
        <View
          key={card.id}
          style={[
            styles.cell,
            { width: cardW, height: cardH },
            pulledId === card.id ? styles.raised : null,
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
  /** Height of the list header (title, explorers, packs), for scroll maths. */
  const [headerH, setHeaderH] = useState(0);

  const gridWidth = Math.max(0, windowW - H_PAD * 2);
  const cellW = gridWidth > 0 ? (gridWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS : 0;
  const cardSize = fitBinderCardSize(cellW, cellW / EXPLORE_CARD_ART_ASPECT);
  const rowStride = cardSize.h + GRID_GAP;

  // Whose binder is chosen on the screen itself, so reset only clears the
  // sort and filter sheet's own options.
  const resetFilters = useCallback(() => {
    setCategory(DEFAULT_CATEGORY);
    setStatus(DEFAULT_STATUS);
    setSort(DEFAULT_SORT);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

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
        setError("Sign in to see the card binder.");
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
        setError("Add an explorer to start collecting cards.");
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
          setError("We couldn’t load the binder. Check your connection and try again.");
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

  /** Plain summary of active sort/filter choices, e.g. "Animals, Still to find". */
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (status !== DEFAULT_STATUS) parts.push(BINDER_STATUS_LABELS[status]);
    if (category !== DEFAULT_CATEGORY) {
      const label = BINDER_FILTERS.find((f) => f.id === category)?.label;
      if (label) parts.push(label);
    }
    if (sort !== DEFAULT_SORT) {
      const label = BINDER_SORT_OPTIONS.find((f) => f.id === sort)?.label;
      if (label) parts.push(label);
    }
    return parts.join(", ");
  }, [category, status, sort]);

  const overallUnique = uniqueCollectedCount(cards);
  const overallTotal = cards.length;
  const overallCopies = totalCopyCount(cards);
  const overallPct = completionPercent(overallUnique, overallTotal);

  /** Whose binder is on screen, for the eyebrow above the title. */
  const scopeLabel = useMemo(() => {
    if (profiles.length === 0) return undefined;
    if (selectedProfileId == null) return familyHeading(profiles.map(profileName));
    const profile = profiles.find((p) => p.id === selectedProfileId);
    return profile ? profileName(profile) || undefined : undefined;
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
    const y = headerH + row * rowStride;
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
  }, [highlightId, filtered, rowStride, headerH]);

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
        "Couldn’t swap these cards",
        !result.success
          ? exploreUserMessage(result.error, "Please try again.")
          : "Please try again."
      );
    } catch (err: unknown) {
      const message =
        err instanceof ExploreStopsRequestError
          ? exploreUserMessage(err.exploreError.code, err.exploreError.message)
          : "Please try again.";
      Alert.alert("Couldn’t swap these cards", message);
    }
  }

  const TRADE_EXPLAINER =
    "You’ll get a new pack with a better chance of a rare card. It won’t have this card in it. A swap can’t be undone.";

  function handleTrade(card: BinderCardEntry) {
    const candidates = tradeCandidatesFor(card);
    if (candidates.length === 0) return;

    if (candidates.length === 1) {
      const only = candidates[0]!;
      // In a single-profile view it's obviously "you"; only name the
      // player when viewing the merged "All players" binder.
      const who = viewingAllProfiles && only.name ? ` from ${only.name}` : "";
      Alert.alert(`Swap 5 ${card.name} cards${who}?`, TRADE_EXPLAINER, [
        { text: "Cancel", style: "cancel" },
        { text: "Swap", onPress: () => void startTrade(card, only.profileId) },
      ]);
      return;
    }

    // More than one player has 6+ copies — ask which one is trading.
    Alert.alert(
      `Swap 5 ${card.name} cards?`,
      `${TRADE_EXPLAINER}\n\nWhose cards are we swapping?`,
      [
        ...candidates.map((c) => ({
          text: c.name || "Explorer",
          onPress: () => void startTrade(card, c.profileId),
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  }

  const commitTradeClaim = useCallback(async (): Promise<ExploreAward> => {
    if (!tradeSession) {
      throw new Error("That swap timed out. Try again from the binder.");
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

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.navigate("/(tabs)/me");
  }

  function selectProfile(id: number | null) {
    profileChosenByUserRef.current = true;
    setSelectedProfileId(id);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }

  function onHeaderLayout(e: LayoutChangeEvent) {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h !== headerH) setHeaderH(h);
  }

  const tradeLabel = (() => {
    if (!selected) return undefined;
    const candidates = tradeCandidatesFor(selected);
    if (candidates.length === 0) return undefined;
    if (!viewingAllProfiles) return "You have spares of this card.";
    const names = candidates.map((c) => c.name).filter(Boolean);
    if (names.length === 0) return "There are spares of this card.";
    return `${familySentence(names)} ${names.length === 1 ? "has" : "have"} spares of this card.`;
  })();

  const filterButton = (
    <Pressable
      onPress={() => setFiltersOpen(true)}
      accessibilityRole="button"
      accessibilityLabel={filtersActive ? "Sort and filter, some filters on" : "Sort and filter"}
      hitSlop={8}
      style={styles.roundBtn}
    >
      <Ionicons name="options-outline" size={24} color={FK.ink} />
      {filtersActive ? <View style={styles.filterDot} /> : null}
    </Pressable>
  );

  const pageHeader = (
    <FKPageHeader title="Card binder" eyebrow={scopeLabel} onBack={goBack} right={filterButton} />
  );

  if (loading && cards.length === 0) {
    return (
      <>
        <StatusBar style="dark" />
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
          <View style={styles.loadingHeader}>
            <FKPageHeader title="Card binder" onBack={goBack} />
          </View>
          <View style={styles.loadingBody}>
            <FKLoading line="Opening the binder" />
          </View>
        </SafeAreaView>
      </>
    );
  }

  const listHeader = (
    <View onLayout={onHeaderLayout} style={styles.listHeader}>
      {pageHeader}

      {overallTotal > 0 ? (
        <View style={styles.progress}>
          <Text style={styles.progressLine}>
            <Text style={styles.progressCount}>
              {overallUnique} of {overallTotal}
            </Text>
            {" cards found"}
          </Text>
          <View
            style={styles.track}
            accessible
            accessibilityLabel={`${overallPct} percent of the binder found`}
          >
            <View style={[styles.fill, { width: `${overallPct}%` }]} />
          </View>
          {overallCopies > overallUnique ? (
            <Text style={styles.copiesLine}>{overallCopies} cards in all, counting spares</Text>
          ) : null}
        </View>
      ) : null}

      {showProfilePicker ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.explorerRow}
          style={styles.explorerScroll}
        >
          <ExplorerChip
            label="Everyone"
            selected={selectedProfileId == null}
            onPress={() => selectProfile(null)}
            a11y="Show everyone’s cards"
          />
          {profiles.map((p) => {
            const name = profileName(p) || "Explorer";
            return (
              <ExplorerChip
                key={p.id}
                label={name}
                selected={selectedProfileId === p.id}
                onPress={() => selectProfile(p.id)}
                a11y={`Show ${name}’s cards`}
              />
            );
          })}
        </ScrollView>
      ) : null}

      {bankedPackCount > 0 ? (
        <Pressable
          onPress={openPacksInventory}
          accessibilityRole="button"
          accessibilityLabel={`Open ${bankedPackCount} ${bankedPackCount === 1 ? "pack" : "packs"}`}
          style={styles.packsCard}
        >
          <Image
            source={EXPLORE_PACK_ART_BY_SOURCE.stop_claim}
            style={styles.packsArt}
            resizeMode="contain"
          />
          <View style={styles.packsTextWrap}>
            <Text style={styles.packsTitle}>
              {bankedPackCount} {bankedPackCount === 1 ? "pack" : "packs"} to open
            </Text>
            <Text style={styles.packsSub}>See what’s inside</Text>
          </View>
          <View style={styles.packsArrow}>
            <Ionicons name="arrow-forward" size={22} color={FK.sunbeam} />
          </View>
        </Pressable>
      ) : null}

      {filtersActive ? (
        <View style={styles.filterRow}>
          <Text style={styles.filterText} numberOfLines={2}>
            Showing: {filterSummary}
          </Text>
          <FKButton label="Clear" variant="link" onPress={resetFilters} style={styles.clearLink} />
        </View>
      ) : null}

      {error ? (
        <FKCard style={styles.messageCard}>
          <Text style={TYPE.body}>{error}</Text>
          <FKButton
            label="Try again"
            variant="ink"
            icon="refresh"
            onPress={() => void load()}
            style={styles.messageButton}
          />
        </FKCard>
      ) : null}
    </View>
  );

  const emptyState =
    error || loading ? null : (
      <FKCard style={styles.messageCard}>
        <Text style={TYPE.heading}>
          {filtersActive ? "No cards match" : "No cards to show yet"}
        </Text>
        <Text style={[TYPE.bodySmall, styles.messageBody]}>
          {filtersActive
            ? "Try a different filter to see more of the binder."
            : "Cards turn up at Explore stops on the map."}
        </Text>
        {filtersActive ? (
          <FKButton label="Clear filters" variant="link" onPress={resetFilters} style={styles.clearLinkLeft} />
        ) : null}
      </FKCard>
    );

  return (
    <>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <BinderInteractionProvider pulledId={pulledId} highlightId={highlightId}>
          <FlatList
            ref={listRef}
            data={cardSize.w > 0 ? rows : []}
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
              offset: headerH + rowStride * index,
              index,
            })}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={emptyState}
            ItemSeparatorComponent={RowGap}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            removeClippedSubviews
          />
        </BinderInteractionProvider>

        <BinderFiltersModal
          visible={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          onReset={resetFilters}
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
          onTrade={tradeLabel ? handleTrade : undefined}
          tradeLabel={tradeLabel}
        />

        {tradeSession ? (
          <ExploreCardPackReveal
            visible
            packSource={EXPLORE_PACK_ART_BY_SOURCE.trade}
            onRipComplete={commitTradeClaim}
            onClose={() => {
              setTradeSession(null);
              // Closing without ripping leaves the pack banked -- refresh
              // so the packs card picks it up immediately.
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

function RowGap() {
  return <View style={styles.rowGap} />;
}

function profileName(p: { name: string; nickname?: string | null }): string {
  // Families know their children by name; nicknames are for other families.
  return (p.name || p.nickname || "").trim();
}

function ExplorerChip({
  label,
  selected,
  onPress,
  a11y,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  a11y: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected }}
      style={[styles.explorerChip, selected ? styles.explorerChipOn : null]}
    >
      <Text style={[styles.explorerChipText, selected ? styles.explorerChipTextOn : null]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: FK.moss },
  loadingHeader: { paddingHorizontal: H_PAD, paddingTop: 12 },
  loadingBody: { flex: 1 },
  listContent: { paddingHorizontal: H_PAD, paddingBottom: 24 },
  listHeader: { paddingTop: 12, paddingBottom: 18 },
  roundBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FK.paper,
  },
  filterDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: FK.ember,
    borderWidth: 2,
    borderColor: FK.paper,
  },
  progress: { marginTop: -4 },
  progressLine: { fontFamily: FONT.body, fontSize: 17, lineHeight: 24, color: FK.muted },
  progressCount: { fontFamily: FONT.display, fontSize: 20, color: FK.ink },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: FK.line,
    overflow: "hidden",
    marginTop: 8,
  },
  fill: { height: "100%", borderRadius: 5, backgroundColor: FK.forest },
  copiesLine: { ...TYPE.bodySmall, marginTop: 8 },
  explorerScroll: { marginTop: 18, marginHorizontal: -H_PAD },
  explorerRow: { gap: 8, paddingHorizontal: H_PAD },
  explorerChip: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: RADIUS.pill,
    backgroundColor: FK.paper,
    borderWidth: 1.5,
    borderColor: FK.line,
  },
  explorerChipOn: { backgroundColor: FK.ink, borderColor: FK.ink },
  explorerChipText: { fontFamily: FONT.displayBold, fontSize: 17, color: FK.ink },
  explorerChipTextOn: { color: FK.white },
  packsCard: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 84,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: FK.sunbeam,
  },
  packsArt: { width: 36, height: 64 },
  packsTextWrap: { flex: 1, minWidth: 0 },
  packsTitle: { ...TYPE.heading },
  packsSub: { fontFamily: FONT.body, fontSize: 15, lineHeight: 20, color: FK.ink, marginTop: 2 },
  packsArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FK.ink,
  },
  filterRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  filterText: { flex: 1, fontFamily: FONT.bodyBold, fontSize: 15, lineHeight: 20, color: FK.muted },
  clearLink: { alignSelf: "auto", paddingVertical: 8 },
  clearLinkLeft: { alignSelf: "flex-start", marginTop: 4 },
  messageCard: { marginTop: 18 },
  messageBody: { marginTop: 6 },
  messageButton: { marginTop: 16 },
  rowGap: { height: GRID_GAP },
  raised: { zIndex: 20 },
  pageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    overflow: "visible",
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
});
