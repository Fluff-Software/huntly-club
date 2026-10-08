/**
 * Bottom sheet shown when an Explore stop is selected on the map.
 *
 * Built for kids: the distance is the hero ("how far to my card?"), the wording
 * is encouraging ("Getting warmer!"), and the sheet can be dragged down to
 * dismiss as well as closed with the X.
 */
import React from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { closenessProgress, formatDistanceParts, warmthMessage } from "@/utils/exploreSheet";

const SHEET_BG = "#FFF8E7";
const INK = "#1F4D2B";
const MUTED = "#6B7F6E";
const ACCENT = "#62A94F";
const ACCENT_EDGE = "#3F7F32";
const TRACK = "#E6EDDD";
const CHIP_BG = "#EAF4E4";

/** Pull down this far (or fling this fast) and the sheet closes. */
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 900;
const OFFSCREEN = 600;

export type ExploreStopSheetProps = {
  onLayout?: (e: LayoutChangeEvent) => void;
  onClose: () => void;
  /** Already collected by the selected player(s) today. */
  alreadyClaimed: boolean;
  /** Location permission granted and a fix is available. */
  locationReady: boolean;
  locationLoading: boolean;
  onEnableLocation: () => void;
  distanceMetres: number | null;
  withinClaimRange: boolean;
  claimRadiusMetres: number;
  claiming: boolean;
  collectForEveryone: boolean;
  onCollect: () => void;
  /** A banked pack is open in the reveal. */
  packReady: boolean;
  claimError: string | null;
  /** Staff-only location spoofing tools. */
  spoofAllowed: boolean;
  debugSpoofActive: boolean;
  onTeleport: () => void;
  onClearSpoof: () => void;
};

