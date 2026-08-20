/**
 * Full-screen Explore card detail — flip / spin the trading card.
 */
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
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
};

export function ExploreCardDetail({ card, onClose, onCloseComplete, onTrade }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!card) return null;

  const collected =
    card.collected === true ||
    Number(card.count) > 0 ||
    Boolean(card.firstCollectedAt);

  const cardWidth = Math.min(width * 0.88, 340);
  const cardHeight = Math.min(height * 0.78, cardWidth / EXPLORE_CARD_ART_ASPECT);

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
          style={[styles.closeBtn, { top: insets.top + 10, right: 16 }]}
        >
          <MaterialIcons name="close" size={22} color="#FFF" />
        </Pressable>

        <View style={[styles.card, { width: cardWidth, height: cardHeight }]}>
          <ExploreCardFlip
            key={`${card.id}-${collected ? "in" : "out"}`}
            interactive={collected}
            entranceTwist
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

        {onTrade ? (
          <View
            pointerEvents="box-none"
            style={[styles.tradeBtnWrap, { bottom: insets.bottom + 20 }]}
          >
            <Pressable
              onPress={() => onTrade(card)}
              accessibilityRole="button"
              accessibilityLabel={`Trade 5 ${card.name} for a pack`}
              style={styles.tradeBtn}
            >
              <MaterialIcons name="swap-horiz" size={18} color="#FFF" />
              <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.tradeBtnText}>
                Trade 5 for a pack
              </ThemedText>
            </Pressable>
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
    borderRadius: 14,
    // Let the 3D flip extend past the flat card bounds
    overflow: "visible",
    backgroundColor: "transparent",
  },
  art: {
    borderRadius: 0,
  },
  tradeBtnWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 15,
  },
  tradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: "#62A94F",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  tradeBtnText: {
    fontWeight: "800",
  },
});
