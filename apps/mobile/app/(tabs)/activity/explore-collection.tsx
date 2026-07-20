import React, { useEffect, useMemo, useState } from "react";
import { View, FlatList, Pressable, Modal, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ExploreCard } from "@/components/ExploreCard";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { usePlayer } from "@/contexts/PlayerContext";
import { EXPLORE_RARITY_COLORS, EXPLORE_RARITY_LABELS } from "@/constants/exploreColors";
import {
  getCollectibleCatalog,
  getCollectibleCategories,
  getProfileInventory,
  type ExploreCollectible,
  type ExploreCollectibleCategory,
  type ExploreProfileCollectible,
} from "@/services/exploreLocationService";

const FOREST_DARK = "#2D4A35";
const LIGHT_BG = "#EEF0F7";
const CARD_BG = "#FFF";
const UNDISCOVERED_BG = "#DADFE8";
const ALL_CATEGORY_ID = -1;

type GridEntry = {
  collectible: ExploreCollectible;
  owned: ExploreProfileCollectible | null;
};

export default function ExploreCollectionScreen() {
  const router = useRouter();
  const { profileId: profileIdParam } = useLocalSearchParams<{ profileId?: string }>();
  const { profiles } = usePlayer();
  const { scaleW } = useLayoutScale();

  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<ExploreCollectible[]>([]);
  const [categories, setCategories] = useState<ExploreCollectibleCategory[]>([]);
  const [inventory, setInventory] = useState<ExploreProfileCollectible[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(ALL_CATEGORY_ID);
  const [selected, setSelected] = useState<GridEntry | null>(null);

  // Resolves the active profile the same way badges.tsx does: prefer the ?profileId param when
  // it names a real profile (arriving from explore-map, already in an activity), otherwise fall
  // back to the previously-selected profile or the first one (arriving from the Backpack tile,
  // which has no profile in flight).
  useEffect(() => {
    if (profiles.length === 0) {
      setSelectedProfileId(null);
      return;
    }
    const requestedProfileId =
      typeof profileIdParam === "string" ? Number(profileIdParam) : NaN;
    if (!Number.isNaN(requestedProfileId) && profiles.some((p) => p.id === requestedProfileId)) {
      setSelectedProfileId(requestedProfileId);
      return;
    }
    setSelectedProfileId((prev) => {
      if (prev != null && profiles.some((p) => p.id === prev)) return prev;
      return profiles[0]?.id ?? null;
    });
  }, [profiles, profileIdParam]);

  useEffect(() => {
    if (!selectedProfileId) return;
    let cancelled = false;
    Promise.all([getCollectibleCatalog(), getCollectibleCategories(), getProfileInventory(selectedProfileId)])
      .then(([c, cats, inv]) => {
        if (cancelled) return;
        setCatalog(c);
        setCategories(cats);
        setInventory(inv);
      })
      .catch(() => {
        // Leave the grid empty; the user can pull back and retry from the map.
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProfileId]);

  const inventoryByCollectibleId = useMemo(() => {
    const map = new Map<number, ExploreProfileCollectible>();
    for (const row of inventory) map.set(row.collectible_id, row);
    return map;
  }, [inventory]);

  const entries: GridEntry[] = useMemo(
    () =>
      catalog
        .filter(
          (collectible) =>
            selectedCategoryId === ALL_CATEGORY_ID || collectible.category_id === selectedCategoryId
        )
        .map((collectible) => ({ collectible, owned: inventoryByCollectibleId.get(collectible.id) ?? null })),
    [catalog, inventoryByCollectibleId, selectedCategoryId]
  );

  const discoveredCount = inventory.length;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: FOREST_DARK },
        header: {
          backgroundColor: FOREST_DARK,
          paddingTop: scaleW(24),
          paddingBottom: scaleW(18),
          paddingHorizontal: scaleW(16),
          borderBottomLeftRadius: scaleW(28),
          borderBottomRightRadius: scaleW(28),
          flexDirection: "row",
          alignItems: "center" },
        backButton: {
          width: scaleW(42),
          height: scaleW(42),
          borderRadius: scaleW(21),
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.14)" },
        headerTextWrap: { flex: 1, alignItems: "center" },
        headerTitle: { fontSize: scaleW(20), fontWeight: "700", color: "#FFF", textAlign: "center" },
        headerSubtext: { marginTop: scaleW(2), fontSize: scaleW(13), color: "rgba(255,255,255,0.75)", textAlign: "center" },
        headerRightSpacer: { width: scaleW(42) },
        body: { flex: 1, backgroundColor: LIGHT_BG },
        profileRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: scaleW(8),
          paddingHorizontal: scaleW(12),
          paddingTop: scaleW(12) },
        categoryRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: scaleW(8),
          paddingHorizontal: scaleW(12),
          paddingTop: scaleW(10),
          paddingBottom: scaleW(4) },
        chip: {
          paddingHorizontal: scaleW(12),
          paddingVertical: scaleW(6),
          borderRadius: scaleW(999),
          borderWidth: 1,
          borderColor: "#A7B0A5",
          backgroundColor: "#FFFFFF" },
        chipActive: { backgroundColor: "#3E63C9", borderColor: "#3E63C9" },
        chipText: { fontSize: scaleW(12), fontWeight: "600", color: "#2B2B2B" },
        chipTextActive: { color: "#FFFFFF" },
        gridContent: { padding: scaleW(10) },
        cell: {
          flex: 1,
          margin: scaleW(6),
          aspectRatio: 0.8,
          borderRadius: scaleW(16),
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderWidth: 2,
          borderStyle: "dashed" },
        cellOwned: { backgroundColor: CARD_BG, borderColor: "rgba(0,0,0,0.08)" },
        cellUndiscoveredBg: { backgroundColor: UNDISCOVERED_BG, borderColor: "rgba(0,0,0,0.06)" },
        cellUndiscovered: { fontSize: scaleW(30), fontWeight: "900", color: "#8A93A6" },
        cellCount: {
          position: "absolute",
          bottom: scaleW(6),
          right: scaleW(6),
          backgroundColor: "rgba(0,0,0,0.55)",
          borderRadius: scaleW(10),
          paddingHorizontal: scaleW(6),
          paddingVertical: scaleW(2) },
        cellCountText: { color: "#FFF", fontSize: scaleW(11), fontWeight: "800" },
        cellShinyBadge: {
          position: "absolute",
          top: scaleW(6),
          left: scaleW(6),
          backgroundColor: "rgba(0,0,0,0.55)",
          borderRadius: scaleW(10),
          paddingHorizontal: scaleW(5),
          paddingVertical: scaleW(2) },
        cellShinyText: { fontSize: scaleW(11) },
        modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
        modalCard: {
          width: "80%",
          backgroundColor: "#FFF",
          borderRadius: scaleW(20),
          padding: scaleW(20),
          alignItems: "center" },
        modalName: { fontSize: scaleW(18), fontWeight: "800", marginTop: scaleW(10), color: "#1A2333" },
        modalRarity: { fontSize: scaleW(13), fontWeight: "800", marginTop: scaleW(4) },
        modalFlavor: { fontSize: scaleW(13), color: "#555", textAlign: "center", marginTop: scaleW(8) },
        modalMeta: { fontSize: scaleW(12), color: "#888", marginTop: scaleW(10) },
        modalShinyMeta: { fontSize: scaleW(12), color: "#B8860B", fontWeight: "700", marginTop: scaleW(4) },
        modalClose: {
          marginTop: scaleW(16),
          paddingVertical: scaleW(10),
          paddingHorizontal: scaleW(24),
          borderRadius: scaleW(20),
          backgroundColor: "#3E63C9" },
        modalCloseText: { color: "#FFF", fontWeight: "800" } }),
    [scaleW]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="chevron-left" size={scaleW(28)} color="#FFF" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <ThemedText type="heading" style={styles.headerTitle}>
            Card Binder
          </ThemedText>
          <ThemedText style={styles.headerSubtext}>
            {discoveredCount} of {catalog.length} discovered
          </ThemedText>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.body}>
        {profiles.length > 0 && (
          <View style={styles.profileRow}>
            {profiles.map((profile) => (
              <Pressable
                key={profile.id}
                style={[styles.chip, selectedProfileId === profile.id ? styles.chipActive : undefined]}
                onPress={() => setSelectedProfileId(profile.id)}
              >
                <ThemedText
                  style={[styles.chipText, selectedProfileId === profile.id ? styles.chipTextActive : undefined]}
                >
                  {profile.nickname || profile.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.categoryRow}>
          <Pressable
            style={[styles.chip, selectedCategoryId === ALL_CATEGORY_ID ? styles.chipActive : undefined]}
            onPress={() => setSelectedCategoryId(ALL_CATEGORY_ID)}
          >
            <ThemedText
              style={[styles.chipText, selectedCategoryId === ALL_CATEGORY_ID ? styles.chipTextActive : undefined]}
            >
              All
            </ThemedText>
          </Pressable>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              style={[styles.chip, selectedCategoryId === category.id ? styles.chipActive : undefined]}
              onPress={() => setSelectedCategoryId(category.id)}
            >
              <ThemedText
                style={[styles.chipText, selectedCategoryId === category.id ? styles.chipTextActive : undefined]}
              >
                {category.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.collectible.id)}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => {
            const owned = item.owned != null;
            const isShiny = item.owned?.first_shiny_discovered_at != null;
            return (
              <Pressable
                style={[styles.cell, owned ? styles.cellOwned : styles.cellUndiscoveredBg]}
                onPress={() => owned && setSelected(item)}
              >
                {owned ? (
                  <>
                    <ExploreCard collectible={item.collectible} isShiny={isShiny} size={72} showName={false} />
                    {isShiny && (
                      <View style={styles.cellShinyBadge}>
                        <ThemedText style={styles.cellShinyText}>✨</ThemedText>
                      </View>
                    )}
                    {item.owned!.count > 1 && (
                      <View style={styles.cellCount}>
                        <ThemedText style={styles.cellCountText}>×{item.owned!.count}</ThemedText>
                      </View>
                    )}
                  </>
                ) : (
                  <ThemedText style={styles.cellUndiscovered}>?</ThemedText>
                )}
              </Pressable>
            );
          }}
        />
      </View>

      <Modal visible={selected != null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          {selected && (
            <View style={styles.modalCard}>
              <ExploreCard
                collectible={selected.collectible}
                isShiny={selected.owned?.first_shiny_discovered_at != null}
                size={140}
                interactiveTilt
                showName={false}
              />
              <ThemedText type="heading" style={styles.modalName}>
                {selected.collectible.name}
              </ThemedText>
              <ThemedText style={[styles.modalRarity, { color: EXPLORE_RARITY_COLORS[selected.collectible.rarity] }]}>
                {EXPLORE_RARITY_LABELS[selected.collectible.rarity]}
              </ThemedText>
              {selected.collectible.flavor_text && (
                <ThemedText style={styles.modalFlavor}>{selected.collectible.flavor_text}</ThemedText>
              )}
              {selected.owned && (
                <ThemedText style={styles.modalMeta}>
                  First found {new Date(selected.owned.first_discovered_at).toLocaleDateString()} · Owned ×
                  {selected.owned.count}
                </ThemedText>
              )}
              {selected.owned?.first_shiny_discovered_at != null && (
                <ThemedText style={styles.modalShinyMeta}>✨ Shiny found</ThemedText>
              )}
              <Pressable style={styles.modalClose} onPress={() => setSelected(null)}>
                <ThemedText style={styles.modalCloseText}>Close</ThemedText>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
