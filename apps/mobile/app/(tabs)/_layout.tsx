import { Tabs, router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Modal, Platform, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useSignUpOptional } from "@/contexts/SignUpContext";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { NewPlayerTutorial } from "@/components/NewPlayerTutorial";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/ui/Button";
import {
  getHasCompletedTutorial,
  recordTutorialAchievement,
} from "@/services/activityProgressService";
import {
  hasAskedPushOptIn,
  registerForPushNotificationsAsync,
  savePushToken,
  setPushOptInAsked,
} from "@/services/pushNotificationService";

const HOME_CLUBHOUSE = require("@/assets/images/home-clubhouse.png");
const HOME_STORY = require("@/assets/images/home-story.png");
const HOME_MISSIONS = require("@/assets/images/home-missions.png");
const HOME_TEAM = require("@/assets/images/home-team.png");

const TAB_BAR_COLORS: Record<string, string> = {
  index: "#4F6F52",
  story: "#1E2E28",
  missions: "#D2684B",
  social: "#F7A676",
};

const CREAM = "#F4F0EB";
const HUNTLY_GREEN = "#4F6F52";
const HUNTLY_CHARCOAL = "#3D3D3D";

function TabIcon({
  source,
  color,
  size = 24,
}: {
  source: number;
  color: string;
  size?: number;
}) {
  return (
    <Image
      source={source}
      style={[styles.tabIcon, { width: size, height: size, tintColor: color }]}
      resizeMode="contain"
    />
  );
}

