/**
 * Foil-style shine sweep for rare / very_rare cards — a diagonal white light
 * bar that periodically crosses the whole card face, clipped by the card
 * frame's own overflow:hidden. Sized off the card's own measured layout so
 * it always fully exits both edges regardless of card size.
 */
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, type LayoutChangeEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type Intensity = "rare" | "very_rare";

type Props = {
  intensity: Intensity;
};

/** How often a sweep starts, and how long each one takes to cross. */
const SWEEP_CONFIG: Record<Intensity, { periodMs: number; sweepMs: number }> = {
  rare: { periodMs: 6500, sweepMs: 2000 },
  very_rare: { periodMs: 4800, sweepMs: 1800 },
};

const BAR_WIDTH = 130;
const ROTATE_DEG = 22;

export function ExploreCardShineSweep({ intensity }: Props) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const sweep = useSharedValue(0);
  const { periodMs, sweepMs } = SWEEP_CONFIG[intensity];

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  useEffect(() => {
    if (!size) return;
    sweep.value = 0;
    sweep.value = withRepeat(
      withSequence(
        withTiming(1, { duration: sweepMs, easing: Easing.inOut(Easing.cubic) }),
        withDelay(periodMs - sweepMs, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );
    return () => cancelAnimation(sweep);
  }, [sweep, periodMs, sweepMs, size]);

  // Generous overshoot (not exact trig) so the rotated bar always fully
  // clears both edges — harmless since the parent clips with overflow:hidden.
  const overshoot = size ? size.height * 0.6 : 0;
  const travelStart = -(BAR_WIDTH + overshoot);
  const travelEnd = size ? size.width + overshoot : 0;

  const style = useAnimatedStyle(() => ({
    opacity: size && sweep.value > 0 && sweep.value < 1 ? 1 : 0,
    transform: [
      { translateX: travelStart + sweep.value * (travelEnd - travelStart) },
      { rotate: `${ROTATE_DEG}deg` },
    ],
  }));

  return (
    <Animated.View
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
      onLayout={onLayout}
    >
      {size ? (
        <Animated.View
          style={[
            styles.sweepBarWrap,
            { top: -overshoot, bottom: -overshoot, width: BAR_WIDTH },
            style,
          ]}
        >
          <LinearGradient
            colors={[
              "rgba(255,255,255,0)",
              "rgba(255,255,255,0.6)",
              "rgba(255,255,255,0.6)",
              "rgba(255,255,255,0)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sweepBar}
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sweepBarWrap: {
    position: "absolute",
  },
  sweepBar: {
    flex: 1,
  },
});
