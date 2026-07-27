/**
 * Explore pack: one full-pack image, top strip clipped off at the perforation
 * and peeled away on swipe → claim → reveal.
 * Closing before a successful rip does not collect.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
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
import { DeviceMotion } from "expo-sensors";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ExploreCardArt } from "@/components/explore/ExploreCardArt";
import {
  ExplorePackTear,
  packTearStyles,
} from "@/components/explore/ExplorePackTear";
import { EXPLORE_CARD_ART_ASPECT, EXPLORE_RARITY_COLORS } from "@/constants/exploreBinder";
import {
  BINDER_CATEGORY_LABELS,
  formatRarityLabel,
  readableHabitatAffinities,
  type BinderCategoryFilter,
} from "@/utils/exploreBinder";
import type { ExploreAward } from "@/types/exploreStops";

/** Native pixel size of explore-pack-full.png */
const PACK_NATIVE_W = 501;
const PACK_NATIVE_H = 1024;
/** Cut just below the “SWIPE HERE” perforation. */
const PACK_SPLIT_Y = 74;
const PACK_SPLIT_RATIO = PACK_SPLIT_Y / PACK_NATIVE_H;

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

function categoryLabel(category: string): string {
  const key = category as Exclude<BinderCategoryFilter, "all">;
  return BINDER_CATEGORY_LABELS[key] ?? category.replace(/_/g, " ");
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

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
  const claimStartedRef = useRef(false);

  const packW = Math.min(screenW * 0.72, 280);
  const packH = packW * (PACK_NATIVE_H / PACK_NATIVE_W);
  const topH = packH * PACK_SPLIT_RATIO;

  const rarityColor = award
    ? EXPLORE_RARITY_COLORS[award.card.rarity] ?? "#3B82F6"
    : ACCENT;

  const packScale = useSharedValue(0.4);
  const packOpacity = useSharedValue(0);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const idleBob = useSharedValue(0);
  /** 0 = sealed, 1 = pack torn open. */
  const openProgress = useSharedValue(0);
  /** Pack foil fade — drop after the card has started sliding up. */
  const foilOpacity = useSharedValue(1);
  /** Card starts tucked behind the pack, then slides up into view. */
  const cardOpacity = useSharedValue(0);
  const cardY = useSharedValue(120);
  const cardScale = useSharedValue(0.92);
  const ripArmed = useSharedValue(0);
  const auraOpacity = useSharedValue(0);

  const reset = useCallback(() => {
    cancelAnimation(idleBob);
    cancelAnimation(auraOpacity);
    packScale.value = 0.4;
    packOpacity.value = 0;
    tiltX.value = 0;
    tiltY.value = 0;
    idleBob.value = 0;
    openProgress.value = 0;
    foilOpacity.value = 1;
    cardOpacity.value = 0;
    cardY.value = 120;
    cardScale.value = 0.92;
    ripArmed.value = 0;
    auraOpacity.value = 0;
    claimStartedRef.current = false;
    setAward(null);
    setClaimError(null);
    setPackMounted(true);
    setPhase("enter");
  }, [
    packScale,
    packOpacity,
    tiltX,
    tiltY,
    idleBob,
    openProgress,
    foilOpacity,
    cardOpacity,
    cardY,
    cardScale,
    ripArmed,
    auraOpacity,
  ]);

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

  useEffect(() => {
    if (!visible || (phase !== "ready" && phase !== "ripping")) return;
    let sub: { remove: () => void } | null = null;
    let active = true;
    void (async () => {
      const available = await DeviceMotion.isAvailableAsync();
      if (!available || !active) return;
      DeviceMotion.setUpdateInterval(40);
      sub = DeviceMotion.addListener((data) => {
        if (!active) return;
        const beta = data.rotation?.beta ?? 0;
        const gamma = data.rotation?.gamma ?? 0;
        tiltX.value = clamp(gamma * (180 / Math.PI) * 0.4, -9, 9);
        tiltY.value = clamp(beta * (180 / Math.PI) * 0.25, -7, 7);
      });
    })();
    return () => {
      active = false;
      sub?.remove();
    };
  }, [visible, phase, tiltX, tiltY]);

  const playReveal = useCallback(
    (nextAward: ExploreAward) => {
      setAward(nextAward);
      setPhase("reveal");

      // Soft glow while the card rises — no spin, no empty dark beat.
      auraOpacity.value = withSequence(
        withTiming(0.4, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) })
      );

      // Slide the real card up from behind the pack.
      cardOpacity.value = withTiming(1, { duration: 220 });
      cardY.value = withSpring(0, { damping: 14, stiffness: 95 });
      cardScale.value = withSpring(1, { damping: 12, stiffness: 110 });

      // Pack stays briefly so the card can rise out of it, then foil clears.
      foilOpacity.value = withTiming(0, {
        duration: 380,
        easing: Easing.in(Easing.cubic),
      });
      setTimeout(() => setPackMounted(false), 420);

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const beats =
        nextAward.card.rarity === "very_rare"
          ? 3
          : nextAward.card.rarity === "rare"
            ? 2
            : 1;
      void (async () => {
        for (let i = 0; i < beats; i++) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await new Promise((r) => setTimeout(r, 90));
        }
      })();
    },
    [auraOpacity, cardOpacity, cardY, cardScale, foilOpacity]
  );

  const finishRipAndClaim = useCallback(async () => {
    if (claimStartedRef.current) return;
    claimStartedRef.current = true;
    setPhase("claiming");
    cancelAnimation(idleBob);
    idleBob.value = 0;

    // Finish the tear; keep the pack mounted so the card can rise behind it.
    openProgress.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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

  const lightHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);
  const selectionHaptic = useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(phase === "enter" || phase === "ready" || phase === "ripping")
        .activeOffsetX([-8, 8])
        .failOffsetY([-48, 48])
        .onBegin(() => {
          ripArmed.value = 0;
          runOnJS(setPhase)("ripping");
          runOnJS(selectionHaptic)();
        })
        .onUpdate((e) => {
          // Prefer L→R so the tear advances with the finger across the seal.
          const fromX = Math.max(0, e.translationX / RIP_THRESHOLD);
          const fromY = Math.max(0, -e.translationY / (RIP_THRESHOLD * 1.2));
          const progress = Math.min(1, Math.max(fromX, fromY * 0.45));
          openProgress.value = progress;
          if (progress > 0.22 && ripArmed.value === 0) {
            ripArmed.value = 1;
            runOnJS(lightHaptic)();
          }
          if (progress > 0.58 && ripArmed.value === 1) {
            ripArmed.value = 2;
            runOnJS(lightHaptic)();
          }
        })
        .onEnd((e) => {
          const fromX = Math.max(0, e.translationX / RIP_THRESHOLD);
          const fromY = Math.max(0, -e.translationY / (RIP_THRESHOLD * 1.2));
          const progress = Math.min(1, Math.max(fromX, fromY * 0.45));
          const fling = e.velocityX > 700 || e.velocityY < -900;
          if (progress >= 0.72 || fling) {
            runOnJS(finishRipAndClaim)();
          } else {
            openProgress.value = withSpring(0, { damping: 16, stiffness: 180 });
            ripArmed.value = 0;
            runOnJS(setPhase)("ready");
          }
        }),
    [phase, openProgress, finishRipAndClaim, selectionHaptic, lightHaptic, ripArmed]
  );

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const packStyle = useAnimatedStyle(() => ({
    opacity: packOpacity.value * foilOpacity.value,
    transform: [
      { perspective: 900 },
      { translateY: idleBob.value },
      { rotateY: `${tiltX.value}deg` },
      { rotateX: `${-tiltY.value}deg` },
      { scale: packScale.value },
    ],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }, { scale: cardScale.value }],
  }));

  const auraStyle = useAnimatedStyle(() => ({
    opacity: auraOpacity.value,
    transform: [{ scale: 1 + auraOpacity.value * 0.35 }],
  }));

  const cardWidth = Math.min(screenW * 0.86, 320);
  const cardHeight = Math.min(screenH * 0.62, cardWidth / EXPLORE_CARD_ART_ASPECT);
  const revealAffinities = award
    ? readableHabitatAffinities(award.card.habitatWeights ?? {})
    : [];
  const collectedAtLabel = new Date().toLocaleDateString();
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
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleDismiss}>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.dim} />

        <View style={styles.stage} pointerEvents="box-none">
          {/* Soft glow behind the rising card (no spin / no empty dark beat). */}
          {phase === "reveal" && award ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.auraOuter, { backgroundColor: rarityColor }, auraStyle]}
            />
          ) : null}

          {/* Card sits BEHIND the pack and slides up after the rip. */}
          {phase === "reveal" && award ? (
            <Animated.View
              style={[
                styles.risingCard,
                { width: cardWidth, height: cardHeight },
                cardStyle,
              ]}
            >
              <View style={styles.revealCard}>
                <ExploreCardArt
                  imageUrl={award.card.imageUrl}
                  name={award.card.name}
                  rarity={award.card.rarity}
                  collected
                  style={styles.revealArt}
                />
                <View style={[styles.revealTopTab, { backgroundColor: rarityColor }]} pointerEvents="none">
                  <ThemedText
                    type="heading"
                    lightColor="#FFF"
                    darkColor="#FFF"
                    numberOfLines={1}
                    style={styles.revealName}
                  >
                    {award.card.name}
                  </ThemedText>
                  <ThemedText lightColor="#FFF" darkColor="#FFF" numberOfLines={1} style={styles.revealRarity}>
                    {formatRarityLabel(award.card.rarity)}
                  </ThemedText>
                </View>

                <View style={styles.revealBody} pointerEvents="none">
                  <ThemedText
                    lightColor="rgba(255,255,255,0.75)"
                    darkColor="rgba(255,255,255,0.75)"
                    style={styles.revealCategory}
                  >
                    {categoryLabel(award.card.category)}
                  </ThemedText>
                  <ThemedText lightColor="#FFF" darkColor="#FFF" numberOfLines={3} style={styles.revealDesc}>
                    {award.card.description}
                  </ThemedText>
                  <View style={styles.statRow}>
                    <ThemedText lightColor="#FFE08A" darkColor="#FFE08A" style={styles.statLabel}>
                      Copies
                    </ThemedText>
                    <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.statValue}>
                      {award.count}
                    </ThemedText>
                  </View>
                  <View style={styles.statRow}>
                    <ThemedText
                      lightColor="rgba(255,255,255,0.65)"
                      darkColor="rgba(255,255,255,0.65)"
                      style={styles.statLabel}
                    >
                      {award.isNew ? "First found" : "Last found"}
                    </ThemedText>
                    <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.statValue}>
                      {collectedAtLabel}
                    </ThemedText>
                  </View>
                  {revealAffinities.length > 0 ? (
                    <View style={styles.affinityBlock}>
                      <ThemedText lightColor="#FFE08A" darkColor="#FFE08A" style={styles.affinityHeading}>
                        Habitats
                      </ThemedText>
                      <ThemedText
                        lightColor="rgba(255,255,255,0.9)"
                        darkColor="rgba(255,255,255,0.9)"
                        numberOfLines={2}
                        style={styles.affinityText}
                      >
                        {revealAffinities.map((a) => a.label).join(" · ")}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
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

        {phase === "error" ? (
          <View style={[styles.errorStage, { paddingBottom: insets.bottom + 24 }]}>
            <ThemedText lightColor="#FFD8D8" darkColor="#FFD8D8" style={styles.errorText}>
              {claimError ?? "Couldn’t collect this card."}
            </ThemedText>
            <Pressable onPress={handleDismiss} style={styles.secondaryBtn} accessibilityRole="button">
              <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.btnText}>
                Close
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {phase === "reveal" && award ? (
          <View
            style={[styles.revealActions, { paddingBottom: insets.bottom + 24 }]}
            pointerEvents="box-none"
          >
            <View style={styles.actions}>
              <Pressable
                onPress={() => onViewBinder(award)}
                style={[styles.primaryBtn, { backgroundColor: rarityColor }]}
                accessibilityRole="button"
              >
                <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.btnText}>
                  View in binder
                </ThemedText>
              </Pressable>
              <Pressable onPress={handleDismiss} style={styles.secondaryBtn} accessibilityRole="button">
                <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.btnText}>
                  Keep exploring
                </ThemedText>
              </Pressable>
            </View>
          </View>
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
    // Pack draws above the rising card until foil fades.
    zIndex: 2,
  },
  risingCard: {
    position: "absolute",
    zIndex: 1,
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
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#0B120E",
  },
  revealTopTab: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  revealName: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
  },
  revealRarity: {
    fontSize: 12,
    fontWeight: "800",
  },
  revealArt: {
    borderRadius: 0,
  },
  revealBody: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "42%",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 5,
    backgroundColor: "rgba(8, 14, 10, 0.78)",
  },
  revealCategory: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  revealDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  statValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  affinityBlock: {
    marginTop: 2,
    gap: 2,
  },
  affinityHeading: {
    fontSize: 12,
    fontWeight: "800",
  },
  affinityText: {
    fontSize: 12,
    lineHeight: 16,
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
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignSelf: "stretch",
    maxWidth: 320,
  },
  btnText: {
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
