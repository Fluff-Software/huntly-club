/**
 * Binder pocket: the full card face scaled to fit a soft paper-coloured slot.
 * On tap the card lifts out of its pocket before the detail view opens.
 */
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ExploreCardArt } from "@/components/explore/ExploreCardArt";
import { EXPLORE_CARD_ART_ASPECT } from "@/constants/exploreBinder";
import { FK, FONT } from "@/constants/fieldKit";
import {
  binderPocketAccessibilityLabel,
  type BinderCardEntry,
} from "@/utils/exploreBinder";

/** Layout at full face size, then scaled down into the pocket. */
const CARD_DESIGN_WIDTH = 280;
const CARD_DESIGN_HEIGHT = CARD_DESIGN_WIDTH / EXPLORE_CARD_ART_ASPECT;

const PULL_TRAVEL = 18;
const POCKET_PAD = 3;
const PULL_DURATION_MS = 200;

export function fitBinderCardSize(maxW: number, maxH: number): { w: number; h: number } {
  if (maxW <= 0 || maxH <= 0) return { w: 0, h: 0 };
  let w = maxW;
  let h = w / EXPLORE_CARD_ART_ASPECT;
  if (h > maxH) {
    h = maxH;
    w = h * EXPLORE_CARD_ART_ASPECT;
  }
  return { w, h };
}

type Props = {
  card: BinderCardEntry | null;
  /** Precomputed fit size from the page grid (avoids flex/onLayout collapse). */
  width: number;
  height: number;
  highlighted?: boolean;
  /** Keep elevated while detail is open; do not drive the open animation. */
  isPulled?: boolean;
  onPress: () => void;
};

export function BinderCardPocket({
  card,
  width,
  height,
  highlighted,
  isPulled = false,
  onPress,
}: Props) {
  const pull = useSharedValue(isPulled ? 1 : 0);
  const [pressed, setPressed] = useState(false);
  const busy = useSharedValue(false);

  // Retract when detail closes; snap up only for external pulls (e.g. highlight deep-link).
  useEffect(() => {
    if (isPulled) {
      if (pull.value < 0.95) {
        pull.value = withTiming(1, {
          duration: PULL_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        });
      }
      return;
    }
    busy.value = false;
    pull.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [isPulled, pull, busy]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -pull.value * PULL_TRAVEL },
      { scale: 1 + pull.value * 0.015 },
    ],
    zIndex: pull.value > 0.05 ? 3 : 2,
    elevation: pull.value > 0.05 ? 8 : 2,
  }));

  const innerW = Math.max(0, width - POCKET_PAD * 2);
  const innerH = Math.max(0, height - POCKET_PAD * 2);
  const scale = innerW > 0 ? innerW / CARD_DESIGN_WIDTH : 0;

  if (width <= 0 || height <= 0) {
    return <View style={styles.pocket} />;
  }

  if (!card) {
    return (
      <View style={styles.pocket}>
        <View style={[styles.well, { width, height }]}>
          <View style={[styles.emptySlot, { width: innerW, height: innerH }]} />
        </View>
      </View>
    );
  }

  const collected =
    card.collected === true ||
    Number(card.count) > 0 ||
    Boolean(card.firstCollectedAt);
  const showCount = collected && card.count > 1;

  function finishOpen() {
    busy.value = false;
    onPress();
  }

  function handlePress() {
    if (busy.value) return;
    if (isPulled) {
      onPress();
      return;
    }
    busy.value = true;
    pull.value = withTiming(
      1,
      { duration: PULL_DURATION_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(finishOpen)();
        } else {
          busy.value = false;
        }
      }
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={binderPocketAccessibilityLabel({
        ...card,
        collected,
        count: Math.max(card.count, collected ? 1 : 0),
      })}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      // Static style array: NativeWind's Pressable interop drops function styles.
      style={[styles.pocket, pressed && !isPulled ? styles.pressed : null]}
    >
      <View style={[styles.well, highlighted && styles.highlighted, { width, height }]}>
        <Animated.View style={[styles.pullWrap, { width: innerW, height: innerH }, cardStyle]}>
          <View style={[styles.artWrap, !collected && styles.artWrapLocked, { width: innerW, height: innerH }]}>
            {!collected ? (
              // Not found yet: a quiet placeholder, so the page reads as "what's left to find"
              // rather than a wall of dark locked cards.
              <View style={styles.locked} pointerEvents="none">
                <Text style={styles.lockedMark}>?</Text>
                <View
                  style={[
                    styles.rarityDot,
                    { backgroundColor: FK.rarity[card.rarity as keyof typeof FK.rarity] ?? FK.muted },
                  ]}
                />
              </View>
            ) : scale > 0 ? (
              <View
                style={[
                  styles.scaledCard,
                  {
                    left: (innerW - CARD_DESIGN_WIDTH) / 2,
                    top: (innerH - CARD_DESIGN_HEIGHT) / 2,
                    transform: [{ scale }],
                  },
                ]}
                pointerEvents="none"
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
                />
              </View>
            ) : null}

            {showCount ? (
              <View style={styles.dupBadge}>
                <Text style={styles.dupText}>×{card.count}</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pocket: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.9 },
  well: {
    borderRadius: 12,
    backgroundColor: "#E4E9DC",
    padding: POCKET_PAD,
    overflow: "visible",
  },
  highlighted: {
    backgroundColor: FK.sunbeam,
  },
  emptySlot: {
    borderRadius: 9,
    backgroundColor: "#D6DDCC",
  },
  pullWrap: {
    overflow: "visible",
  },
  artWrap: {
    position: "relative",
    borderRadius: 9,
    overflow: "hidden",
    backgroundColor: FK.forest,
  },
  artWrapLocked: { backgroundColor: "#D6DDCC" },
  locked: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  lockedMark: { fontFamily: FONT.display, fontSize: 34, color: "#A7B39C" },
  rarityDot: { width: 8, height: 8, borderRadius: 4, opacity: 0.7 },
  scaledCard: {
    position: "absolute",
    width: CARD_DESIGN_WIDTH,
    height: CARD_DESIGN_HEIGHT,
  },
  dupBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: FK.ink,
    zIndex: 5,
  },
  dupText: { fontFamily: FONT.display, fontSize: 14, lineHeight: 18, color: FK.white },
});