export function ExploreStopSheet({
  onLayout,
  onClose,
  alreadyClaimed,
  locationReady,
  locationLoading,
  onEnableLocation,
  distanceMetres,
  withinClaimRange,
  claimRadiusMetres,
  claiming,
  collectForEveryone,
  onCollect,
  packReady,
  claimError,
  spoofAllowed,
  debugSpoofActive,
  onTeleport,
  onClearSpoof,
}: ExploreStopSheetProps) {
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    // Only react to a clear downward drag, so taps on the buttons still work.
    .activeOffsetY(10)
    .failOffsetX([-30, 30])
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        translateY.value = withTiming(OFFSCREEN, { duration: 180 }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const parts = distanceMetres != null ? formatDistanceParts(distanceMetres) : null;

  return (
    <GestureHandlerRootView style={styles.root} pointerEvents="box-none">
      <GestureDetector gesture={pan}>
        <Animated.View
          onLayout={onLayout}
          style={[styles.sheet, sheetStyle]}
        >
          <View style={styles.handle} />

          <View style={styles.topRow}>
            <View style={styles.chip}>
              <MaterialCommunityIcons name="cards" size={14} color={INK} />
              <ThemedText lightColor={INK} darkColor={INK} style={styles.chipText}>
                Card spot
              </ThemedText>
            </View>

            <View style={styles.actions}>
              {spoofAllowed ? (
                <>
                  <Pressable
                    onPress={onTeleport}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={
                      debugSpoofActive ? "Re-teleport to this spot" : "Teleport to this spot"
                    }
                    style={styles.roundBtn}
                  >
                    <MaterialIcons name="my-location" size={15} color={INK} />
                  </Pressable>
                  {debugSpoofActive ? (
                    <Pressable
                      onPress={onClearSpoof}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Clear spoofed location"
                      style={styles.roundBtn}
                    >
                      <MaterialIcons name="gps-off" size={15} color={MUTED} />
                    </Pressable>
                  ) : null}
                </>
              ) : null}
              <Pressable
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.roundBtn}
              >
                <MaterialIcons name="close" size={18} color={INK} />
              </Pressable>
            </View>
          </View>

          {packReady ? (
            <View style={styles.hero}>
              <MaterialCommunityIcons name="gift-open" size={32} color={ACCENT_EDGE} />
              <ThemedText lightColor={INK} darkColor={INK} style={styles.heroTitle}>
                Your pack is ready!
              </ThemedText>
              <ThemedText lightColor={MUTED} darkColor={MUTED} style={styles.subline}>
                Swipe the top of the pack to rip it open.
              </ThemedText>
            </View>
          ) : alreadyClaimed ? (
            <View style={styles.hero}>
              <MaterialIcons name="check-circle" size={38} color={ACCENT} />
              <ThemedText lightColor={INK} darkColor={INK} style={styles.heroTitle}>
                Collected today!
              </ThemedText>
              <ThemedText lightColor={MUTED} darkColor={MUTED} style={styles.subline}>
                Come back tomorrow for another card.
              </ThemedText>
            </View>
          ) : !locationReady ? (
            <View style={styles.hero}>
              <MaterialIcons name="location-on" size={34} color={ACCENT_EDGE} />
              <ThemedText lightColor={INK} darkColor={INK} style={styles.heroTitle}>
                Turn on location
              </ThemedText>
              <ThemedText lightColor={MUTED} darkColor={MUTED} style={styles.subline}>
                So we can show how far your card is.
              </ThemedText>
              <Pressable
                onPress={onEnableLocation}
                disabled={locationLoading}
                accessibilityRole="button"
                accessibilityLabel="Enable location"
                style={[styles.bigBtn, locationLoading && styles.btnDisabled]}
              >
                <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.bigBtnText}>
                  {locationLoading ? "Finding you…" : "Turn on location"}
                </ThemedText>
              </Pressable>
            </View>
          ) : parts == null ? (
            <View style={styles.hero}>
              <ThemedText lightColor={MUTED} darkColor={MUTED} style={styles.subline}>
                Finding how far away it is…
              </ThemedText>
            </View>
          ) : withinClaimRange ? (
            <View style={styles.hero}>
              <ThemedText lightColor={INK} darkColor={INK} style={styles.arrivedTitle}>
                You made it!
              </ThemedText>
              <ThemedText lightColor={MUTED} darkColor={MUTED} style={styles.subline}>
                Your card is ready to collect.
              </ThemedText>
              <Pressable
                onPress={onCollect}
                disabled={claiming}
                accessibilityRole="button"
                accessibilityLabel={collectForEveryone ? "Collect for everyone" : "Collect card"}
                style={[styles.bigBtn, claiming && styles.btnDisabled]}
              >
                <MaterialIcons name="star" size={18} color="#FFF" />
                <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.bigBtnText}>
                  {claiming
                    ? "Opening…"
                    : collectForEveryone
                      ? "Collect for everyone!"
                      : "Collect card!"}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.hero}>
              <View style={styles.distanceRow} accessibilityRole="header">
                <ThemedText lightColor={INK} darkColor={INK} style={styles.distanceValue}>
                  {parts.value}
                </ThemedText>
                <ThemedText lightColor={INK} darkColor={INK} style={styles.distanceUnit}>
                  {parts.unit}
                </ThemedText>
                <ThemedText lightColor={MUTED} darkColor={MUTED} style={styles.distanceAway}>
                  away
                </ThemedText>
              </View>

              <ThemedText lightColor={ACCENT_EDGE} darkColor={ACCENT_EDGE} style={styles.warmth}>
                {warmthMessage(distanceMetres!, claimRadiusMetres)}
              </ThemedText>

              <View style={styles.progressWrap}>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.round(closenessProgress(distanceMetres!, claimRadiusMetres) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.hintRow}>
                  <MaterialIcons name="directions-walk" size={15} color={ACCENT_EDGE} />
                  <ThemedText lightColor={MUTED} darkColor={MUTED} style={styles.hintText}>
                    Walk closer to unlock this card
                  </ThemedText>
                </View>
              </View>
            </View>
          )}

          {claimError ? (
            <ThemedText lightColor="#B3261E" darkColor="#B3261E" style={styles.error}>
              {claimError}
            </ThemedText>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    // The tab bar sits directly below the map, so no extra safe-area padding here.
    paddingBottom: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(31,77,43,0.22)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: CHIP_BG,
    borderRadius: 11,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roundBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CHIP_BG,
  },
  hero: {
    alignItems: "center",
    gap: 3,
    paddingTop: 0,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  distanceValue: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: "900",
    fontFamily: "Jua_400Regular",
  },
  distanceUnit: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    fontFamily: "Jua_400Regular",
  },
  distanceAway: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    fontFamily: "Jua_400Regular",
  },
  warmth: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    fontFamily: "Jua_400Regular",
  },
  arrivedTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    fontFamily: "Jua_400Regular",
    textAlign: "center",
  },
  heroTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
    fontFamily: "Jua_400Regular",
    textAlign: "center",
  },
  subline: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  progressWrap: {
    alignSelf: "stretch",
    gap: 6,
    marginTop: 2,
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: TRACK,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: ACCENT,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  hintText: {
    fontSize: 13,
    fontWeight: "700",
  },
  bigBtn: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
    backgroundColor: ACCENT,
    borderRadius: 15,
    paddingVertical: 10,
    borderBottomWidth: 4,
    borderBottomColor: ACCENT_EDGE,
  },
  bigBtnText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    fontFamily: "Jua_400Regular",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
