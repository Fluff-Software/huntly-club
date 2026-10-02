/**
 * Top dropdown banner — "you're close enough to unlock a stop".
 * Parent owns the visible/label timing; tapping it calls `onPress` so the
 * parent can open the stop's collect sheet.
 */
import React, { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
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
  onPress?: () => void;
};

export function ExploreNearbyStopBanner({ visible, label, top, onPress }: Props) {
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
        <MaterialIcons name="vibration" size={18} color="#B8F000" />
        <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.label}>
          {label}
        </ThemedText>
        {onPress ? <MaterialIcons name="chevron-right" size={18} color="#B8F000" /> : null}
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
