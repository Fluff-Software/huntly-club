import React, { useEffect } from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { useSegments } from "expo-router";

const TUTORIAL_CHARACTER = require("@/assets/images/bear-wave.png");
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useSignUpOptional } from "@/contexts/SignUpContext";

const CREAM = "#F4F0EB";
const HUNTLY_GREEN = "#4F6F52";
const HUNTLY_CHARCOAL = "#3D3D3D";

export type TutorialStep =
  | "intro"
  | "clubhouse"
  | "click_story"
  | "seasons"
  | "click_missions"
  | "missions"
  | "click_team"
  | "team"
  | "wrap_up"
  | "done";

interface NewPlayerTutorialProps {
  visible: boolean;
  onDismiss: () => void;
  tabBarHeight: number;
}

export function NewPlayerTutorial({ visible, onDismiss, tabBarHeight }: NewPlayerTutorialProps) {
  const { scaleW, width, isTablet } = useLayoutScale();
  const cardMaxWidth = isTablet ? Math.min(scaleW(420), width * 0.85) : scaleW(360);
  const signUpContext = useSignUpOptional();
  const tutorialStep = signUpContext?.tutorialStep ?? "intro";
  const setTutorialStep = signUpContext?.setTutorialStep;
  const segments = useSegments();

  const handleNext = () => {
    if (tutorialStep === "intro") {
      setTutorialStep?.("clubhouse");
    } else if (tutorialStep === "clubhouse") {
      setTutorialStep?.("click_story");
    } else if (tutorialStep === "seasons") {
      setTutorialStep?.("click_missions");
    } else if (tutorialStep === "missions") {
      setTutorialStep?.("click_team");
    } else if (tutorialStep === "team") {
      setTutorialStep?.("wrap_up");
    } else if (tutorialStep === "wrap_up") {
      setTutorialStep?.("done");
      onDismiss();
    }
  };

  // When on "click_story" and user navigates to story tab, advance to seasons
  useEffect(() => {
    if (!visible || tutorialStep !== "click_story" || !setTutorialStep) return;
    const inStoryTab = segments[0] === "(tabs)" && segments[1] === "story";
    if (inStoryTab) setTutorialStep("seasons");
  }, [visible, tutorialStep, segments, setTutorialStep]);

  // When on "click_missions" and user navigates to missions tab, advance to missions card
  useEffect(() => {
    if (!visible || tutorialStep !== "click_missions" || !setTutorialStep) return;
    const inMissionsTab = segments[0] === "(tabs)" && segments[1] === "missions";
    if (inMissionsTab) setTutorialStep("missions");
  }, [visible, tutorialStep, segments, setTutorialStep]);

  // When on "click_team" and user navigates to team tab, advance to team card
  useEffect(() => {
    if (!visible || tutorialStep !== "click_team" || !setTutorialStep) return;
    const inTeamTab = segments[0] === "(tabs)" && segments[1] === "social";
    if (inTeamTab) setTutorialStep("team");
  }, [visible, tutorialStep, segments, setTutorialStep]);

  if (!visible) return null;

  const isTabBarVisibleStep =
    tutorialStep === "click_story" ||
    tutorialStep === "click_missions" ||
    tutorialStep === "click_team";

  // Rendered as absolute overlay (not Modal) so the tab bar stays in the same
  // view hierarchy and remains tappable when overlay has bottom: tabBarHeight.
  return (
    <View style={styles.overlayRoot} pointerEvents="box-none">
      {/* Overlay only above tab bar on click_story so tab bar is not covered */}
      <View
        style={[
          styles.overlay,
          { padding: scaleW(24) },
          isTabBarVisibleStep && { bottom: tabBarHeight },
        ]}
      >
        {/* Centered cards: intro, clubhouse, seasons, missions, team, wrap_up */}
        {(tutorialStep === "intro" ||
          tutorialStep === "clubhouse" ||
          tutorialStep === "seasons" ||
          tutorialStep === "missions" ||
          tutorialStep === "team" ||
          tutorialStep === "wrap_up") && (
          <View style={styles.centeredCardWrapper}>
            {tutorialStep === "intro" && (
              <View style={[styles.card, styles.cardWithImage, { padding: scaleW(24), borderRadius: scaleW(16), maxWidth: cardMaxWidth }]}>
                <Image source={TUTORIAL_CHARACTER} style={[styles.characterImage, { width: scaleW(100), height: scaleW(80), marginBottom: scaleW(12) }]} resizeMode="contain" />
                <ThemedText type="subtitle" style={{ fontSize: scaleW(22), fontWeight: "600", marginBottom: scaleW(8) }} lightColor={HUNTLY_GREEN} darkColor={CREAM}>
                  Welcome to Huntly World
                </ThemedText>
                <ThemedText style={{ fontSize: scaleW(16), lineHeight: scaleW(24), marginBottom: scaleW(24) }} lightColor={HUNTLY_CHARCOAL} darkColor="rgba(244,240,235,0.9)">
                  Let's have a quick look around.
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
                  <ThemedText
                    style={{ fontSize: scaleW(18), fontWeight: "600" }}
                    lightColor={CREAM}
                    darkColor={CREAM}
                  >
                    Next
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {tutorialStep === "clubhouse" && (
              <View style={[styles.card, { padding: scaleW(24), borderRadius: scaleW(16), maxWidth: cardMaxWidth }]}>
                <ThemedText type="subtitle" style={{ fontSize: scaleW(22), fontWeight: "600", marginBottom: scaleW(12) }} lightColor={HUNTLY_GREEN} darkColor={CREAM}>
                  The Clubhouse
                </ThemedText>
                <ThemedText style={{ fontSize: scaleW(16), lineHeight: scaleW(24), marginBottom: scaleW(24) }} lightColor={HUNTLY_CHARCOAL} darkColor="rgba(244,240,235,0.9)">
                  This is your home base. Scroll to see photos from around the club. Swipe to go to your profile or recommended mission, or tap the Profile and Missions buttons at the top corners.
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
                  <ThemedText
                    style={{ fontSize: scaleW(18), fontWeight: "600" }}
                    lightColor={CREAM}
                    darkColor={CREAM}
                  >
                    Next
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {tutorialStep === "seasons" && (
              <View style={[styles.card, { padding: scaleW(24), borderRadius: scaleW(16), maxWidth: cardMaxWidth }]}>
                <ThemedText type="subtitle" style={{ fontSize: scaleW(22), fontWeight: "600", marginBottom: scaleW(12) }} lightColor={HUNTLY_GREEN} darkColor={CREAM}>
                  Seasons and chapters
                </ThemedText>
                <ThemedText style={{ fontSize: scaleW(16), lineHeight: scaleW(24), marginBottom: scaleW(24) }} lightColor={HUNTLY_CHARCOAL} darkColor="rgba(244,240,235,0.9)">
                  Each season has chapters that unlock by date. Every chapter has part of the story and missions to complete. Start by reading the story here, then choose some fun activities to take part in on the Missions screen.
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
                  <ThemedText
                    style={{ fontSize: scaleW(18), fontWeight: "600" }}
                    lightColor={CREAM}
                    darkColor={CREAM}
                  >
                    Next
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {tutorialStep === "missions" && (
              <View style={[styles.card, { padding: scaleW(24), borderRadius: scaleW(16), maxWidth: cardMaxWidth }]}>
                <ThemedText type="subtitle" style={{ fontSize: scaleW(22), fontWeight: "600", marginBottom: scaleW(12) }} lightColor={HUNTLY_GREEN} darkColor={CREAM}>
                  Missions
                </ThemedText>
                <ThemedText style={{ fontSize: scaleW(16), lineHeight: scaleW(24), marginBottom: scaleW(24) }} lightColor={HUNTLY_CHARCOAL} darkColor="rgba(244,240,235,0.9)">
                  Your weekly activities live here. Tap one to see what to do and earn points. You can also go back and complete missions from earlier chapters if you've missed any.
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
                  <ThemedText
                    style={{ fontSize: scaleW(18), fontWeight: "600" }}
                    lightColor={CREAM}
                    darkColor={CREAM}
                  >
                    Next
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {tutorialStep === "team" && (
              <View style={[styles.card, { padding: scaleW(24), borderRadius: scaleW(16), maxWidth: cardMaxWidth }]}>
                <ThemedText type="subtitle" style={{ fontSize: scaleW(22), fontWeight: "600", marginBottom: scaleW(12) }} lightColor={HUNTLY_GREEN} darkColor={CREAM}>
                  Your team
                </ThemedText>
                <ThemedText style={{ fontSize: scaleW(16), lineHeight: scaleW(24), marginBottom: scaleW(24) }} lightColor={HUNTLY_CHARCOAL} darkColor="rgba(244,240,235,0.9)">
                  See how your team's doing - compare points, see recent achievements and celebrate together.
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
                  <ThemedText
                    style={{ fontSize: scaleW(18), fontWeight: "600" }}
                    lightColor={CREAM}
                    darkColor={CREAM}
                  >
                    Next
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {tutorialStep === "wrap_up" && (
              <View style={[styles.card, styles.cardWithImage, { padding: scaleW(24), borderRadius: scaleW(16), maxWidth: cardMaxWidth }]}>
                <Image source={TUTORIAL_CHARACTER} style={[styles.characterImage, { width: scaleW(100), height: scaleW(80), marginBottom: scaleW(12) }]} resizeMode="contain" />
                <ThemedText type="subtitle" style={{ fontSize: scaleW(22), fontWeight: "600", marginBottom: scaleW(12) }} lightColor={HUNTLY_GREEN} darkColor={CREAM}>
                  What to do next
                </ThemedText>
                <ThemedText style={{ fontSize: scaleW(16), lineHeight: scaleW(24), marginBottom: scaleW(24) }} lightColor={HUNTLY_CHARCOAL} darkColor="rgba(244,240,235,0.9)">
                  Go to Story and read the latest. Then complete missions in the latest chapter. Have fun!
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
                  <ThemedText
                    style={{ fontSize: scaleW(18), fontWeight: "600" }}
                    lightColor={CREAM}
                    darkColor={CREAM}
                  >
                    Get started
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Tap-tab hint cards above tab bar */}
        {tutorialStep === "click_story" && (
          <View style={[styles.tapTabStepContainer, { bottom: scaleW(24) }]}>
            <View style={[styles.card, styles.tapTabCard, { padding: scaleW(20), borderRadius: scaleW(16), maxWidth: scaleW(320) }]}>
              <ThemedText type="subtitle" style={{ fontSize: scaleW(20), fontWeight: "600", marginBottom: scaleW(4), textAlign: "center" }} lightColor={HUNTLY_GREEN} darkColor={CREAM}>
                Tap Story below
              </ThemedText>
              <ThemedText style={{ fontSize: scaleW(14), lineHeight: scaleW(20), textAlign: "center" }} lightColor={HUNTLY_CHARCOAL} darkColor="rgba(244,240,235,0.9)">
                to read the season's story.
              </ThemedText>
            </View>
          </View>
        )}

        {tutorialStep === "click_missions" && (
          <View style={[styles.tapTabStepContainer, { bottom: scaleW(24) }]}>
            <View style={[styles.card, styles.tapTabCard, { padding: scaleW(20), borderRadius: scaleW(16), maxWidth: scaleW(320) }]}>
              <ThemedText type="subtitle" style={{ fontSize: scaleW(20), fontWeight: "600", marginBottom: scaleW(4), textAlign: "center" }} lightColor={HUNTLY_GREEN} darkColor={CREAM}>
                Tap Missions below
              </ThemedText>
              <ThemedText style={{ fontSize: scaleW(14), lineHeight: scaleW(20), textAlign: "center" }} lightColor={HUNTLY_CHARCOAL} darkColor="rgba(244,240,235,0.9)">
                for your next adventure.
              </ThemedText>
            </View>
          </View>
        )}

        {tutorialStep === "click_team" && (
          <View style={[styles.tapTabStepContainer, { bottom: scaleW(24) }]}>
            <View style={[styles.card, styles.tapTabCard, { padding: scaleW(20), borderRadius: scaleW(16), maxWidth: scaleW(320) }]}>
              <ThemedText type="subtitle" style={{ fontSize: scaleW(20), fontWeight: "600", marginBottom: scaleW(4), textAlign: "center" }} lightColor={HUNTLY_GREEN} darkColor={CREAM}>
                Tap Team below
              </ThemedText>
              <ThemedText style={{ fontSize: scaleW(14), lineHeight: scaleW(20), textAlign: "center" }} lightColor={HUNTLY_CHARCOAL} darkColor="rgba(244,240,235,0.9)">
                to see how you're doing.
              </ThemedText>
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
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
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
  cardWithImage: {
    alignItems: "center",
  },
  characterImage: {},
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
