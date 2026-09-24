/**
 * Top dropdown banner — "you're close enough to unlock a stop".
 * Purely presentational: parent owns the visible/label timing.
 */
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";

type Props = {
  visible: boolean;
  label: string;
  top: number;
};

export function ExploreNearbyStopBanner({ visible, label, top }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: 260,
      easing: visible ? Easing.out(Easing.back(1.2)) : Easing.in(Easing.cubic),
    });
  }, [visible, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -60 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { top }, animatedStyle]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.pill}>
        <MaterialIcons name="vibration" size={18} color="#B8F000" />
        <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.label}>
          {label}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 20,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(20,24,20,0.92)",
    borderWidth: 1,
    borderColor: "rgba(184,240,0,0.35)",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
});
