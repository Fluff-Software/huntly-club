import { Tabs, router, usePathname, useSegments } from "expo-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUser } from "@/contexts/UserContext";
import { useSignUpOptional } from "@/contexts/SignUpContext";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useActiveTrackingSession } from "@/hooks/useActiveTrackingSession";
import { useActiveHuntSession } from "@/hooks/useActiveHuntSession";
import { NewPlayerTutorial } from "@/components/NewPlayerTutorial";
import { TabTrophyIcon } from "@/components/TabTrophyIcon";
import { SlideUpTabBar } from "@/components/SlideUpTabBar";
import { ThemedText } from "@/components/ThemedText";
import {
  preloadTabBarNavigationAssets,
  TAB_BAR_CLUBHOUSE_ICON,
  TAB_BAR_MISSIONS_ICON,
} from "@/utils/tabBarAssets";
import {
  getHasCompletedTutorial,
  recordTutorialAchievement } from "@/services/activityProgressService";
import {
  hasAskedPushOptIn,
  registerForPushNotificationsAsync,
  setPushEnabled,
  setPushOptInAsked } from "@/services/pushNotificationService";

const TAB_BAR_COLORS: Record<string, string> = {
  index: "#4F6F52",
  story: "#1E2E28",
  missions: "#D2684B",
  social: "#C3A4FF",
  journal: "#B07D3E",
  profile: "#5B7FA6",
  testing: "#5B8A9E" };

const CREAM = "#F4F0EB";
const HUNTLY_GREEN = "#4F6F52";
function TabIcon({
  source,
  color,
  size = 24,
  useTint = true }: {
  source: number;
  color: string;
  size?: number;
  useTint?: boolean;
}) {
  return (
    <Image
      source={source}
      style={[styles.tabIcon, { width: size, height: size }, useTint ? { tintColor: color } : null]}
      resizeMode="contain"
    />
  );
}

function TutorialTabPulse({ size }: { size: number }) {
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
    opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.tutorialPulseRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3 },
        animatedStyle,
      ]}
    />
  );
}

