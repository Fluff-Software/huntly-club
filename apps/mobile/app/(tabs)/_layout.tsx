import { Tabs } from "expo-router";
import { Image, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "@/contexts/PlayerContext";
import { useSignUpOptional } from "@/contexts/SignUpContext";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { PostSignUpWelcome } from "@/components/PostSignUpWelcome";

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
  const { currentPlayer } = usePlayer();
  const { scaleW } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const signUpContext = useSignUpOptional();
  const showPostSignUpWelcome = signUpContext?.showPostSignUpWelcome ?? false;
  const setShowPostSignUpWelcome = signUpContext?.setShowPostSignUpWelcome;

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
});
