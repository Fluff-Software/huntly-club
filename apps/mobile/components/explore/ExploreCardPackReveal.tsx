/**
 * Explore pack: one full-pack image, top strip clipped off at the perforation
 * and peeled away on swipe → claim → reveal.
 * Closing before a successful rip does not collect.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { setStatusBarStyle } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ExploreCardArt } from "@/components/explore/ExploreCardArt";
import { ExploreCardFlip } from "@/components/explore/ExploreCardFlip";
import {
  ExplorePackTear,
  packTearStyles,
} from "@/components/explore/ExplorePackTear";
import { EXPLORE_CARD_ART_ASPECT, EXPLORE_RARITY_COLORS } from "@/constants/exploreBinder";
import { hapticImpact, hapticNotification } from "@/utils/haptics";
import type { ExploreAward } from "@/types/exploreStops";

/** Native pixel size of explore-pack-full.png */
const PACK_NATIVE_W = 501;
const PACK_NATIVE_H = 1024;
/** Cut just below the “SWIPE HERE” perforation. */
const PACK_SPLIT_Y = 74;
const PACK_SPLIT_RATIO = PACK_SPLIT_Y / PACK_NATIVE_H;

function rarityRevealProfile(rarity: string): {
  auraPeak: number;
  auraIn: number;
  auraOut: number;
  cardY: number;
  springDamping: number;
  springStiffness: number;
  hapticBeats: number;
  hapticStyle: Haptics.ImpactFeedbackStyle;
  /** Hold on the card back before flipping to the front. */
  flipHoldMs: number;
  /** Duration of the back→front spin (ms). */
  flipSpinMs: number;
} {
  switch (rarity) {
    case "very_rare":
      return {
        auraPeak: 0.32,
        auraIn: 260,
        auraOut: 720,
        cardY: 150,
        springDamping: 16,
        springStiffness: 140,
        hapticBeats: 3,
        hapticStyle: Haptics.ImpactFeedbackStyle.Heavy,
        flipHoldMs: 3400,
        flipSpinMs: 920,
      };
    case "rare":
      return {
        auraPeak: 0.26,
        auraIn: 220,
        auraOut: 540,
        cardY: 135,
        springDamping: 17,
        springStiffness: 160,
        hapticBeats: 2,
        hapticStyle: Haptics.ImpactFeedbackStyle.Medium,
        flipHoldMs: 2600,
        flipSpinMs: 820,
      };
    case "uncommon":
      return {
        auraPeak: 0.22,
        auraIn: 190,
        auraOut: 460,
        cardY: 125,
        springDamping: 18,
        springStiffness: 180,
        hapticBeats: 1,
        hapticStyle: Haptics.ImpactFeedbackStyle.Medium,
        flipHoldMs: 1400,
        flipSpinMs: 700,
      };
    default:
      return {
        auraPeak: 0.18,
        auraIn: 160,
        auraOut: 380,
        cardY: 120,
        springDamping: 19,
        springStiffness: 200,
        hapticBeats: 1,
        hapticStyle: Haptics.ImpactFeedbackStyle.Light,
        flipHoldMs: 900,
        flipSpinMs: 600,
      };
  }
}

/** Torn pack foil fade — kept short & rarity-independent so the pack never hangs around. */
const FOIL_FADE_MS = 260;
const PACK_UNMOUNT_MS = 300;

type Phase = "enter" | "ready" | "ripping" | "claiming" | "reveal" | "error";

type Props = {
  visible: boolean;
  onRipComplete: () => Promise<ExploreAward>;
  onClose: () => void;
  onViewBinder: (award: ExploreAward) => void;
};

/** Horizontal swipe across the top strip to finish the tear. */
const RIP_THRESHOLD = 200;
const ACCENT = "#B8F000";

/** Soft gold for NEW discovery badge (not brand lime). */
const NEW_GOLD = "#E4C56A";
const NEW_GOLD_SOFT = "#F3E2A8";

