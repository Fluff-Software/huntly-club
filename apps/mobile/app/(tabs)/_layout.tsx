import { Tabs, router } from "expo-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Image, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
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
import { useUser } from "@/contexts/UserContext";
import { useSignUpOptional } from "@/contexts/SignUpContext";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useFirstSeason } from "@/hooks/useFirstSeason";
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
  setPushEnabled,
  setPushOptInAsked,
} from "@/services/pushNotificationService";
import { isStartMissionOnboardingActive } from "@/constants/startMissionOnboarding";

const HOME_CLUBHOUSE = require("@/assets/images/home-clubhouse.png");
const HOME_STORY = require("@/assets/images/home-story.png");
const HOME_MISSIONS = require("@/assets/images/home-missions.png");
const HOME_TEAM = require("@/assets/images/home-team.png");

const TAB_BAR_COLORS: Record<string, string> = {
  index: "#4F6F52",
  story: "#1E2E28",
  missions: "#D2684B",
  social: "#C3A4FF",
  journal: "#B07D3E",
  testing: "#5B8A9E",
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
  const { profiles } = usePlayer();
  const { userData, loading: userLoading, updateWeeklyEmail, updateLastSeenSeasonId } =
    useUser();
  const {
    firstSeason,
    heroImageSource,
    loading: seasonLoading,
  } = useFirstSeason();
  const { scaleW, isTablet } = useLayoutScale();
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
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [pushOptIn, setPushOptIn] = useState(false);
  const [showSeasonAnnouncementModal, setShowSeasonAnnouncementModal] =
    useState(false);
  const [seasonAnnouncementSaving, setSeasonAnnouncementSaving] = useState(false);
  const [seasonAnnouncementChecking, setSeasonAnnouncementChecking] =
    useState(true);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState<boolean | null>(null);
  const onboardingActive = isStartMissionOnboardingActive(userData?.start_mission_step);

  const hasCheckedNotificationPromptRef = useRef(false);
  const hasCheckedSeasonAnnouncementRef = useRef(false);

  // If user has no team set, redirect to team selection
  useEffect(() => {
    if (!user?.id || userLoading || !userData || userData.team != null) return;
    router.replace("/sign-up/team");
  }, [user?.id, userLoading, userData]);

  // On clubhouse/tabs load: if user has no tutorial achievement (check first profile), show the tutorial
  const firstProfileId = profiles[0]?.id ?? null;
  useEffect(() => {
    if (onboardingActive) return;
    if (firstProfileId == null) return;
    let cancelled = false;
    getHasCompletedTutorial(firstProfileId).then((completed) => {
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
  }, [firstProfileId, onboardingActive, setShowPostSignUpWelcome, setTutorialStep]);

  // When showPostSignUpWelcome was set (e.g. "Show tutorial again"): re-check and hide if they already have achievement (unless replay requested)
  useEffect(() => {
    if (onboardingActive) return;
    if (!showPostSignUpWelcome || firstProfileId == null) {
      if (!showPostSignUpWelcome) setHasCompletedTutorial(null);
      return;
    }
    if (replayTutorialRequested) {
      setHasCompletedTutorial(false);
      return;
    }
    let cancelled = false;
    getHasCompletedTutorial(firstProfileId).then((completed) => {
      if (cancelled) return;
      setHasCompletedTutorial(completed);
      if (completed) setShowPostSignUpWelcome?.(false);
    });
    return () => {
      cancelled = true;
    };
  }, [showPostSignUpWelcome, firstProfileId, replayTutorialRequested, onboardingActive, setShowPostSignUpWelcome]);

  // Only consider showing the notification prompt when the tutorial is not visible.
  // After the tutorial is dismissed we wait a short moment so the user lands on the clubhouse first, then show the prompt.
  const NOTIFICATION_PROMPT_DELAY_MS = 600;

  const maybeShowNotificationPrompt = useCallback(() => {
    if (!user?.id) {
      setNotificationPromptChecking(false);
      return;
    }
    if (showSeasonAnnouncementModal || seasonAnnouncementChecking) return;
    if (hasCheckedNotificationPromptRef.current) return;
    hasCheckedNotificationPromptRef.current = true;
    setNotificationPromptChecking(false);
    hasAskedPushOptIn(user.id)
      .then((asked) => {
        if (!asked) {
          // First-run prompt should start fully opt-out.
          setEmailOptIn(false);
          setPushOptIn(false);
          // Safety: if backend/user_data came through as true for any reason, normalize it.
          if (userData?.weekly_email === true) {
            void updateWeeklyEmail(false);
          }
          setShowNotificationPrompt(true);
        }
      })
      .catch(() => {
        // Don't block the UI if the check fails; user can still be prompted from settings
      });
  }, [
    user?.id,
    userData?.weekly_email,
    updateWeeklyEmail,
    showSeasonAnnouncementModal,
    seasonAnnouncementChecking,
  ]);

  const maybeShowSeasonAnnouncement = useCallback(async () => {
    if (!user?.id) {
      setSeasonAnnouncementChecking(false);
      return;
    }
    if (userLoading) return;
    if (onboardingActive) return;
    if (showPostSignUpWelcome) return;
    if (seasonLoading) return;
    if (!userData) {
      hasCheckedSeasonAnnouncementRef.current = true;
      setSeasonAnnouncementChecking(false);
      return;
    }
    if (!firstSeason?.id) {
      hasCheckedSeasonAnnouncementRef.current = true;
      setSeasonAnnouncementChecking(false);
      return;
    }
    if (hasCheckedSeasonAnnouncementRef.current) return;
    hasCheckedSeasonAnnouncementRef.current = true;
    const seenSeasonId = userData?.last_seen_season_id ?? null;
    if (seenSeasonId !== firstSeason.id) {
      setShowSeasonAnnouncementModal(true);
    }
    setSeasonAnnouncementChecking(false);
  }, [
    user?.id,
    userLoading,
    userData,
    showPostSignUpWelcome,
    onboardingActive,
    seasonLoading,
    firstSeason?.id,
    userData?.last_seen_season_id,
  ]);

  useEffect(() => {
    hasCheckedSeasonAnnouncementRef.current = false;
    setSeasonAnnouncementChecking(true);
    setShowSeasonAnnouncementModal(false);
  }, [user?.id]);

  useEffect(() => {
    void maybeShowSeasonAnnouncement();
  }, [maybeShowSeasonAnnouncement]);

  useEffect(() => {
    if (!user?.id) {
      setNotificationPromptChecking(false);
      return;
    }
    if (showPostSignUpWelcome) {
      return;
    }
    if (onboardingActive) {
      return;
    }
    if (showSeasonAnnouncementModal || seasonAnnouncementChecking) {
      return;
    }
    const timer = setTimeout(() => {
      maybeShowNotificationPrompt();
    }, NOTIFICATION_PROMPT_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [
    user?.id,
    showPostSignUpWelcome,
    maybeShowNotificationPrompt,
    showSeasonAnnouncementModal,
    seasonAnnouncementChecking,
    onboardingActive,
  ]);

  const handleNotificationPromptSave = async () => {
    if (!user?.id) return;
    if (notificationSaving) return;
    setNotificationSaving(true);
    try {
      await updateWeeklyEmail(emailOptIn);
      if (pushOptIn) {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await setPushEnabled(true, token);
        }
      } else {
        await setPushEnabled(false);
      }
      await setPushOptInAsked(user.id);
      setShowNotificationPrompt(false);
    } finally {
      setNotificationSaving(false);
    }
  };

  const handleNotificationPromptNotNow = async () => {
    if (!user?.id) return;
    if (notificationSaving) return;
    setNotificationSaving(true);
    try {
      await updateWeeklyEmail(false);
      await setPushEnabled(false);
      await setPushOptInAsked(user.id);
      setShowNotificationPrompt(false);
    } finally {
      setNotificationSaving(false);
    }
  };

  const activeColor = "#FFFFFF";
  const inactiveColor = "rgba(255,255,255,0.6)";

  const bottomInset =
    Platform.OS === "android" && insets.bottom === 0
      ? scaleW(24)
      : insets.bottom;
  const tabBarPaddingBottom = scaleW(16) + bottomInset;
  const tabBarHeight = scaleW(72) + bottomInset;
  const seasonCardMaxWidth = isTablet ? scaleW(460) : 360;
  const seasonTitleFontSize = isTablet ? scaleW(30) : undefined;
  const seasonNameFontSize = isTablet ? scaleW(24) : undefined;
  const seasonBodyFontSize = isTablet ? scaleW(20) : undefined;
  const seasonBodyLineHeight = isTablet ? scaleW(28) : undefined;
  const seasonCtaFontSize = isTablet ? scaleW(22) : undefined;

  const tutorialVisible =
    !onboardingActive &&
    !showSeasonAnnouncementModal &&
    showPostSignUpWelcome &&
    hasCompletedTutorial === false;

  const isTabDisabled = (routeName: string) => {
    if (!tutorialVisible) return false;
    if (onboardingActive) return true;
    const step = tutorialStep as string;
    if (step === "click_story") return routeName !== "story";
    if (step === "click_missions") return routeName !== "missions";
    if (step === "click_team") return routeName !== "social";
    if (step === "click_journal") return routeName !== "journal";
    return false;
  };

  const handleTutorialDismiss = () => {
    setReplayTutorialRequested?.(false);
    setTutorialStep?.("done");
    setShowPostSignUpWelcome?.(false);
    if (profiles.length > 0 && userData && userData.team !== null) {
      profiles.forEach((profile) => {
        if (profile.id != null) {
          recordTutorialAchievement(profile.id, userData.team!).catch(() => {});
        }
      });
    }
    router.replace("/(tabs)");
    setTimeout(() => {
      void maybeShowSeasonAnnouncement();
      maybeShowNotificationPrompt();
    }, NOTIFICATION_PROMPT_DELAY_MS);
  };

  const handleSeasonAnnouncementDismiss = async () => {
    if (seasonAnnouncementSaving) return;
    setSeasonAnnouncementSaving(true);
    setShowSeasonAnnouncementModal(false);
    if (firstSeason?.id) {
      try {
        await updateLastSeenSeasonId(firstSeason.id);
      } catch (error) {
        console.error("Error updating last seen season id:", error);
      }
    }
    setSeasonAnnouncementSaving(false);
    setTimeout(() => {
      maybeShowNotificationPrompt();
    }, NOTIFICATION_PROMPT_DELAY_MS);
  };

  const showNotificationUI =
    showNotificationPrompt && !notificationPromptChecking;

  return (
    <View style={styles.layoutWrapper}>
      <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelPosition: "below-icon",
        tabBarStyle: {
          ...(onboardingActive
            ? { display: "none", height: 0, paddingTop: 0, paddingBottom: 0, borderTopWidth: 0 }
            : {
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
              }),
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
        tabBarButton: (props) => {
          const { ref: _ref, ...rest } = props;
          return (
            <Pressable {...rest} disabled={isTabDisabled(route.name)} />
          );
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Clubhouse",
          tabBarIcon: ({ color }) => (
            <TabIcon source={HOME_CLUBHOUSE} color={color} size={scaleW(24)} />
          ),
          href: profiles.length > 0 ? undefined : null,
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
          href: profiles.length > 0 ? undefined : null,
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
          href: profiles.length > 0 ? undefined : null,
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
          // Always show the Team tab; the screen itself already handles
          // the “no team yet” state.
          href: undefined,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color }) => (
            <View style={[styles.storyIconWrapper, { width: scaleW(44), height: scaleW(44) }]}>
              {tutorialStep === "click_journal" && (
                <View style={[styles.tutorialPulseContainer, { width: scaleW(44), height: scaleW(44) }]}>
                  <StoryTabPulse size={scaleW(44)} />
                </View>
              )}
              <MaterialIcons name="auto-stories" size={scaleW(24)} color={color} />
            </View>
          ),
          href: profiles.length > 0 ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="testing"
        options={{
          href: null,
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
      <NewPlayerTutorial
        visible={tutorialVisible}
        onDismiss={handleTutorialDismiss}
        tabBarHeight={tabBarHeight}
      />
      {showSeasonAnnouncementModal && firstSeason ? (
        <Modal
          visible={showSeasonAnnouncementModal}
          transparent
          animationType="fade"
          onRequestClose={handleSeasonAnnouncementDismiss}
        >
          <View style={styles.notificationPromptOverlay}>
            <View
              style={[
                styles.notificationPromptCard,
                { padding: scaleW(24), borderRadius: scaleW(16), maxWidth: seasonCardMaxWidth },
              ]}
            >
              {firstSeason.hero_image ? (
                <Image
                  source={heroImageSource}
                  resizeMode="cover"
                  style={{
                    width: "100%",
                    height: scaleW(160),
                    borderRadius: scaleW(12),
                    marginBottom: scaleW(16),
                  }}
                />
              ) : null}
              <ThemedText
                type="subtitle"
                style={{
                  marginBottom: scaleW(8),
                  textAlign: "center",
                  ...(seasonTitleFontSize != null ? { fontSize: seasonTitleFontSize } : {}),
                }}
                lightColor={HUNTLY_GREEN}
                darkColor={CREAM}
              >
                A new season has arrived!
              </ThemedText>
              {firstSeason.name ? (
                <ThemedText
                  style={{
                    marginBottom: scaleW(8),
                    textAlign: "center",
                    fontWeight: "600",
                    ...(seasonNameFontSize != null ? { fontSize: seasonNameFontSize } : {}),
                  }}
                  lightColor={HUNTLY_CHARCOAL}
                  darkColor={CREAM}
                >
                  {firstSeason.name}
                </ThemedText>
              ) : null}
              <ThemedText
                style={{
                  marginBottom: scaleW(16),
                  textAlign: "center",
                  ...(seasonBodyFontSize != null ? { fontSize: seasonBodyFontSize } : {}),
                  ...(seasonBodyLineHeight != null ? { lineHeight: seasonBodyLineHeight } : {}),
                }}
                lightColor={HUNTLY_CHARCOAL}
                darkColor={CREAM}
              >
                Read the latest story and jump into this season&apos;s missions.
              </ThemedText>
              <Button
                variant="secondary"
                onPress={handleSeasonAnnouncementDismiss}
                loading={seasonAnnouncementSaving}
                disabled={seasonAnnouncementSaving}
                className={isTablet ? "h-16 rounded-2xl mx-2" : "rounded-2xl"}
              >
                <ThemedText
                  type="defaultSemiBold"
                  lightColor="#FFFFFF"
                  darkColor="#FFFFFF"
                  style={seasonCtaFontSize != null ? { fontSize: seasonCtaFontSize } : undefined}
                >
                  Continue
                </ThemedText>
              </Button>
            </View>
          </View>
        </Modal>
      ) : null}
      {Platform.OS === "ios" ? (
        <Modal
          visible={showNotificationUI}
          transparent
          animationType="fade"
          onRequestClose={handleNotificationPromptNotNow}
        >
          <View style={styles.notificationPromptOverlay}>
            <View
              style={[
                styles.notificationPromptCard,
                { padding: scaleW(24), borderRadius: scaleW(16) },
              ]}
            >
              <ThemedText
                type="subtitle"
                style={{ marginBottom: scaleW(16), textAlign: "center" }}
                lightColor={HUNTLY_GREEN}
                darkColor={CREAM}
              >
                Would you like to be notified when new chapters are available?
              </ThemedText>
              <View style={{ gap: scaleW(12) }}>
                <Pressable
                  style={styles.notificationOptionRow}
                  onPress={() => setEmailOptIn((current) => !current)}
                  disabled={notificationSaving}
                >
                  <ThemedText lightColor={HUNTLY_CHARCOAL} darkColor={CREAM}>
                    Email updates
                  </ThemedText>
                  <View style={styles.notificationCheckbox}>
                    {emailOptIn ? (
                      <MaterialIcons name="check" size={scaleW(18)} color={HUNTLY_GREEN} />
                    ) : null}
                  </View>
                </Pressable>
                <Pressable
                  style={styles.notificationOptionRow}
                  onPress={() => setPushOptIn((current) => !current)}
                  disabled={notificationSaving}
                >
                  <ThemedText lightColor={HUNTLY_CHARCOAL} darkColor={CREAM}>
                    Push notifications
                  </ThemedText>
                  <View style={styles.notificationCheckbox}>
                    {pushOptIn ? (
                      <MaterialIcons name="check" size={scaleW(18)} color={HUNTLY_GREEN} />
                    ) : null}
                  </View>
                </Pressable>
                <Button
                  variant="secondary"
                  onPress={handleNotificationPromptSave}
                >
                  Save preferences
                </Button>
                <Button
                  variant="white"
                  onPress={handleNotificationPromptNotNow}
                >
                  Not now
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      ) : (
        showNotificationUI && (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.notificationPromptOverlay,
              { zIndex: 9999, elevation: 9999 },
            ]}
          >
            <View
              style={[
                styles.notificationPromptCard,
                { padding: scaleW(24), borderRadius: scaleW(16) },
              ]}
            >
              <ThemedText
                type="subtitle"
                style={{ marginBottom: scaleW(16), textAlign: "center" }}
                lightColor={HUNTLY_GREEN}
                darkColor={CREAM}
              >
                Would you like to be notified when new chapters are available?
              </ThemedText>
              <View style={{ gap: scaleW(12) }}>
                <Pressable
                  style={styles.notificationOptionRow}
                  onPress={() => setEmailOptIn((current) => !current)}
                  disabled={notificationSaving}
                >
                  <ThemedText lightColor={HUNTLY_CHARCOAL} darkColor={CREAM}>
                    Email updates
                  </ThemedText>
                  <View style={styles.notificationCheckbox}>
                    {emailOptIn ? (
                      <MaterialIcons name="check" size={scaleW(18)} color={HUNTLY_GREEN} />
                    ) : null}
                  </View>
                </Pressable>
                <Pressable
                  style={styles.notificationOptionRow}
                  onPress={() => setPushOptIn((current) => !current)}
                  disabled={notificationSaving}
                >
                  <ThemedText lightColor={HUNTLY_CHARCOAL} darkColor={CREAM}>
                    Push notifications
                  </ThemedText>
                  <View style={styles.notificationCheckbox}>
                    {pushOptIn ? (
                      <MaterialIcons name="check" size={scaleW(18)} color={HUNTLY_GREEN} />
                    ) : null}
                  </View>
                </Pressable>
                <Button
                  variant="secondary"
                  onPress={handleNotificationPromptSave}
                >
                  Save preferences
                </Button>
                <Button
                  variant="white"
                  onPress={handleNotificationPromptNotNow}
                >
                  Not now
                </Button>
              </View>
            </View>
          </View>
        )
      )}
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
  notificationOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notificationCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: HUNTLY_GREEN,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
});
