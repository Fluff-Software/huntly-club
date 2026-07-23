import React from "react";
import { View, StyleSheet, Pressable } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useSignUpOptional } from "@/contexts/SignUpContext";

const CREAM = "#F4F0EB";
const HUNTLY_GREEN = "#4F6F52";
const HUNTLY_CHARCOAL = "#3D3D3D";

export type TutorialStep = "welcome" | "missions" | "team" | "journal" | "done";

interface NewPlayerTutorialProps {
  visible: boolean;
  onDismiss: () => void;
  tabBarHeight: number;
}

export function NewPlayerTutorial({ visible, onDismiss, tabBarHeight }: NewPlayerTutorialProps) {
  const { scaleW, width, isTablet } = useLayoutScale();
  const cardMaxWidth = isTablet ? Math.min(scaleW(420), width * 0.85) : scaleW(360);
  const signUpContext = useSignUpOptional();
  const tutorialStep = signUpContext?.tutorialStep ?? "welcome";
  const setTutorialStep = signUpContext?.setTutorialStep;

  const handleNext = () => {
    if (tutorialStep === "welcome") {
      setTutorialStep?.("missions");
    } else if (tutorialStep === "missions") {
      setTutorialStep?.("team");
    } else if (tutorialStep === "team") {
      setTutorialStep?.("journal");
    } else if (tutorialStep === "journal") {
      onDismiss();
    }
  };

  if (!visible || tutorialStep === "done") return null;

  const isTabHintStep =
    tutorialStep === "missions" || tutorialStep === "team" || tutorialStep === "journal";

  // Rendered as absolute overlay (not Modal) so the tab bar stays in the same
  // view hierarchy and remains tappable at all times.
  return (
    <View style={styles.overlayRoot} pointerEvents="box-none">
      <View
        style={[
          styles.overlay,
          { padding: scaleW(24) },
          isTabHintStep && { bottom: tabBarHeight },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={onDismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Skip tour"
          style={[styles.skipButton, { top: scaleW(8), right: scaleW(8) }]}
        >
          <ThemedText style={{ fontSize: scaleW(15), fontWeight: "600" }} lightColor={CREAM} darkColor={CREAM}>
            Skip
          </ThemedText>
        </Pressable>

        {tutorialStep === "welcome" && (
          <View style={styles.centeredCardWrapper} pointerEvents="box-none">
            <View style={[styles.card, styles.cardCentered, { padding: scaleW(24), borderRadius: scaleW(16), maxWidth: cardMaxWidth }]}>
              <ThemedText type="subtitle" style={{ fontSize: scaleW(22), fontWeight: "600", marginBottom: scaleW(8) }} lightColor={HUNTLY_GREEN} darkColor={HUNTLY_GREEN}>
                Welcome to Huntly World
              </ThemedText>
              <ThemedText style={{ fontSize: scaleW(16), lineHeight: scaleW(24), marginBottom: scaleW(24) }} lightColor={HUNTLY_CHARCOAL} darkColor={HUNTLY_CHARCOAL}>
                This is your Clubhouse - your home base. Here's a quick look at where everything lives.
              </ThemedText>
              <Pressable
                onPress={handleNext}
                style={{
                  alignSelf: "center",
                  minWidth: scaleW(200),
                  minHeight: scaleW(52),
                  paddingVertical: scaleW(14),
                  paddingHorizontal: scaleW(28),
                  borderRadius: scaleW(14),
                  backgroundColor: HUNTLY_GREEN,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                accessibilityRole="button"
              >
                <ThemedText style={{ fontSize: scaleW(18), fontWeight: "600" }} lightColor={CREAM} darkColor={CREAM}>
                  Next
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {tutorialStep === "missions" && (
          <View style={[styles.tapTabStepContainer, { bottom: scaleW(24) }]}>
            <View style={[styles.card, styles.tapTabCard, { padding: scaleW(20), borderRadius: scaleW(16), maxWidth: scaleW(320) }]}>
              <ThemedText type="subtitle" style={{ fontSize: scaleW(20), fontWeight: "600", marginBottom: scaleW(4), textAlign: "center" }} lightColor={HUNTLY_GREEN} darkColor={HUNTLY_GREEN}>
                Missions
              </ThemedText>
              <ThemedText style={{ fontSize: scaleW(14), lineHeight: scaleW(20), textAlign: "center", marginBottom: scaleW(16) }} lightColor={HUNTLY_CHARCOAL} darkColor={HUNTLY_CHARCOAL}>
                Your adventures live here. Tap here anytime to start one and earn points.
              </ThemedText>
              <Pressable
                onPress={handleNext}
                style={{
                  alignSelf: "center",
                  minWidth: scaleW(160),
                  minHeight: scaleW(44),
                  paddingVertical: scaleW(10),
                  paddingHorizontal: scaleW(24),
                  borderRadius: scaleW(14),
                  backgroundColor: HUNTLY_GREEN,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                accessibilityRole="button"
              >
                <ThemedText style={{ fontSize: scaleW(16), fontWeight: "600" }} lightColor={CREAM} darkColor={CREAM}>
                  Next
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {tutorialStep === "team" && (
          <View style={[styles.tapTabStepContainer, { bottom: scaleW(24) }]}>
            <View style={[styles.card, styles.tapTabCard, { padding: scaleW(20), borderRadius: scaleW(16), maxWidth: scaleW(320) }]}>
              <ThemedText type="subtitle" style={{ fontSize: scaleW(20), fontWeight: "600", marginBottom: scaleW(4), textAlign: "center" }} lightColor={HUNTLY_GREEN} darkColor={HUNTLY_GREEN}>
                Your team
              </ThemedText>
              <ThemedText style={{ fontSize: scaleW(14), lineHeight: scaleW(20), textAlign: "center", marginBottom: scaleW(16) }} lightColor={HUNTLY_CHARCOAL} darkColor={HUNTLY_CHARCOAL}>
                See how your team's doing - compare points and celebrate together.
              </ThemedText>
              <Pressable
                onPress={handleNext}
                style={{
                  alignSelf: "center",
                  minWidth: scaleW(160),
                  minHeight: scaleW(44),
                  paddingVertical: scaleW(10),
                  paddingHorizontal: scaleW(24),
                  borderRadius: scaleW(14),
                  backgroundColor: HUNTLY_GREEN,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                accessibilityRole="button"
              >
                <ThemedText style={{ fontSize: scaleW(16), fontWeight: "600" }} lightColor={CREAM} darkColor={CREAM}>
                  Next
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {tutorialStep === "journal" && (
          <View style={[styles.tapTabStepContainer, { bottom: scaleW(24) }]}>
            <View style={[styles.card, styles.tapTabCard, { padding: scaleW(20), borderRadius: scaleW(16), maxWidth: scaleW(320) }]}>
              <ThemedText type="subtitle" style={{ fontSize: scaleW(20), fontWeight: "600", marginBottom: scaleW(4), textAlign: "center" }} lightColor={HUNTLY_GREEN} darkColor={HUNTLY_GREEN}>
                Your backpack
              </ThemedText>
              <ThemedText style={{ fontSize: scaleW(14), lineHeight: scaleW(20), textAlign: "center", marginBottom: scaleW(16) }} lightColor={HUNTLY_CHARCOAL} darkColor={HUNTLY_CHARCOAL}>
                Badges, mission memories, and journal entries live here.
              </ThemedText>
              <Pressable
                onPress={handleNext}
                style={{
                  alignSelf: "center",
                  minWidth: scaleW(160),
                  minHeight: scaleW(44),
                  paddingVertical: scaleW(10),
                  paddingHorizontal: scaleW(24),
                  borderRadius: scaleW(14),
                  backgroundColor: HUNTLY_GREEN,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                accessibilityRole="button"
              >
                <ThemedText style={{ fontSize: scaleW(16), fontWeight: "600" }} lightColor={CREAM} darkColor={CREAM}>
                  Got it
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  skipButton: {
    position: "absolute",
    zIndex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  centeredCardWrapper: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: CREAM,
    width: "100%",
  },
  cardCentered: {
    alignItems: "center",
  },
  tapTabStepContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  tapTabCard: {
    alignSelf: "center",
  },
});
