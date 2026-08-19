/**
 * "You are here" marker — bigger than the pack-drop bubbles (34px) and
 * pulses continuously so it never gets lost behind a cluster of pins.
 */
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const DOT_COLOR = "#1E88F0";
const PULSE_SIZE = 64;
const DOT_SIZE = 22;

export function ActivityMapUserMarkerView() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - pulse.value),
    transform: [{ scale: 0.3 + pulse.value * 0.7 }],
  }));

  return (
    <View style={styles.wrap} collapsable={false}>
      <Animated.View style={[styles.pulse, pulseStyle]} />
      <View style={styles.dot} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    borderRadius: PULSE_SIZE / 2,
    backgroundColor: DOT_COLOR,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: DOT_COLOR,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
});