export default function TabLayout() {
  const pathname = usePathname();
  const segments = useSegments();
  const { user } = useAuth();
  const { profiles, loading: profilesLoading } = usePlayer();
  const { userData, loading: userLoading } = useUser();
  const { scaleW, isTablet } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const { session: activeTrackingSession } = useActiveTrackingSession();
  const { session: activeHuntSession } = useActiveHuntSession();
  const signUpContext = useSignUpOptional();
  const showPostSignUpWelcome = signUpContext?.showPostSignUpWelcome ?? false;
  const setShowPostSignUpWelcome = signUpContext?.setShowPostSignUpWelcome;
  const tutorialStep = signUpContext?.tutorialStep ?? "done";
  const setTutorialStep = signUpContext?.setTutorialStep;
  const replayTutorialRequested = signUpContext?.replayTutorialRequested ?? false;
  const setReplayTutorialRequested = signUpContext?.setReplayTutorialRequested;
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState<boolean | null>(null);
  const [tabBarNavigationReady, setTabBarNavigationReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void preloadTabBarNavigationAssets()
      .then(() => {
        if (!cancelled) setTabBarNavigationReady(true);
      })
      .catch((error) => {
        console.error("Failed to preload tab bar navigation assets:", error);
        if (!cancelled) setTabBarNavigationReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isOnActiveScavengerQuest = /\/scavenger\/quest\/[^/]+\/active$/.test(pathname);

  const showTabBar =
    tabBarNavigationReady && (!user?.id || !profilesLoading) && !isOnActiveScavengerQuest;

  // If user has no team set, send them to add explorers first, then team selection (matches AuthGuard)
  useEffect(() => {
    if (!user?.id || userLoading || !userData || userData.team != null) return;
    if (profilesLoading) return;
    if (profiles.length === 0) {
      router.replace("/sign-up/players");
      return;
    }
    router.replace("/sign-up/team");
  }, [user?.id, userLoading, userData, profiles.length, profilesLoading]);

  // On clubhouse/tabs load: if user has no tutorial achievement (check first profile), show the tutorial
  const firstProfileId = profiles[0]?.id ?? null;
  useEffect(() => {
    if (firstProfileId == null) return;
    let cancelled = false;
    getHasCompletedTutorial(firstProfileId).then((completed) => {
      if (cancelled) return;
      setHasCompletedTutorial(completed);
      if (completed) {
        setShowPostSignUpWelcome?.(false);
      } else {
        setShowPostSignUpWelcome?.(true);
        setTutorialStep?.("welcome");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [firstProfileId, setShowPostSignUpWelcome, setTutorialStep]);

  // When showPostSignUpWelcome was set (e.g. "Show tutorial again"): re-check and hide if they already have achievement (unless replay requested)
  useEffect(() => {
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
  }, [showPostSignUpWelcome, firstProfileId, replayTutorialRequested, setShowPostSignUpWelcome]);

  // After a modal/tour is dismissed we wait a short moment so the user lands on the clubhouse first.
  const POST_MODAL_DELAY_MS = 600;

  // One-time automatic push permission request after sign-in.
  // We avoid prompting while onboarding/tutorial/season modals are visible.
  const hasRequestedPushPermissionRef = useRef(false);
  const maybeRequestPushPermission = useCallback(async () => {
    if (!user?.id) return;
    if (showPostSignUpWelcome) return;
    if (hasRequestedPushPermissionRef.current) return;
    hasRequestedPushPermissionRef.current = true;

    try {
      const asked = await hasAskedPushOptIn(user.id);
      if (asked) return;

      const token = await registerForPushNotificationsAsync();
      if (token) {
        await setPushEnabled(true, token);
      } else {
        // User denied permission (or push not available) — ensure backend is disabled.
        await setPushEnabled(false);
      }

      await setPushOptInAsked(user.id);
    } catch {
      // If anything fails, don't block the UI and don't loop prompts this session.
    }
  }, [user?.id, showPostSignUpWelcome]);

  useEffect(() => {
    hasRequestedPushPermissionRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    void maybeRequestPushPermission();
  }, [maybeRequestPushPermission]);

  const activeColor = "#FFFFFF";
  const inactiveColor = "rgba(255,255,255,0.6)";

  const tabBarExtraBottomPadding =
    Platform.OS === "android" ? scaleW(8) : scaleW(4);
  const bottomInset =
    Platform.OS === "android"
      ? Math.max(insets.bottom, scaleW(32))
      : insets.bottom;
  const tabBarPaddingBottom = tabBarExtraBottomPadding + bottomInset;
  const tabBarHeight = scaleW(56) + tabBarExtraBottomPadding + bottomInset;
  const tutorialVisible =
    showPostSignUpWelcome && hasCompletedTutorial === false;

  const activeTrackingTitle =
    activeTrackingSession?.status === "active"
      ? activeTrackingSession.type === "cycle"
        ? "Cycle in progress"
        : "Walk in progress"
      : null;
  const activeTrackingRoute =
    activeTrackingSession?.type === "cycle" ? "/activity/cycle-map" : "/activity/walk-map";
  const showActiveTrackingBanner =
    activeTrackingSession?.status === "active" &&
    activeTrackingTitle != null &&
    !pathname.endsWith(activeTrackingRoute);

  const onActiveHuntScreen =
    activeHuntSession != null &&
    (pathname.endsWith("/scavenger/quest/active") ||
      pathname.endsWith("/scavenger/quest/end") ||
      pathname.endsWith("/scavenger/quest/complete"));
  const showActiveHuntBanner =
    !showActiveTrackingBanner &&
    activeHuntSession?.status === "active" &&
    !onActiveHuntScreen;

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
    setTimeout(() => {
      void maybeRequestPushPermission();
    }, POST_MODAL_DELAY_MS);
  };

  // Tabs are always tappable during the tour; if the player navigates away
  // from the Clubhouse tab on their own, treat that as skipping the tour.
  const isOnClubhouseTab = segments[0] === "(tabs)" && segments[1] == null;
  useEffect(() => {
    if (tutorialVisible && !isOnClubhouseTab) {
      handleTutorialDismiss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialVisible, isOnClubhouseTab]);

  const renderTabBar = useCallback(
    (props: BottomTabBarProps) => {
      if (!showTabBar) return null;
      return <BottomTabBar {...props} />;
    },
    [showTabBar]
  );

  return (
    <View style={styles.layoutWrapper}>
      <Tabs
      tabBar={renderTabBar}
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
          backgroundColor: TAB_BAR_COLORS[route.name] ?? TAB_BAR_COLORS.index },
        tabBarLabelStyle: {
          fontSize: scaleW(12),
          fontWeight: "600",
          marginTop: scaleW(8) },
        tabBarIconStyle: {
          marginTop: 0 },
        headerShown: false,
        tabBarButton: (props) => {
          const { ref: _ref, ...rest } = props;
          return <Pressable {...rest} disabled={tutorialVisible} />;
        } })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Clubhouse",
          tabBarIcon: ({ color }) => (
            <TabIcon source={TAB_BAR_CLUBHOUSE_ICON} color={color} size={scaleW(24)} />
          ),
          href: profiles.length > 0 ? undefined : null }}
      />
      <Tabs.Screen
        name="story"
        options={{
          href: null }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: "Missions",
          tabBarIcon: ({ color }) => (
            <View style={[styles.tutorialIconWrapper, { width: scaleW(44), height: scaleW(44) }]}>
              {tutorialVisible && tutorialStep === "missions" && (
                <View style={[styles.tutorialPulseContainer, { width: scaleW(44), height: scaleW(44) }]}>
                  <TutorialTabPulse size={scaleW(44)} />
                </View>
              )}
              <TabIcon source={TAB_BAR_MISSIONS_ICON} color={color} size={scaleW(24)} />
            </View>
          ),
          href: profiles.length > 0 ? undefined : null }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: "Team",
          tabBarIcon: ({ color }) => (
            <View style={[styles.tutorialIconWrapper, { width: scaleW(44), height: scaleW(44) }]}>
              {tutorialVisible && tutorialStep === "team" && (
                <View style={[styles.tutorialPulseContainer, { width: scaleW(44), height: scaleW(44) }]}>
                  <TutorialTabPulse size={scaleW(44)} />
                </View>
              )}
              <TabTrophyIcon color={color} size={scaleW(24)} />
            </View>
          ),
          // Always show the Team tab; the screen itself already handles
          // the “no team yet” state.
          href: undefined }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Backpack",
          tabBarIcon: ({ color }) => (
            <View style={[styles.tutorialIconWrapper, { width: scaleW(44), height: scaleW(44) }]}>
              {tutorialVisible && tutorialStep === "journal" && (
                <View style={[styles.tutorialPulseContainer, { width: scaleW(44), height: scaleW(44) }]}>
                  <TutorialTabPulse size={scaleW(44)} />
                </View>
              )}
              <MaterialIcons name="workspace-premium" size={scaleW(24)} color={color} />
            </View>
          ),
          href: profiles.length > 0 ? undefined : null }}
      />
      <Tabs.Screen
        name="journal-book"
        options={{
          href: null }}
      />
      <Tabs.Screen
        name="badges"
        options={{
          href: null }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          href: null }}
      />
      <Tabs.Screen
        name="testing"
        options={{
          href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="person" size={scaleW(24)} color={color} />
          ),
          href: profiles.length > 0 ? undefined : null }}
      />
      <Tabs.Screen
        name="parents"
        options={{
          href: null }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          href: null }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null }}
      />
      <Tabs.Screen
        name="campfire"
        options={{
          href: null }}
      />
      </Tabs>
      {showActiveTrackingBanner ? (
        <Pressable
          style={[
            styles.activeSessionBanner,
            {
              right: scaleW(16),
              bottom: tabBarHeight + scaleW(10),
              width: scaleW(56),
              height: scaleW(56),
              borderRadius: scaleW(28),
            },
          ]}
          onPress={() => {
            router.push(activeTrackingSession.type === "cycle" ? "/(tabs)/activity/cycle-map" : "/(tabs)/activity/walk-map");
          }}
          accessibilityRole="button"
          accessibilityLabel="Return to active adventure"
        >
          <MaterialIcons
            name={activeTrackingSession.type === "cycle" ? "directions-bike" : "directions-walk"}
            size={scaleW(26)}
            color="#FFFFFF"
          />
        </Pressable>
      ) : showActiveHuntBanner && activeHuntSession ? (
        <Pressable
          style={[
            styles.activeSessionBanner,
            {
              right: scaleW(16),
              bottom: tabBarHeight + scaleW(10),
              width: scaleW(56),
              height: scaleW(56),
              borderRadius: scaleW(28),
            },
          ]}
          onPress={() => {
            router.push({
              pathname: "/(tabs)/activity/scavenger/quest/active",
              params: {
                questId: activeHuntSession.questId,
                profileId: String(activeHuntSession.profileId),
              },
            });
          }}
          accessibilityRole="button"
          accessibilityLabel="Return to active scavenger hunt"
        >
          <MaterialIcons name="travel-explore" size={scaleW(26)} color="#FFFFFF" />
        </Pressable>
      ) : null}
      <NewPlayerTutorial
        visible={tutorialVisible}
        onDismiss={handleTutorialDismiss}
        tabBarHeight={tabBarHeight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layoutWrapper: {
    flex: 1 },
  tabIcon: {},
  tutorialIconWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center" },
  tutorialPulseContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center" },
  tutorialPulseRing: {
    position: "absolute",
    borderColor: "rgba(255,255,255,0.9)" },
  activeSessionBanner: {
    position: "absolute",
    zIndex: 20,
    elevation: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(79,111,82,0.82)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8 },
  notificationPromptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24 },
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
