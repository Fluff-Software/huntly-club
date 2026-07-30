/**
 * Two-sided Explore card with perspective flip.
 * Unlock: starts on the back, auto-spins to the front.
 * Binder detail: optional entrance twist, then drag / tap to spin.
 */
import React, { useCallback, useEffect } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const CARD_BACK = require("@/assets/images/explore-card-back.png");
const DEFAULT_INNER_BORDER = "#3B82F6";
/** Front-facing rest angle for binder / after flip. */
const FRONT_SPIN = 180;
/** Binder entrance: twist past flat one way, then the other, then settle. */
const TWIST_A = FRONT_SPIN + 14;
const TWIST_B = FRONT_SPIN - 11;

type Props = {
  children: React.ReactNode;
  /** Start showing the card back, then auto-flip to the front. */
  autoFlip?: boolean;
  /** Allow horizontal drag / tap to spin the card. */
  interactive?: boolean;
  /**
   * Binder open: swing the card faces into place (real rotateY on the card).
   * Ignored when autoFlip is on.
   */
  entranceTwist?: boolean;
  /** Delay before auto-flip begins (ms). Pack reveal holds longer for suspense. */
  autoFlipDelayMs?: number;
  /** Duration of the back→front spin (ms). */
  autoFlipDurationMs?: number;
  /** Colour for the card-back inner frame (same place as the old gold line). */
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  onFlipComplete?: () => void;
};

export function ExploreCardFlip({
  children,
  autoFlip = false,
  interactive = false,
  entranceTwist = false,
  autoFlipDelayMs = 480,
  autoFlipDurationMs = 920,
  borderColor = DEFAULT_INNER_BORDER,
  style,
  onFlipComplete,
}: Props) {
  const startSpin = autoFlip ? 0 : FRONT_SPIN;

  /** 0 = back facing camera, 180 = front facing camera. */
  const spin = useSharedValue(startSpin);
  const dragStart = useSharedValue(startSpin);
  const canInteract = useSharedValue(interactive && !autoFlip && !entranceTwist);
  /** Soft scale settle only — never rotateY the stage (shows as black slabs). */
  const entrance = useSharedValue(entranceTwist && !autoFlip ? 0 : 1);

  const lightHaptic = useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  const mediumHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const markInteractive = useCallback(() => {
    canInteract.value = interactive;
  }, [canInteract, interactive]);

  useEffect(() => {
    canInteract.value = interactive && !autoFlip && !entranceTwist;
  }, [autoFlip, canInteract, entranceTwist, interactive]);

  useEffect(() => {
    if (!entranceTwist || autoFlip) {
      entrance.value = 1;
      return;
    }
    entrance.value = 0;
    spin.value = FRONT_SPIN;
    dragStart.value = FRONT_SPIN;
    mediumHaptic();
    entrance.value = withSpring(1, { damping: 16, stiffness: 140, mass: 0.85 });
    // Twist one way → the other → settle flat.
    spin.value = withSequence(
      withTiming(TWIST_A, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(TWIST_B, {
        duration: 340,
        easing: Easing.inOut(Easing.cubic),
      }),
      withSpring(
        FRONT_SPIN,
        { damping: 18, stiffness: 140, mass: 0.85 },
        (finished) => {
          if (finished) {
            dragStart.value = FRONT_SPIN;
            runOnJS(markInteractive)();
          }
        }
      )
    );
  }, [
    autoFlip,
    dragStart,
    entrance,
    entranceTwist,
    markInteractive,
    mediumHaptic,
    spin,
  ]);

  useEffect(() => {
    if (!autoFlip) {
      if (!entranceTwist) spin.value = FRONT_SPIN;
      return;
    }
    spin.value = 0;
    const t = setTimeout(() => {
      mediumHaptic();
      spin.value = withTiming(
        FRONT_SPIN,
        { duration: autoFlipDurationMs, easing: Easing.inOut(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(markInteractive)();
            if (onFlipComplete) runOnJS(onFlipComplete)();
          }
        }
      );
    }, autoFlipDelayMs);
    return () => clearTimeout(t);
  }, [
    autoFlip,
    autoFlipDelayMs,
    autoFlipDurationMs,
    entranceTwist,
    markInteractive,
    mediumHaptic,
    onFlipComplete,
    spin,
  ]);

  const pan = Gesture.Pan()
    .enabled(interactive)
    .activeOffsetX([-12, 12])
    .failOffsetY([-28, 28])
    .onBegin(() => {
      if (!canInteract.value) return;
      dragStart.value = spin.value;
    })
    .onUpdate((e) => {
      if (!canInteract.value) return;
      spin.value = dragStart.value + e.translationX * 0.45;
    })
    .onEnd((e) => {
      if (!canInteract.value) return;
      const projected = spin.value + e.velocityX * 0.05;
      const snapped = Math.round(projected / 180) * 180;
      spin.value = withSpring(snapped, { damping: 16, stiffness: 120 });
      if (Math.abs(e.velocityX) > 400) {
        runOnJS(lightHaptic)();
      }
    });

  const tap = Gesture.Tap()
    .enabled(interactive)
    .onEnd((_e, success) => {
      if (!success || !canInteract.value) return;
      const facingBack = Math.round(spin.value / 180) % 2 === 0;
      const target = facingBack ? spin.value + 180 : spin.value - 180;
      spin.value = withSpring(target, { damping: 16, stiffness: 120 });
      runOnJS(lightHaptic)();
    });

  const gesture = Gesture.Exclusive(pan, tap);

  const stageStyle = useAnimatedStyle(() => {
    const t = entrance.value;
    // Opacity only — avoid scaling during rotateY (causes edge AA fringe).
    return { opacity: 0.88 + 0.12 * t };
  });

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${spin.value}deg` }],
  }));

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${spin.value + 180}deg` }],
  }));

  const content = (
    <Animated.View style={[styles.stage, style, stageStyle]}>
      <Animated.View
        pointerEvents="none"
        shouldRasterizeIOS
        renderToHardwareTextureAndroid
        style={[styles.face, backStyle]}
      >
        <Image
          source={CARD_BACK}
          style={styles.backImage}
          resizeMode="cover"
          fadeDuration={0}
          accessibilityIgnoresInvertColors
        />
        {/* Thin rarity frame — sits where the gold line used to be in the PNG. */}
        <View style={[styles.backInnerBorder, { borderColor }]} />
      </Animated.View>

      <Animated.View
        shouldRasterizeIOS
        renderToHardwareTextureAndroid
        style={[styles.face, frontStyle]}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );

  if (!interactive) return content;

  return <GestureDetector gesture={gesture}>{content}</GestureDetector>;
}

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
    // Don’t clip — perspective rotateY grows past the flat bounds mid-spin.
    overflow: "visible",
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: "hidden",
    borderRadius: 14,
    overflow: "hidden",
    // Opaque fill under rasterized faces — reduces transparent-edge AA during spin.
    backgroundColor: "#1A2E20",
  },
  backImage: {
    width: "100%",
    height: "100%",
  },
  /** Matches the old gold rim inset on explore-card-back.png (~18–20px @ 682×1024). */
  backInnerBorder: {
    position: "absolute",
    top: "1.85%",
    right: "2.8%",
    bottom: "1.85%",
    left: "2.8%",
    borderWidth: 1,
    borderRadius: 10,
    opacity: 0.5,
  },
});