/**
 * Isolated from ExploreCardPackReveal's own re-renders (e.g. the
 * "NEW DISCOVERY" badge toggling showNewBadge well after these buttons
 * first mount) — an unrelated state update forcing every ThemedText in the
 * tree to re-reconcile at once has been linked to a word silently going
 * missing on this exact button (intermittent, cross-platform). Memoizing
 * means this subtree only re-renders when something it actually uses
 * changes.
 */
const RevealActions = React.memo(function RevealActions({
  award,
  rarityColor,
  bottomInset,
  onViewBinder,
  onDismiss,
}: {
  award: ExploreAward;
  rarityColor: string;
  bottomInset: number;
  onViewBinder: (award: ExploreAward) => void;
  onDismiss: () => void;
}) {
  return (
    <View
      style={[styles.revealActions, { paddingBottom: bottomInset + 24 }]}
      pointerEvents="box-none"
    >
      <View style={styles.actions}>
        <Pressable
          onPress={() => onViewBinder(award)}
          style={[styles.primaryBtn, { backgroundColor: rarityColor }]}
          accessibilityRole="button"
        >
          <ThemedText
            key={award.card.id}
            lightColor="#FFF"
            darkColor="#FFF"
            style={styles.btnText}
            numberOfLines={1}
          >
            View in binder
          </ThemedText>
        </Pressable>
        <Pressable onPress={onDismiss} style={styles.secondaryBtn} accessibilityRole="button">
          <ThemedText
            key={award.card.id}
            lightColor="#FFF"
            darkColor="#FFF"
            style={styles.btnText}
            numberOfLines={1}
          >
            Keep exploring
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
});

export function ExploreCardPackReveal({
  visible,
  onRipComplete,
  onClose,
  onViewBinder,
}: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("enter");
  const [award, setAward] = useState<ExploreAward | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  /** Unmount pack foil before award UI so it can’t flash over the card. */
  const [packMounted, setPackMounted] = useState(true);
  /** Show “NEW CARD!” once the face is revealed (new finds only). */
  const [showNewBadge, setShowNewBadge] = useState(false);
  /** Only start the shine sweep once the card has actually spun into view —
   * mounting it earlier (while the back face is showing) would leave it
   * mid-cycle by the time the front becomes visible. */
  const [shineReady, setShineReady] = useState(false);
  const claimStartedRef = useRef(false);
  const awardRef = useRef<ExploreAward | null>(null);

  awardRef.current = award;

  const packW = Math.min(screenW * 0.72, 280);
  const packH = packW * (PACK_NATIVE_H / PACK_NATIVE_W);
  const topH = packH * PACK_SPLIT_RATIO;

  const rarityColor = award
    ? EXPLORE_RARITY_COLORS[award.card.rarity] ?? "#3B82F6"
    : ACCENT;
  const revealProfile = award
    ? rarityRevealProfile(award.card.rarity)
    : rarityRevealProfile("common");

  const packScale = useSharedValue(0.4);
  const packOpacity = useSharedValue(0);
  const idleBob = useSharedValue(0);
  /** 0 = sealed, 1 = pack torn open. */
  const openProgress = useSharedValue(0);
  /** Pack foil fade — drop after the card has started sliding up. */
  const foilOpacity = useSharedValue(1);
  /** Card starts tucked behind the pack, then slides up into view. */
  const cardOpacity = useSharedValue(0);
  const cardY = useSharedValue(120);
  const cardScale = useSharedValue(0.92);
  const newBadgeOpacity = useSharedValue(0);
  const newBadgeScale = useSharedValue(0.82);
  const ripTick = useSharedValue(0);
  /** UI-thread timestamp gate so we don't even attempt runOnJS faster than
   * the throttle allows — on a 120Hz device onUpdate can fire twice as
   * often as 60Hz, and queuing runOnJS calls we know we'll immediately
   * throttle away still floods the bridge / native vibration queue. */
  const lastTickAtMs = useSharedValue(0);

  const reset = useCallback(() => {
    cancelAnimation(idleBob);
    packScale.value = 0.4;
    packOpacity.value = 0;
    idleBob.value = 0;
    openProgress.value = 0;
    foilOpacity.value = 1;
    cardOpacity.value = 0;
    cardY.value = 120;
    cardScale.value = 0.92;
    newBadgeOpacity.value = 0;
    newBadgeScale.value = 0.82;
    ripTick.value = 0;
    claimStartedRef.current = false;
    setAward(null);
    setClaimError(null);
    setPackMounted(true);
    setShowNewBadge(false);
    setShineReady(false);
    setPhase("enter");
  }, [
    packScale,
    packOpacity,
    idleBob,
    openProgress,
    foilOpacity,
    cardOpacity,
    cardY,
    cardScale,
    newBadgeOpacity,
    newBadgeScale,
    ripTick,
  ]);

  // Android's Modal presents in its own window and can reset the system
  // status bar style set by the screen underneath — re-assert light icons
  // so the clock/battery stay readable against the pack's dark background.
  // Keyed on phase too: the reveal transition alone has been observed to
  // reset it again on Android, and the original visible-only effect never
  // re-fires to fix that.
  useEffect(() => {
    if (!visible) return;
    setStatusBarStyle("light");
  }, [visible, phase]);

  useEffect(() => {
    if (!visible) {
      reset();
      return;
    }
    setPhase("enter");
    packOpacity.value = withTiming(1, { duration: 220 });
    packScale.value = withSpring(1, { damping: 16, stiffness: 160 });
    // Don't wait for the spring to fully settle — allow rip almost immediately.
    const readyTimer = setTimeout(() => setPhase("ready"), 220);
    idleBob.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(-3, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    return () => clearTimeout(readyTimer);
  }, [visible, reset, packOpacity, packScale, idleBob]);

  const playReveal = useCallback(
    (nextAward: ExploreAward) => {
      setAward(nextAward);
      setPhase("reveal");
      setShowNewBadge(false);
      setShineReady(false);
      newBadgeOpacity.value = 0;
      newBadgeScale.value = 0.82;

      const profile = rarityRevealProfile(nextAward.card.rarity);
      cardY.value = profile.cardY;

      // Slide the real card up from behind the pack.
      cardOpacity.value = withTiming(1, { duration: 220 });
      cardY.value = withSpring(0, {
        damping: profile.springDamping,
        stiffness: profile.springStiffness,
      });
      cardScale.value = withSpring(1, {
        damping: profile.springDamping,
        stiffness: profile.springStiffness + 10,
      });

      // Pack stays so the torn top sits above the rising card, then foil clears.
      // Kept short & the same for every rarity so the empty pack never lingers.
      foilOpacity.value = withTiming(0, {
        duration: FOIL_FADE_MS,
        easing: Easing.in(Easing.cubic),
      });
      setTimeout(() => setPackMounted(false), PACK_UNMOUNT_MS);

      void hapticNotification(Haptics.NotificationFeedbackType.Success);
      void (async () => {
        for (let i = 0; i < profile.hapticBeats; i++) {
          await hapticImpact(profile.hapticStyle);
          await new Promise((r) => setTimeout(r, 90));
        }
      })();
    },
    [cardOpacity, cardY, cardScale, foilOpacity, newBadgeOpacity, newBadgeScale]
  );

  const onCardFlipComplete = useCallback(() => {
    // Any rarity worth shining gets it, new find or not.
    setShineReady(true);
    if (awardRef.current?.isNew !== true) return;
    setShowNewBadge(true);
    newBadgeOpacity.value = withTiming(1, { duration: 240 });
    newBadgeScale.value = withSpring(1, { damping: 11, stiffness: 170 });
    void hapticNotification(Haptics.NotificationFeedbackType.Success);
  }, [newBadgeOpacity, newBadgeScale]);

  const finishRipAndClaim = useCallback(async () => {
    if (claimStartedRef.current) return;
    claimStartedRef.current = true;
    setPhase("claiming");
    cancelAnimation(idleBob);
    idleBob.value = 0;

    // Finish the tear; keep the pack mounted so the card can rise behind it.
    openProgress.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    void hapticNotification(Haptics.NotificationFeedbackType.Success);

    try {
      const nextAward = await onRipComplete();
      playReveal(nextAward);
    } catch (err: unknown) {
      setClaimError(
        err instanceof Error ? err.message : "Couldn’t collect this card. Please try again."
      );
      setPhase("error");
      setPackMounted(false);
    }
  }, [idleBob, openProgress, onRipComplete, playReveal]);

  const retryClaim = useCallback(async () => {
    setClaimError(null);
    setPhase("claiming");
    try {
      const nextAward = await onRipComplete();
      playReveal(nextAward);
    } catch (err: unknown) {
      setClaimError(
        err instanceof Error ? err.message : "Couldn’t collect this card. Please try again."
      );
      setPhase("error");
    }
  }, [onRipComplete, playReveal]);

  // iOS's Taptic Engine queues distinct impactAsync calls properly even in
  // fast succession and Medium reads as weak on it, so iOS gets Heavy,
  // tightly-spaced ticks for a real "zip" feel. Android instead goes through
  // performAndroidHapticsAsync (semantic View.performHapticFeedback()
  // constants, not the raw Vibrator API impactAsync uses under the hood on
  // Android -- Vibrator calls are known to be dropped entirely on some
  // devices). Medium + wide spacing is what's confirmed working on Android;
  // tightening it back up would reintroduce the dropped-tick bug seen there
  // pre-migration.
  const isIOS = Platform.OS === "ios";
  const TICK_HAPTIC_STYLE = isIOS
    ? Haptics.ImpactFeedbackStyle.Heavy
    : Haptics.ImpactFeedbackStyle.Medium;
  const TICK_MIN_INTERVAL_MS = isIOS ? 45 : 140;
  const RIP_TICK_STEP = isIOS ? 0.06 : 0.18;

  const selectionHaptic = useCallback(() => {
    void hapticImpact(TICK_HAPTIC_STYLE, Haptics.AndroidHaptics.Gesture_Start);
  }, [TICK_HAPTIC_STYLE]);
  const mediumRipHaptic = useCallback(() => {
    void hapticImpact(
      isIOS ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium,
      Haptics.AndroidHaptics.Confirm
    );
  }, [isIOS]);

  const zipperTickHaptic = useCallback(() => {
    void hapticImpact(TICK_HAPTIC_STYLE, Haptics.AndroidHaptics.Segment_Frequent_Tick);
  }, [TICK_HAPTIC_STYLE]);

  // Stays true across enter -> ready -> ripping (onBegin flips phase to
  // "ripping" mid-touch). Using raw `phase` as the memo dep below would
  // recreate the whole Gesture.Pan() the instant a drag starts — handing
  // GestureDetector a brand-new config while the finger is still down,
  // which can silently drop onUpdate for the rest of that touch on
  // Android. This stays referentially the same through the whole drag.
  const canRip = phase === "enter" || phase === "ready" || phase === "ripping";

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(canRip)
        .activeOffsetX([-8, 8])
        .failOffsetY([-48, 48])
        .onBegin(() => {
          ripTick.value = 0;
          runOnJS(setPhase)("ripping");
          runOnJS(selectionHaptic)();
        })
        .onUpdate((e) => {
          // Prefer L→R so the tear advances with the finger across the seal.
          const fromX = Math.max(0, e.translationX / RIP_THRESHOLD);
          const fromY = Math.max(0, -e.translationY / (RIP_THRESHOLD * 1.2));
          const progress = Math.min(1, Math.max(fromX, fromY * 0.45));
          openProgress.value = progress;
          const tickIndex = Math.floor(progress / RIP_TICK_STEP);
          if (tickIndex > ripTick.value) {
            ripTick.value = tickIndex;
            // Gate here, on the UI thread, so we don't queue a runOnJS call
            // at all when we know it'd be within the throttle window —
            // stops the bridge/native vibration queue from ever backing up.
            const now = Date.now();
            if (now - lastTickAtMs.value >= TICK_MIN_INTERVAL_MS) {
              lastTickAtMs.value = now;
              runOnJS(zipperTickHaptic)();
            }
          }
        })
        .onEnd((e) => {
          const fromX = Math.max(0, e.translationX / RIP_THRESHOLD);
          const fromY = Math.max(0, -e.translationY / (RIP_THRESHOLD * 1.2));
          const progress = Math.min(1, Math.max(fromX, fromY * 0.45));
          const fling = e.velocityX > 700 || e.velocityY < -900;
          if (progress >= 0.72 || fling) {
            runOnJS(mediumRipHaptic)();
            runOnJS(finishRipAndClaim)();
          } else {
            openProgress.value = withSpring(0, { damping: 16, stiffness: 180 });
            ripTick.value = 0;
            runOnJS(setPhase)("ready");
          }
        }),
    [
      canRip,
      openProgress,
      finishRipAndClaim,
      selectionHaptic,
      zipperTickHaptic,
      mediumRipHaptic,
      ripTick,
      lastTickAtMs,
      TICK_MIN_INTERVAL_MS,
    ]
  );

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const packStyle = useAnimatedStyle(() => ({
    opacity: packOpacity.value * foilOpacity.value,
    transform: [
      { perspective: 900 },
      { translateY: idleBob.value },
      { scale: packScale.value },
    ],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    // Final settle sits a bit high so the cluster reads centered above the buttons.
    transform: [
      { translateY: cardY.value - 28 },
      { scale: cardScale.value },
    ],
  }));

  const newBadgeStyle = useAnimatedStyle(() => ({
    opacity: newBadgeOpacity.value,
    transform: [{ scale: newBadgeScale.value }],
  }));

  const cardWidth = Math.min(screenW * 0.82, 300);
  const cardHeight = Math.min(
    screenH * 0.52,
    (cardWidth / EXPLORE_CARD_ART_ASPECT) * 0.98
  );
  const canCloseWithoutClaim =
    phase === "enter" || phase === "ready" || phase === "ripping" || phase === "error";

  // Keep pack on screen if very tall
  const maxPackH = screenH * 0.62;
  const packScaleFit = packH > maxPackH ? maxPackH / packH : 1;
  const displayW = packW * packScaleFit;
  const displayH = packH * packScaleFit;
  const displayTopH = topH * packScaleFit;

  const showPack =
    packMounted &&
    phase !== "error" &&
    (phase === "enter" ||
      phase === "ready" ||
      phase === "ripping" ||
      phase === "claiming" ||
      phase === "reveal");

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.dim} />

        <View
          style={[
            styles.stage,
            phase === "reveal"
              ? {
                  paddingTop: insets.top + 12,
                  // Leave room for the two action buttons under the card.
                  paddingBottom: insets.bottom + 156,
                }
              : null,
          ]}
          pointerEvents="box-none"
        >

          {/* Card sits BEHIND the pack and slides up after the rip. */}
          {phase === "reveal" && award ? (
            <Animated.View style={[styles.risingCard, cardStyle]}>
              {award.isNew ? (
                showNewBadge ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.newBadge, newBadgeStyle]}
                    accessibilityRole="text"
                    accessibilityLabel="New card"
                  >
                    <View style={styles.newBadgeGlow} />
                    <View style={styles.newBadgeInner}>
                      <View style={styles.newBadgeRule} />
                      <ThemedText
                        lightColor={NEW_GOLD_SOFT}
                        darkColor={NEW_GOLD_SOFT}
                        style={styles.newBadgeLabel}
                      >
                        NEW DISCOVERY
                      </ThemedText>
                      <View style={styles.newBadgeRule} />
                    </View>
                  </Animated.View>
                ) : (
                  <View style={styles.newBadgeSpacer} />
                )
              ) : null}
              <View style={[styles.revealCard, { width: cardWidth, height: cardHeight }]}>
                <ExploreCardFlip
                  autoFlip
                  interactive
                  borderColor={rarityColor}
                  autoFlipDelayMs={revealProfile.flipHoldMs}
                  autoFlipDurationMs={revealProfile.flipSpinMs}
                  key={award.card.id}
                  onFlipComplete={onCardFlipComplete}
                >
                  <ExploreCardArt
                    imageUrl={award.card.imageUrl}
                    name={award.card.name}
                    rarity={award.card.rarity}
                    description={award.card.description}
                    category={award.card.category}
                    habitatWeights={award.card.habitatWeights}
                    count={award.count}
                    firstCollectedAt={award.isNew ? new Date().toISOString() : null}
                    lastCollectedAt={new Date().toISOString()}
                    collected
                    enableShine={shineReady}
                    style={styles.revealArt}
                  />
                </ExploreCardFlip>
              </View>
            </Animated.View>
          ) : null}

          {showPack ? (
            <Animated.View
              style={[
                styles.packWrap,
                { width: displayW, height: displayH },
                packStyle,
              ]}
            >
              <ExplorePackTear
                width={displayW}
                height={displayH}
                splitY={displayTopH}
                openProgress={openProgress}
                foilOpacity={foilOpacity}
              />

              {/* Transparent hit target over the SWIPE HERE strip */}
              {(phase === "enter" || phase === "ready" || phase === "ripping") && (
                <GestureDetector gesture={pan}>
                  <Animated.View
                    style={[
                      packTearStyles.hitArea,
                      { width: displayW, height: displayTopH + 28 },
                    ]}
                    accessibilityLabel="Swipe to rip open the pack"
                  />
                </GestureDetector>
              )}
            </Animated.View>
          ) : null}
        </View>

        {/* The pack is unmounted once a claim fails, so a retry needs its own spinner. */}
        {phase === "claiming" && !packMounted ? (
          <View style={[styles.errorStage, { paddingBottom: insets.bottom + 24 }]}>
            <ActivityIndicator color="#FFF" />
            <ThemedText
              lightColor="rgba(255,255,255,0.8)"
              darkColor="rgba(255,255,255,0.8)"
              style={styles.errorText}
            >
              Collecting your card…
            </ThemedText>
          </View>
        ) : null}

        {phase === "error" ? (
          <View style={[styles.errorStage, { paddingBottom: insets.bottom + 24 }]}>
            <ThemedText lightColor="#FFD8D8" darkColor="#FFD8D8" style={styles.errorText}>
              {claimError ?? "Couldn’t collect this card."}
            </ThemedText>
            <Pressable
              onPress={() => void retryClaim()}
              style={[styles.errorPrimaryBtn, { backgroundColor: rarityColor }]}
              accessibilityRole="button"
            >
              <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.btnText}>
                Try again
              </ThemedText>
            </Pressable>
            <Pressable onPress={handleDismiss} style={styles.secondaryBtn} accessibilityRole="button">
              <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.btnText}>
                Close
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {phase === "reveal" && award ? (
          <RevealActions
            award={award}
            rarityColor={rarityColor}
            bottomInset={insets.bottom}
            onViewBinder={onViewBinder}
            onDismiss={handleDismiss}
          />
        ) : null}

        {canCloseWithoutClaim || phase === "reveal" ? (
          <Pressable
            onPress={handleDismiss}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={[styles.closeBtn, { top: insets.top + 10 }]}
          >
            <MaterialIcons name="close" size={22} color="#FFF" />
          </Pressable>
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)" },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6,12,8,0.92)",
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  packWrap: {
    alignItems: "center",
    overflow: "visible",
    // Pack + torn top draw above the rising card.
    zIndex: 5,
  },
  risingCard: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    // Shift the badge+card cluster up within the stage.
    paddingBottom: 64,
  },
  newBadgeSpacer: {
    height: 36,
  },
  newBadge: {
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  newBadgeGlow: {
    position: "absolute",
    width: 200,
    height: 28,
    borderRadius: 14,
    backgroundColor: NEW_GOLD,
    opacity: 0.22,
  },
  newBadgeInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 6,
  },
  newBadgeRule: {
    width: 22,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: NEW_GOLD,
    opacity: 0.85,
  },
  newBadgeLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 3.2,
    textShadowColor: "rgba(228, 197, 106, 0.45)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  auraOuter: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    zIndex: 0,
  },
  errorStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 28,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    fontWeight: "600",
  },
  revealActions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  revealCard: {
    borderRadius: 14,
    // Visible so rotateY perspective + NEW badge aren't clipped
    overflow: "visible",
    backgroundColor: "transparent",
  },
  revealArt: {
    borderRadius: 0,
  },
  actions: {
    width: "100%",
    maxWidth: 320,
    gap: 10,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  errorPrimaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    alignSelf: "stretch",
    maxWidth: 320,
  },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignSelf: "stretch",
    maxWidth: 320,
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    zIndex: 50,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
});
