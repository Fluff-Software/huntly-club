/**
 * Explore Card Binder — simple vertical card grid for the selected profile.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { BinderCardPocket } from "@/components/explore/BinderCardPocket";
import { ExploreCardDetail } from "@/components/explore/ExploreCardDetail";
import { EXPLORE_BINDER_SCREEN_BG } from "@/constants/exploreBinder";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import {
  ExploreStopsRequestError,
  exploreUserMessage,
  getExploreCardCollection,
} from "@/services/exploreStopsService";
import {
  BINDER_FILTERS,
  completionPercent,
  filterBinderCards,
  totalCopyCount,
  uniqueCollectedCount,
  type BinderCardEntry,
  type BinderCategoryFilter,
} from "@/utils/exploreBinder";

export default function ExploreCollectionScreen() {
  const router = useRouter();
  const { profileId: profileIdParam, highlightCardId } = useLocalSearchParams<{
    profileId?: string;
    highlightCardId?: string;
  }>();
  const { session } = useAuth();
  const { profiles } = usePlayer();
  const { isTablet } = useLayoutScale();

  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [cards, setCards] = useState<BinderCardEntry[]>([]);
  const [filter, setFilter] = useState<BinderCategoryFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BinderCardEntry | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(
    typeof highlightCardId === "string" ? highlightCardId : null
  );

  const listRef = useRef<FlatList<BinderCardEntry>>(null);

  const columns = isTablet ? 3 : 2;

  useEffect(() => {
    if (profiles.length === 0) {
      setSelectedProfileId(null);
      return;
    }
    const requested = typeof profileIdParam === "string" ? Number(profileIdParam) : NaN;
    if (Number.isFinite(requested) && profiles.some((p) => p.id === requested)) {
      setSelectedProfileId(requested);
      return;
    }
    setSelectedProfileId((prev) =>
      prev != null && profiles.some((p) => p.id === prev) ? prev : profiles[0]!.id
    );
  }, [profiles, profileIdParam]);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!session) {
        setError("Sign in to open the Card Binder.");
        setCards([]);
        setLoading(false);
        return;
      }
      if (selectedProfileId == null) {
        setError("Select a player profile to view cards.");
        setCards([]);
        setLoading(false);
        return;
      }
      if (!opts?.soft) setLoading(true);
      setError(null);
      try {
        const result = await getExploreCardCollection(selectedProfileId);
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
    [session, selectedProfileId]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const filtered = useMemo(() => filterBinderCards(cards, filter), [cards, filter]);

  // Highlighted card from “View in binder” must be findable — reset category filter.
  useEffect(() => {
    if (!highlightId) return;
    setFilter("all");
  }, [highlightId]);

  useEffect(() => {
    if (!highlightId || filtered.length === 0) return;
    const itemIndex = filtered.findIndex((c) => c.id === highlightId);
    if (itemIndex < 0) return;
    // FlatList with numColumns windows by *row*, not item index.
    const rowIndex = Math.min(
      Math.floor(itemIndex / columns),
      Math.max(0, Math.ceil(filtered.length / columns) - 1)
    );
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: rowIndex,
        animated: true,
        viewPosition: 0.25,
      });
    });
    const card = filtered[itemIndex];
    if (card) setSelected(card);
    const t = setTimeout(() => setHighlightId(null), 2500);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(t);
    };
  }, [highlightId, filtered, columns]);

  const unique = uniqueCollectedCount(filtered);
  const totalActive = filtered.length;
  const copies = totalCopyCount(filtered);
  const pct = completionPercent(unique, totalActive);

  const listHeader = (
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
            {totalActive > 0
              ? `${unique} of ${totalActive} discovered · ${pct}%`
              : loading
                ? "Loading…"
                : "No cards"}
            {copies > 0 ? ` · ${copies} total` : ""}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => void load({ soft: true })}
          accessibilityRole="button"
          accessibilityLabel="Refresh binder"
          style={styles.iconBtn}
        >
          <MaterialIcons name="refresh" size={22} color="#FFF" />
        </Pressable>
      </View>

      {profiles.length > 1 ? (
        <View style={styles.chipRow}>
          {profiles.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => setSelectedProfileId(p.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedProfileId === p.id }}
              style={[styles.chip, selectedProfileId === p.id && styles.chipActive]}
            >
              <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.chipText} numberOfLines={1}>
                {p.nickname || p.name}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.chipRow}>
        {BINDER_FILTERS.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => setFilter(f.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f.id }}
            accessibilityLabel={`Filter ${f.label}`}
            style={[styles.chip, filter === f.id && styles.chipActive]}
          >
            <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.chipText} numberOfLines={1}>
              {f.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <ThemedText lightColor="#FFD8D8" darkColor="#FFD8D8" style={{ textAlign: "center" }}>
            {error}
          </ThemedText>
          <Pressable onPress={() => void load()} style={[styles.chip, styles.chipActive, { marginTop: 8 }]}>
            <ThemedText lightColor="#FFF" darkColor="#FFF">
              Retry
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        {loading && cards.length === 0 ? (
          <View style={styles.center}>
            {listHeader}
            <ActivityIndicator color="#FFF" style={{ marginTop: 40 }} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={filtered}
            key={columns}
            keyExtractor={(item) => item.id}
            numColumns={columns}
            ListHeaderComponent={listHeader}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
            renderItem={({ item }) => (
              <View style={styles.cell}>
                <BinderCardPocket
                  card={item}
                  highlighted={highlightId === item.id}
                  onPress={() => setSelected(item)}
                />
              </View>
            )}
            ListEmptyComponent={
              !loading && !error ? (
                <ThemedText
                  lightColor="rgba(255,255,255,0.7)"
                  darkColor="rgba(255,255,255,0.7)"
                  style={{ textAlign: "center", marginTop: 24 }}
                >
                  No cards in this filter.
                </ThemedText>
              ) : null
            }
            onScrollToIndexFailed={({ index, averageItemLength }) => {
              listRef.current?.scrollToOffset({
                offset: Math.max(0, index * (averageItemLength || 220)),
                animated: true,
              });
            }}
          />
        )}

        <ExploreCardDetail card={selected} onClose={() => setSelected(null)} />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: EXPLORE_BINDER_SCREEN_BG },
  center: { flex: 1 },
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
  title: { fontSize: 22, lineHeight: 26 },
  subtitle: { fontSize: 12, marginTop: 2 },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: "#62A94F" },
  chipText: { fontSize: 13, fontWeight: "700" },
  errorBox: { paddingHorizontal: 16, paddingVertical: 8, alignItems: "center" },
  listContent: {
    paddingBottom: 24,
  },
  columnWrapper: {
    paddingHorizontal: 8,
    gap: 8,
  },
  cell: {
    flex: 1,
    marginBottom: 8,
  },
});
