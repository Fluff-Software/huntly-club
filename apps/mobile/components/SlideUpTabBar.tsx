import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export type SlideUpTabBarProps = BottomTabBarProps & {
  onboardingActive: boolean;
  /** How far off-screen the bar starts (match tab bar outer height) */
  tabBarSlideDistance: number;
};

/**
 * Slides the tab bar up from below the screen. Tab bar uses `position: 'absolute'` in
 * `tabBarStyle` so no bottom “slot” is reserved — only the real bar paints color, not a strip
 * while animating.
 */
export function SlideUpTabBar({
  onboardingActive,
  tabBarSlideDistance,
  ...tabBarProps
}: SlideUpTabBarProps) {
  const translateY = useSharedValue(tabBarSlideDistance);

  useEffect(() => {
    if (onboardingActive) {
      translateY.value = tabBarSlideDistance;
      return;
    }
    translateY.value = tabBarSlideDistance;
    translateY.value = withTiming(0, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [onboardingActive, tabBarSlideDistance]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (onboardingActive) {
    return null;
  }

  return (
    <Animated.View style={[styles.wrap, animatedStyle]} pointerEvents="box-none">
      <BottomTabBar {...tabBarProps} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    backgroundColor: "transparent",
  },
});
