/**
 * Binder sleeve pocket — full card face scaled to fit the cell; light plastic sheen.
 * On pull-out the card slides up while the sleeve film stays fixed over the pocket.
 */
import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { ExploreCardArt } from "@/components/explore/ExploreCardArt";
import {
  EXPLORE_BINDER_POCKET_BG,
  EXPLORE_CARD_ART_ASPECT,
  EXPLORE_RARITY_COLORS,
} from "@/constants/exploreBinder";
import {
  binderPocketAccessibilityLabel,
  type BinderCardEntry,
} from "@/utils/exploreBinder";

/** Layout at full face size, then scaled down into the pocket. */
const CARD_DESIGN_WIDTH = 280;
const CARD_DESIGN_HEIGHT = CARD_DESIGN_WIDTH / EXPLORE_CARD_ART_ASPECT;

const PULL_TRAVEL = 22;
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

function SleeveFilm({ width, height }: { width: number; height: number }) {
  return (
    <View pointerEvents="none" style={[styles.sleeveFilm, { width, height }]}>
      <View style={styles.plasticTint} />
      <LinearGradient
        colors={[
          "transparent",
          "rgba(255,255,255,0.42)",
          "rgba(255,255,255,0.16)",
          "transparent",
        ]}
        locations={[0.12, 0.38, 0.5, 0.78]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sheenBand}
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.45)", "rgba(255,255,255,0.08)", "transparent"]}
        locations={[0, 0.35, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.65, y: 0.4 }}
        style={styles.cornerGloss}
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.22)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.sleeveMouth}
      />
    </View>
  );
}

export function BinderCardPocket({
  card,
  width,
  height,
  highlighted,
  isPulled = false,
  onPress,
}: Props) {
  const pull = useSharedValue(isPulled ? 1 : 0);
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

  const innerW = Math.max(0, width - 4);
  const innerH = Math.max(0, height - 4);
  const scale = innerW > 0 ? innerW / CARD_DESIGN_WIDTH : 0;

  if (width <= 0 || height <= 0) {
    return <View style={styles.pocket} />;
  }

  if (!card) {
    return (
      <View style={styles.pocket}>
        <View style={[styles.well, { width, height }]}>
          <View style={[styles.emptySlot, { width: innerW, height: innerH }]} />
          <View style={styles.sleeveRim} pointerEvents="none" />
        </View>
      </View>
    );
  }

  const collected =
    card.collected === true ||
    Number(card.count) > 0 ||
    Boolean(card.firstCollectedAt);
  const rarityColor = EXPLORE_RARITY_COLORS[card.rarity] ?? "#3B82F6";
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
      style={({ pressed }) => [
        styles.pocket,
        highlighted && styles.highlighted,
        pressed && !isPulled && { opacity: 0.92 },
      ]}
    >
      <View style={[styles.well, { width, height }]}>
        <Animated.View style={[styles.pullWrap, { width: innerW, height: innerH }, cardStyle]}>
          <View style={[styles.artWrap, { width: innerW, height: innerH }]}>
            {scale > 0 ? (
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
              <View style={[styles.dupBadge, { backgroundColor: rarityColor }]}>
                <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.dupText}>
                  ×{card.count}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </Animated.View>

        <SleeveFilm width={innerW} height={innerH} />
        <View style={styles.sleeveRim} pointerEvents="none" />
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
  highlighted: {
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFE08A",
  },
  well: {
    borderRadius: 5,
    backgroundColor: EXPLORE_BINDER_POCKET_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
    padding: 2,
    overflow: "visible",
  },
  emptySlot: {
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  pullWrap: {
    overflow: "visible",
  },
  artWrap: {
    position: "relative",
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "#121214",
  },
  scaledCard: {
    position: "absolute",
    width: CARD_DESIGN_WIDTH,
    height: CARD_DESIGN_HEIGHT,
  },
  sleeveFilm: {
    position: "absolute",
    top: 2,
    left: 2,
    borderRadius: 3,
    overflow: "hidden",
    zIndex: 4,
  },
  plasticTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(210, 225, 240, 0.1)",
  },
  sheenBand: {
    ...StyleSheet.absoluteFillObject,
  },
  cornerGloss: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "75%",
    height: "50%",
  },
  sleeveMouth: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 10,
  },
  sleeveRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 5,
    borderWidth: 1,
    borderTopColor: "rgba(255,255,255,0.32)",
    borderLeftColor: "rgba(255,255,255,0.22)",
    borderRightColor: "rgba(0,0,0,0.25)",
    borderBottomColor: "rgba(0,0,0,0.3)",
    zIndex: 5,
  },
  dupBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1.5,
    borderColor: "#FFF",
    zIndex: 5,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  dupText: { fontSize: 13, fontWeight: "900" },
});
