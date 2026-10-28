/**
 * Light falling-snow overlay for the Explore map. Purely decorative: ignores touches.
 */
import React, { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const FLAKE_COUNT = 70;
/** Text-presentation selector (\uFE0E) keeps these as white glyphs, not blue emoji. */
const GLYPHS = ["\u2744\uFE0E", "\u2745\uFE0E", "\u2746\uFE0E"];

type Flake = {
  x: number;
  size: number;
  glyph: string;
  opacity: number;
  fallMs: number;
  delayMs: number;
  sway: number;
};

function Snowflake({ flake, height }: { flake: Flake; height: number }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      flake.delayMs,
      withRepeat(withTiming(1, { duration: flake.fallMs, easing: Easing.linear }), -1, false)
    );
    return () => cancelAnimation(progress);
  }, [flake, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -20 + progress.value * (height + 40) },
      { translateX: Math.sin(progress.value * Math.PI * 4) * flake.sway },
    ],
  }));

  return (
    <Animated.Text
      style={[
        styles.flake,
        { left: flake.x, fontSize: flake.size, opacity: flake.opacity },
        style,
      ]}
    >
      {flake.glyph}
    </Animated.Text>
  );
}

export function ExploreSnowfall() {
  const { width, height } = useWindowDimensions();

  const flakes = useMemo<Flake[]>(
    () =>
      Array.from({ length: FLAKE_COUNT }, () => ({
        x: Math.random() * width,
        size: 10 + Math.random() * 16,
        glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!,
        opacity: 0.7 + Math.random() * 0.3,
        fallMs: 6000 + Math.random() * 8000,
        delayMs: Math.random() * 8000,
        sway: 8 + Math.random() * 16,
      })),
    [width]
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flakes.map((flake, i) => (
        <Snowflake key={i} flake={flake} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flake: {
    position: "absolute",
    top: 0,
    color: "#FFFFFF",
    // Soft blue halo so flakes still read against light map tiles.
    textShadowColor: "rgba(59,110,168,0.85)",
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 0 },
  },
});
