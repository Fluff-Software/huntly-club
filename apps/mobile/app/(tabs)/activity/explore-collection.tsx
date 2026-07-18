import React, { useEffect, useMemo, useState } from "react";
import { View, FlatList, Image, Pressable, Modal, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { EXPLORE_RARITY_COLORS, EXPLORE_RARITY_LABELS } from "@/constants/exploreColors";
import {
  getCollectibleCatalog,
  getProfileInventory,
  type ExploreCollectible,
  type ExploreProfileCollectible,
} from "@/services/exploreLocationService";

const FOREST_DARK = "#2D4A35";
const LIGHT_BG = "#EEF0F7";
const CARD_BG = "#FFF";
const UNDISCOVERED_BG = "#DADFE8";

type GridEntry = {
  collectible: ExploreCollectible;
  owned: ExploreProfileCollectible | null;
};

export default function ExploreCollectionScreen() {
  const router = useRouter();
  const { profileId: profileIdParam } = useLocalSearchParams<{ profileId?: string }>();
  const profileId = profileIdParam ? Number(profileIdParam) : null;
  const { scaleW } = useLayoutScale();

  const [catalog, setCatalog] = useState<ExploreCollectible[]>([]);
  const [inventory, setInventory] = useState<ExploreProfileCollectible[]>([]);
  const [selected, setSelected] = useState<GridEntry | null>(null);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    Promise.all([getCollectibleCatalog(), getProfileInventory(profileId)])
      .then(([c, inv]) => {
        if (cancelled) return;
        setCatalog(c);
        setInventory(inv);
      })
      .catch(() => {
        // Leave the grid empty; the user can pull back and retry from the map.
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const inventoryByCollectibleId = useMemo(() => {
    const map = new Map<number, ExploreProfileCollectible>();
    for (const row of inventory) map.set(row.collectible_id, row);
    return map;
  }, [inventory]);

  const entries: GridEntry[] = useMemo(
    () => catalog.map((collectible) => ({ collectible, owned: inventoryByCollectibleId.get(collectible.id) ?? null })),
    [catalog, inventoryByCollectibleId]
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
        gridContent: { padding: scaleW(10) },
        cell: {
          flex: 1,
          margin: scaleW(6),
          aspectRatio: 1,
          borderRadius: scaleW(16),
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden" },
        cellImage: { width: "70%", height: "70%" },
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
        modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
        modalCard: {
          width: "80%",
          backgroundColor: "#FFF",
          borderRadius: scaleW(20),
          padding: scaleW(20),
          alignItems: "center" },
        modalImage: { width: scaleW(120), height: scaleW(120) },
        modalName: { fontSize: scaleW(18), fontWeight: "800", marginTop: scaleW(10), color: "#1A2333" },
        modalRarity: { fontSize: scaleW(13), fontWeight: "800", marginTop: scaleW(4) },
        modalFlavor: { fontSize: scaleW(13), color: "#555", textAlign: "center", marginTop: scaleW(8) },
        modalMeta: { fontSize: scaleW(12), color: "#888", marginTop: scaleW(10) },
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
            Collection
          </ThemedText>
          <ThemedText style={styles.headerSubtext}>
            {discoveredCount} of {catalog.length} discovered
          </ThemedText>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.body}>
        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.collectible.id)}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => {
            const rarityColor = EXPLORE_RARITY_COLORS[item.collectible.rarity];
            const owned = item.owned != null;
            return (
              <Pressable
                style={[
                  styles.cell,
                  { backgroundColor: owned ? CARD_BG : UNDISCOVERED_BG, borderWidth: 2, borderColor: owned ? rarityColor : "transparent" },
                ]}
                onPress={() => owned && setSelected(item)}
              >
                {owned ? (
                  <>
                    <Image source={{ uri: item.collectible.image_url }} style={styles.cellImage} resizeMode="contain" />
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
              <Image source={{ uri: selected.collectible.image_url }} style={styles.modalImage} resizeMode="contain" />
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
                  First found {new Date(selected.owned.first_discovered_at).toLocaleDateString()} · Owned ×{selected.owned.count}
                </ThemedText>
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
