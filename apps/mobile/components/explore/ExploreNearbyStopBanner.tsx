/**
 * Top dropdown banner — "you're close enough to unlock a stop".
 * Parent owns the visible/label timing; tapping it calls `onPress` so the
 * parent can open the stop's collect sheet.
 */
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { FK, FONT } from "@/constants/fieldKit";

type Props = {
  visible: boolean;
  label: string;
  top: number;
  onPress?: () => void;
};

export function ExploreNearbyStopBanner({ visible, label, top, onPress }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: 260,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [visible, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -60 }],
  }));

  return (
    <Animated.View
      pointerEvents={visible && onPress ? "box-none" : "none"}
      style={[styles.wrap, { top }, animatedStyle]}
      accessibilityLiveRegion="polite"
    >
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={onPress ? `${label}. Tap to collect.` : label}
        style={styles.pill}
      >
        <Ionicons name="sparkles" size={18} color={FK.sunbeam} />
        <Text style={styles.label}>{label}</Text>
        {onPress ? <Ionicons name="chevron-forward" size={18} color={FK.sunbeam} /> : null}
      </Pressable>
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
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: FK.forest,
    shadowColor: "#10251B",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  label: {
    fontFamily: FONT.displayBold,
    fontSize: 15,
    color: FK.white,
  },
});
