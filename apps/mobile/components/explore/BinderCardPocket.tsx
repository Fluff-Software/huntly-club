import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ExploreCardArt } from "@/components/explore/ExploreCardArt";
import { EXPLORE_CARD_ART_ASPECT, EXPLORE_RARITY_COLORS } from "@/constants/exploreBinder";
import {
  binderPocketAccessibilityLabel,
  type BinderCardEntry,
} from "@/utils/exploreBinder";

const CARD_BG = require("@/assets/images/explore-card-bg.png");

type Props = {
  card: BinderCardEntry;
  highlighted?: boolean;
  onPress: () => void;
};

/** Cap stack depth so the grid stays tidy. */
function stackDepth(count: number): number {
  if (count >= 3) return 2;
  if (count >= 2) return 1;
  return 0;
}

/** Simple grid cell for a catalogue card. */
export function BinderCardPocket({ card, highlighted, onPress }: Props) {
  const collected =
    card.collected === true ||
    Number(card.count) > 0 ||
    Boolean(card.firstCollectedAt);
  const rarityColor = EXPLORE_RARITY_COLORS[card.rarity] ?? "#3B82F6";
  const depth = collected ? stackDepth(card.count) : 0;
  const stacked = depth > 0;

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
        stacked && styles.pocketStacked,
        highlighted && styles.highlighted,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.stackStage}>
        {Array.from({ length: depth }).map((_, i) => {
          // i=0 is furthest back
          const step = depth - i;
          return (
            <View
              key={`stack-${step}`}
              pointerEvents="none"
              style={[
                styles.stackLayer,
                {
                  transform: [
                    { translateX: step * 3 },
                    { translateY: step * 3 },
                  ],
                  zIndex: i,
                },
              ]}
            >
              <Image
                source={CARD_BG}
                style={styles.stackBg}
                resizeMode="stretch"
                accessibilityIgnoresInvertColors
              />
              <View style={styles.stackEdge} />
            </View>
          );
        })}

        <View style={[styles.artWrap, { zIndex: depth + 1 }]}>
          <ExploreCardArt
            key={`${card.id}-${collected ? "in" : "out"}`}
            imageUrl={card.imageUrl}
            name={card.name}
            rarity={card.rarity}
            description={card.description}
            category={card.category}
            habitatWeights={card.habitatWeights}
            count={card.count}
            firstCollectedAt={card.firstCollectedAt}
            lastCollectedAt={card.lastCollectedAt}
            collected={collected}
            compact
          />

          {stacked ? (
            <View style={[styles.dupBadge, { backgroundColor: rarityColor }]}>
              <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.dupText}>
                ×{card.count}
              </ThemedText>
            </View>
          ) : null}
        </View>
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
  pocketStacked: {
    paddingBottom: 8,
    paddingRight: 6,
  },
  highlighted: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFE08A",
  },
  stackStage: {
    position: "relative",
    width: "100%",
  },
  stackLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    overflow: "hidden",
  },
  stackBg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  stackEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(20, 40, 24, 0.28)",
  },
  artWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: EXPLORE_CARD_ART_ASPECT,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#2D4A35",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  dupBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#FFF",
  },
  dupText: { fontSize: 9, fontWeight: "800" },
});
