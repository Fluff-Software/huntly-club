/**
 * Full-screen Explore card detail: flip and spin the card, and swap spares
 * for a new pack when there are enough.
 */
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FKButton } from "@/components/fieldkit";
import { FK, FONT } from "@/constants/fieldKit";
import { ExploreCardArt } from "@/components/explore/ExploreCardArt";
import { ExploreCardFlip } from "@/components/explore/ExploreCardFlip";
import { EXPLORE_CARD_ART_ASPECT, EXPLORE_RARITY_COLORS } from "@/constants/exploreBinder";
import type { BinderCardEntry } from "@/utils/exploreBinder";

type Props = {
  card: BinderCardEntry | null;
  onClose: () => void;
  /** Called after the modal has begun closing (for sleeve settle). */
  onCloseComplete?: () => void;
  /** Provided only when trading is eligible for this card right now. */
  onTrade?: (card: BinderCardEntry) => void;
  /** Short line above the swap button, e.g. "Mia has spares of this card." */
  tradeLabel?: string;
};

export function ExploreCardDetail({
  card,
  onClose,
  onCloseComplete,
  onTrade,
  tradeLabel,
}: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!card) return null;

  const collected =
    card.collected === true ||
    Number(card.count) > 0 ||
    Boolean(card.firstCollectedAt);

  const canTrade = Boolean(onTrade && tradeLabel);
  // Leave room for the swap line and button under the card when they show.
  const maxCardH = height * (canTrade ? 0.62 : 0.76);
  const cardHeight = Math.min(maxCardH, Math.min(width * 0.86, 340) / EXPLORE_CARD_ART_ASPECT);
  const cardWidth = cardHeight * EXPLORE_CARD_ART_ASPECT;

  function handleClose() {
    onClose();
    onCloseComplete?.();
  }

  return (
    <Modal visible animationType="fade" transparent onRequestClose={handleClose}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityLabel="Dismiss card">
          <View style={styles.dim} />
        </Pressable>

        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close card"
          hitSlop={8}
          style={[styles.closeBtn, { top: insets.top + 12, right: 20 }]}
        >
          <Ionicons name="close" size={26} color={FK.ink} />
        </Pressable>

        <View style={[styles.card, { width: cardWidth, height: cardHeight }]}>
          <ExploreCardFlip
            key={`${card.id}-${collected ? "in" : "out"}`}
            interactive={collected}
            entranceTwist
            rarity={card.rarity}
            borderColor={
              collected
                ? EXPLORE_RARITY_COLORS[card.rarity] ?? "#3B82F6"
                : "#1A2E20"
            }
          >
            <ExploreCardArt
              imageUrl={card.imageUrl}
              name={card.name}
              rarity={card.rarity}
              description={card.description}
              category={card.category}
              habitatWeights={card.habitatWeights}
              count={card.count}
              firstCollectedAt={card.firstCollectedAt}
              lastCollectedAt={card.lastCollectedAt}
              collectedBy={card.collectedBy}
              collected={collected}
              enableShine
              style={styles.art}
            />
          </ExploreCardFlip>
        </View>

        {canTrade && onTrade ? (
          <View style={[styles.trade, { width: Math.max(cardWidth, 280) }]}>
            <Text style={styles.tradeText}>{tradeLabel}</Text>
            <FKButton
              onDark
              label="Swap 5 for a new pack"
              icon="swap-horizontal"
              onPress={() => onTrade(card)}
              style={styles.tradeButton}
            />
          </View>
        ) : null}
      </GestureHandlerRootView>
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
    backgroundColor: "rgba(16,37,27,0.9)",
  },
  closeBtn: {
    position: "absolute",
    zIndex: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FK.paper,
  },
  card: {
    borderRadius: 14,
    // Let the 3D flip extend past the flat card bounds
    overflow: "visible",
    backgroundColor: "transparent",
  },
  art: {
    borderRadius: 0,
  },
  trade: {
    marginTop: 22,
    alignItems: "stretch",
    maxWidth: "88%",
  },
  tradeText: {
    fontFamily: FONT.bodyBold,
    fontSize: 16,
    lineHeight: 22,
    color: FK.white,
    textAlign: "center",
    marginBottom: 12,
  },
  tradeButton: {
    paddingHorizontal: 20,
  },
});
