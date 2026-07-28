/**
 * Two-sided Explore card with perspective flip.
 * Unlock: starts on the back, auto-spins to the front.
 * Binder detail: drag horizontally to spin.
 */
import React, { useCallback, useEffect } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const CARD_BACK = require("@/assets/images/explore-card-back.png");

type Props = {
  children: React.ReactNode;
  /** Start showing the card back, then auto-flip to the front. */
  autoFlip?: boolean;
  /** Allow horizontal drag to spin the card. */
  interactive?: boolean;
  /** Delay before auto-flip begins (ms). Pack reveal holds longer for suspense. */
  autoFlipDelayMs?: number;
  /** Duration of the back→front spin (ms). */
  autoFlipDurationMs?: number;
  style?: StyleProp<ViewStyle>;
  onFlipComplete?: () => void;
};

export function ExploreCardFlip({
  children,
  autoFlip = false,
  interactive = false,
  autoFlipDelayMs = 480,
  autoFlipDurationMs = 920,
  style,
  onFlipComplete,
}: Props) {
  /** 0 = back facing camera, 180 = front facing camera. */
  const spin = useSharedValue(autoFlip ? 0 : 180);
  const dragStart = useSharedValue(180);

  const lightHaptic = useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  const mediumHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  useEffect(() => {
    if (!autoFlip) {
      spin.value = 180;
      return;
    }
    spin.value = 0;
    const t = setTimeout(() => {
      mediumHaptic();
      spin.value = withTiming(
        180,
        { duration: autoFlipDurationMs, easing: Easing.inOut(Easing.cubic) },
        (finished) => {
          if (finished && onFlipComplete) runOnJS(onFlipComplete)();
        }
      );
    }, autoFlipDelayMs);
    return () => clearTimeout(t);
  }, [autoFlip, autoFlipDelayMs, autoFlipDurationMs, mediumHaptic, onFlipComplete, spin]);

  const pan = Gesture.Pan()
    .enabled(interactive)
    .activeOffsetX([-12, 12])
    .failOffsetY([-28, 28])
    .onBegin(() => {
      dragStart.value = spin.value;
    })
    .onUpdate((e) => {
      spin.value = dragStart.value + e.translationX * 0.45;
    })
    .onEnd((e) => {
      const projected = spin.value + e.velocityX * 0.05;
      const snapped = Math.round(projected / 180) * 180;
      spin.value = withSpring(snapped, { damping: 16, stiffness: 120 });
      if (Math.abs(e.velocityX) > 400) {
        runOnJS(lightHaptic)();
      }
    });

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${spin.value}deg` }],
  }));

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${spin.value + 180}deg` }],
  }));

  const content = (
    <Animated.View style={[styles.stage, style]}>
      <Animated.View pointerEvents="none" style={[styles.face, backStyle]}>
        <Image
          source={CARD_BACK}
          style={styles.backImage}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>

      <Animated.View style={[styles.face, frontStyle]}>{children}</Animated.View>
    </Animated.View>
  );

  if (!interactive) return content;

  return <GestureDetector gesture={pan}>{content}</GestureDetector>;
}

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    height: "100%",
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: "hidden",
    borderRadius: 14,
    overflow: "hidden",
  },
  backImage: {
    width: "100%",
    height: "100%",
  },
});