function StoryTabPulse({ size }: { size: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.35, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.2, { duration: 600 }), withTiming(0.6, { duration: 600 })),
      -1,
      true
    );
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.tutorialPulseRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const { currentPlayer } = usePlayer();
  const { scaleW } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const signUpContext = useSignUpOptional();
  const showPostSignUpWelcome = signUpContext?.showPostSignUpWelcome ?? false;
  const setShowPostSignUpWelcome = signUpContext?.setShowPostSignUpWelcome;
  const tutorialStep = signUpContext?.tutorialStep ?? "done";
  const setTutorialStep = signUpContext?.setTutorialStep;
  const replayTutorialRequested = signUpContext?.replayTutorialRequested ?? false;
  const setReplayTutorialRequested = signUpContext?.setReplayTutorialRequested;
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [notificationPromptChecking, setNotificationPromptChecking] = useState(true);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState<boolean | null>(null);

  // On clubhouse/tabs load: if user has no tutorial achievement, show the tutorial
  useEffect(() => {
    if (!currentPlayer?.id) return;
    let cancelled = false;
    getHasCompletedTutorial(currentPlayer.id).then((completed) => {
      if (cancelled) return;
      setHasCompletedTutorial(completed);
      if (completed) {
        setShowPostSignUpWelcome?.(false);
      } else {
        setShowPostSignUpWelcome?.(true);
        setTutorialStep?.("intro");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentPlayer?.id, setShowPostSignUpWelcome, setTutorialStep]);

  // When showPostSignUpWelcome was set (e.g. "Show tutorial again"): re-check and hide if they already have achievement (unless replay requested)
  useEffect(() => {
    if (!showPostSignUpWelcome || !currentPlayer?.id) {
      if (!showPostSignUpWelcome) setHasCompletedTutorial(null);
      return;
    }
    if (replayTutorialRequested) {
      setHasCompletedTutorial(false);
      return;
    }
    let cancelled = false;
    getHasCompletedTutorial(currentPlayer.id).then((completed) => {
      if (cancelled) return;
      setHasCompletedTutorial(completed);
      if (completed) setShowPostSignUpWelcome?.(false);
    });
    return () => {
      cancelled = true;
    };
  }, [showPostSignUpWelcome, currentPlayer?.id, replayTutorialRequested, setShowPostSignUpWelcome]);

  useEffect(() => {
    if (!user?.id || showPostSignUpWelcome) {
      setNotificationPromptChecking(false);
      return;
    }
    let cancelled = false;
    hasAskedPushOptIn(user.id).then((asked) => {
      if (!cancelled && !asked) setShowNotificationPrompt(true);
      if (!cancelled) setNotificationPromptChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, showPostSignUpWelcome]);

  const handleNotificationPromptYes = async () => {
    if (!user?.id) return;
    const token = await registerForPushNotificationsAsync();
    if (token) await savePushToken(user.id, token);
    await setPushOptInAsked(user.id);
    setShowNotificationPrompt(false);
  };

  const handleNotificationPromptNotNow = async () => {
    if (!user?.id) return;
    await setPushOptInAsked(user.id);
    setShowNotificationPrompt(false);
  };

  const activeColor = "#FFFFFF";
  const inactiveColor = "rgba(255,255,255,0.6)";

  const bottomInset =
    Platform.OS === "android" && insets.bottom === 0
      ? scaleW(24)
      : insets.bottom;
  const tabBarPaddingBottom = scaleW(16) + bottomInset;
  const tabBarHeight = scaleW(72) + bottomInset;

  const handleTutorialDismiss = () => {
    setReplayTutorialRequested?.(false);
    setTutorialStep?.("done");
    setShowPostSignUpWelcome?.(false);
    if (currentPlayer?.id != null && currentPlayer?.team != null) {
      recordTutorialAchievement(currentPlayer.id, currentPlayer.team).catch(() => {});
    }
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.layoutWrapper}>
      <NewPlayerTutorial
        visible={showPostSignUpWelcome && hasCompletedTutorial === false}
        onDismiss={handleTutorialDismiss}
        tabBarHeight={tabBarHeight}
      />
      <Modal
        visible={showNotificationPrompt && !notificationPromptChecking}
        transparent
        animationType="fade"
        onRequestClose={handleNotificationPromptNotNow}
      >
        <View style={styles.notificationPromptOverlay}>
          <View style={[styles.notificationPromptCard, { padding: scaleW(24), borderRadius: scaleW(16) }]}>
            <ThemedText
              type="subtitle"
              style={{ marginBottom: scaleW(16), textAlign: "center" }}
              lightColor={HUNTLY_GREEN}
              darkColor={CREAM}
            >
              Would you like to be notified when new chapters are available?
            </ThemedText>
            <ThemedText
              style={{ marginBottom: scaleW(24), textAlign: "center", fontSize: scaleW(14) }}
              lightColor={HUNTLY_CHARCOAL}
              darkColor="rgba(244,240,235,0.9)"
            >
              Get notified when a new chapter is ready to read.
            </ThemedText>
            <View style={{ gap: scaleW(12) }}>
              <Button variant="secondary" onPress={handleNotificationPromptYes}>
                Yes, notify me
              </Button>
              <Button variant="white" onPress={handleNotificationPromptNotNow}>
                Not now
              </Button>
            </View>
          </View>
        </View>
      </Modal>
      <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelPosition: "below-icon",
        tabBarStyle: {
          borderTopWidth: 0,
          height: tabBarHeight,
          paddingTop: scaleW(16),
          paddingBottom: tabBarPaddingBottom,
          paddingHorizontal: scaleW(8),
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: scaleW(-2) },
          shadowOpacity: 0.12,
          shadowRadius: scaleW(4),
          backgroundColor: TAB_BAR_COLORS[route.name] ?? TAB_BAR_COLORS.index,
        },
        tabBarLabelStyle: {
          fontSize: scaleW(12),
          fontWeight: "600",
          marginTop: scaleW(8),
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        headerShown: false,
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Clubhouse",
          tabBarIcon: ({ color }) => (
            <TabIcon source={HOME_CLUBHOUSE} color={color} size={scaleW(24)} />
          ),
          href: currentPlayer ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="story"
        options={{
          title: "Story",
          tabBarIcon: ({ color }) => (
            <View style={[styles.storyIconWrapper, { width: scaleW(44), height: scaleW(44) }]}>
              {tutorialStep === "click_story" && (
                <View style={[styles.tutorialPulseContainer, { width: scaleW(44), height: scaleW(44) }]}>
                  <StoryTabPulse size={scaleW(44)} />
                </View>
              )}
              <TabIcon source={HOME_STORY} color={color} size={scaleW(24)} />
            </View>
          ),
          href: currentPlayer ? undefined : null,
          popToTopOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: "Missions",
          tabBarIcon: ({ color }) => (
            <View style={[styles.storyIconWrapper, { width: scaleW(44), height: scaleW(44) }]}>
              {tutorialStep === "click_missions" && (
                <View style={[styles.tutorialPulseContainer, { width: scaleW(44), height: scaleW(44) }]}>
                  <StoryTabPulse size={scaleW(44)} />
                </View>
              )}
              <TabIcon source={HOME_MISSIONS} color={color} size={scaleW(24)} />
            </View>
          ),
          href: currentPlayer ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: "Team",
          tabBarIcon: ({ color }) => (
            <View style={[styles.storyIconWrapper, { width: scaleW(44), height: scaleW(44) }]}>
              {tutorialStep === "click_team" && (
                <View style={[styles.tutorialPulseContainer, { width: scaleW(44), height: scaleW(44) }]}>
                  <StoryTabPulse size={scaleW(44)} />
                </View>
              )}
              <TabIcon source={HOME_TEAM} color={color} size={scaleW(24)} />
            </View>
          ),
          href: currentPlayer ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="parents"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  layoutWrapper: {
    flex: 1,
  },
  tabIcon: {},
  storyIconWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  tutorialPulseContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  tutorialPulseRing: {
    position: "absolute",
    borderColor: "rgba(255,255,255,0.9)",
  },
  notificationPromptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  notificationPromptCard: {
    backgroundColor: CREAM,
    maxWidth: 360,
    width: "100%",
  },
});
