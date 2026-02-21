import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Modal, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useSignUpOptional } from "@/contexts/SignUpContext";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { PostSignUpWelcome } from "@/components/PostSignUpWelcome";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/ui/Button";
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

export default function TabLayout() {
  const { user } = useAuth();
  const { currentPlayer } = usePlayer();
  const { scaleW } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const signUpContext = useSignUpOptional();
  const showPostSignUpWelcome = signUpContext?.showPostSignUpWelcome ?? false;
  const setShowPostSignUpWelcome = signUpContext?.setShowPostSignUpWelcome;
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [notificationPromptChecking, setNotificationPromptChecking] = useState(true);

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

  return (
    <>
      <PostSignUpWelcome
        visible={showPostSignUpWelcome}
        onDismiss={() => setShowPostSignUpWelcome?.(false)}
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
            >
              Would you like to be notified when new chapters are available?
            </ThemedText>
            <ThemedText
              style={{ marginBottom: scaleW(24), textAlign: "center", fontSize: scaleW(14), opacity: 0.9 }}
            >
              Get notified when a new chapter is ready to read.
            </ThemedText>
            <View style={{ gap: scaleW(12) }}>
              <Button variant="primary" onPress={handleNotificationPromptYes}>
                Yes, notify me
              </Button>
              <Button variant="cancel" onPress={handleNotificationPromptNotNow}>
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
          marginTop: scaleW(4),
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
            <TabIcon source={HOME_STORY} color={color} size={scaleW(24)} />
          ),
          href: currentPlayer ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: "Missions",
          tabBarIcon: ({ color }) => (
            <TabIcon source={HOME_MISSIONS} color={color} size={scaleW(24)} />
          ),
          href: currentPlayer ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: "Team",
          tabBarIcon: ({ color }) => (
            <TabIcon source={HOME_TEAM} color={color} size={scaleW(24)} />
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
    </>
  );
}

const styles = StyleSheet.create({
  tabIcon: {},
  notificationPromptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  notificationPromptCard: {
    backgroundColor: "#F8F7F4",
    maxWidth: 360,
    width: "100%",
  },
});
