/**
 * Full-screen trading-card detail — Pokémon-style face: full-bleed art with
 * overlays (no chrome border / separate header strip).
 */
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ExploreCardArt } from "@/components/explore/ExploreCardArt";
import { EXPLORE_CARD_ART_ASPECT, EXPLORE_RARITY_COLORS } from "@/constants/exploreBinder";
import {
  BINDER_CATEGORY_LABELS,
  formatRarityLabel,
  readableHabitatAffinities,
  type BinderCardEntry,
  type BinderCategoryFilter,
} from "@/utils/exploreBinder";

type Props = {
  card: BinderCardEntry | null;
  onClose: () => void;
};

function categoryLabel(category: string): string {
  const key = category as Exclude<BinderCategoryFilter, "all">;
  return BINDER_CATEGORY_LABELS[key] ?? category.replace(/_/g, " ");
}

export function ExploreCardDetail({ card, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!card) return null;

  const collected =
    card.collected === true ||
    Number(card.count) > 0 ||
    Boolean(card.firstCollectedAt);
  const rarityColor = EXPLORE_RARITY_COLORS[card.rarity] ?? "#3B82F6";
  const tabColor = collected ? rarityColor : "#5A6B62";
  const affinities = readableHabitatAffinities(card.habitatWeights);

  const cardWidth = Math.min(width * 0.88, 340);
  const cardHeight = Math.min(height * 0.78, cardWidth / EXPLORE_CARD_ART_ASPECT);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss card">
          <View style={styles.dim} />
        </Pressable>

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close card"
          style={[styles.closeBtn, { top: insets.top + 10, right: 16 }]}
        >
          <MaterialIcons name="close" size={22} color="#FFF" />
        </Pressable>

        <View style={[styles.card, { width: cardWidth, height: cardHeight }]}>
          <ExploreCardArt
            key={`${card.id}-${collected ? "in" : "out"}`}
            imageUrl={card.imageUrl}
            name={card.name}
            rarity={card.rarity}
            collected={collected}
            style={styles.art}
          />

          <View style={[styles.topTab, { backgroundColor: tabColor }]} pointerEvents="none">
            <ThemedText
              type="heading"
              lightColor="#FFF"
              darkColor="#FFF"
              numberOfLines={1}
              style={styles.cardTitle}
            >
              {card.name}
            </ThemedText>
            <ThemedText lightColor="#FFF" darkColor="#FFF" numberOfLines={1} style={styles.rarityText}>
              {collected ? formatRarityLabel(card.rarity) : "Unknown"}
            </ThemedText>
          </View>

          <View style={styles.bottomPanel} pointerEvents="box-none">
            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <ThemedText lightColor="rgba(255,255,255,0.75)" darkColor="rgba(255,255,255,0.75)" style={styles.metaLine}>
                {categoryLabel(card.category)}
              </ThemedText>

              {collected ? (
                <>
                  <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.description}>
                    {card.description}
                  </ThemedText>
                  <View style={styles.statRow}>
                    <ThemedText lightColor="#FFE08A" darkColor="#FFE08A" style={styles.statLabel}>
                      Copies
                    </ThemedText>
                    <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.statValue}>
                      {card.count}
                    </ThemedText>
                  </View>
                  {card.firstCollectedAt ? (
                    <View style={styles.statRow}>
                      <ThemedText
                        lightColor="rgba(255,255,255,0.65)"
                        darkColor="rgba(255,255,255,0.65)"
                        style={styles.statLabel}
                      >
                        First found
                      </ThemedText>
                      <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.statValue}>
                        {new Date(card.firstCollectedAt).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  ) : null}
                  {card.lastCollectedAt ? (
                    <View style={styles.statRow}>
                      <ThemedText
                        lightColor="rgba(255,255,255,0.65)"
                        darkColor="rgba(255,255,255,0.65)"
                        style={styles.statLabel}
                      >
                        Last found
                      </ThemedText>
                      <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.statValue}>
                        {new Date(card.lastCollectedAt).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  ) : null}
                  {affinities.length > 0 ? (
                    <View style={styles.affinityBlock}>
                      <ThemedText lightColor="#FFE08A" darkColor="#FFE08A" style={styles.affinityHeading}>
                        Habitats
                      </ThemedText>
                      <ThemedText
                        lightColor="rgba(255,255,255,0.9)"
                        darkColor="rgba(255,255,255,0.9)"
                        style={styles.affinityText}
                      >
                        {affinities.map((a) => a.label).join(" · ")}
                      </ThemedText>
                    </View>
                  ) : null}
                </>
              ) : (
                <ThemedText
                  lightColor="rgba(255,255,255,0.85)"
                  darkColor="rgba(255,255,255,0.85)"
                  style={styles.lockedText}
                >
                  Not discovered yet. Keep exploring to find this card.
                </ThemedText>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  closeBtn: {
    position: "absolute",
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#0B120E",
    // Soft “physical card” lift
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  art: {
    borderRadius: 0,
  },
  topTab: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  cardTitle: {
    flex: 1,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
  },
  rarityText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "42%",
    backgroundColor: "rgba(8, 14, 10, 0.78)",
  },
  bodyScroll: {
    maxHeight: "100%",
  },
  bodyContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 6,
  },
  metaLine: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  statValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  affinityBlock: {
    marginTop: 4,
    gap: 2,
  },
  affinityHeading: {
    fontSize: 12,
    fontWeight: "800",
  },
  affinityText: {
    fontSize: 12,
    lineHeight: 17,
  },
  lockedText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    paddingVertical: 4,
  },
});
