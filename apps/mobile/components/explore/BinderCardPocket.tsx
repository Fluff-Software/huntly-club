import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ExploreCardArt } from "@/components/explore/ExploreCardArt";
import { EXPLORE_CARD_ART_ASPECT, EXPLORE_RARITY_COLORS } from "@/constants/exploreBinder";
import {
  binderPocketAccessibilityLabel,
  formatRarityLabel,
  type BinderCardEntry,
} from "@/utils/exploreBinder";

type Props = {
  card: BinderCardEntry;
  highlighted?: boolean;
  onPress: () => void;
};

/** Simple grid cell for a catalogue card. */
export function BinderCardPocket({ card, highlighted, onPress }: Props) {
  const collected =
    card.collected === true ||
    Number(card.count) > 0 ||
    Boolean(card.firstCollectedAt);
  const rarityColor = EXPLORE_RARITY_COLORS[card.rarity] ?? "#3B82F6";
  const tabColor = collected ? rarityColor : "#5A6B62";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={binderPocketAccessibilityLabel({
        ...card,
        collected,
        count: Math.max(card.count, collected ? 1 : 0),
      })}
      style={({ pressed }) => [
        styles.pocket,
        highlighted && styles.highlighted,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.artWrap}>
        <ExploreCardArt
          key={`${card.id}-${collected ? "in" : "out"}`}
          imageUrl={card.imageUrl}
          name={card.name}
          rarity={card.rarity}
          collected={collected}
          compact
        />

        <View style={[styles.rarityTab, { backgroundColor: tabColor }]} pointerEvents="none">
          <ThemedText lightColor="#FFF" darkColor="#FFF" numberOfLines={1} style={styles.name}>
            {card.name}
          </ThemedText>
          <ThemedText lightColor="#FFF" darkColor="#FFF" numberOfLines={1} style={styles.meta}>
            {collected ? formatRarityLabel(card.rarity) : "Not discovered"}
          </ThemedText>
        </View>

        {collected && card.count > 1 ? (
          <View style={[styles.dupBadge, { backgroundColor: rarityColor }]}>
            <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.dupText}>
              ×{card.count}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pocket: {
    flex: 1,
    minWidth: 0,
    padding: 4,
  },
  highlighted: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFE08A",
  },
  artWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: EXPLORE_CARD_ART_ASPECT,
    borderRadius: 16,
    overflow: "hidden",
  },
  rarityTab: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 7,
    alignItems: "center",
  },
  name: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  meta: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    opacity: 0.92,
  },
  dupBadge: {
    position: "absolute",
    top: 52,
    right: 6,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#FFF",
  },
  dupText: { fontSize: 9, fontWeight: "800" },
});
