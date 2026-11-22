import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FK, FONT } from "@/constants/fieldKit";
import { MOVE } from "@/constants/motion";

type Item = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  /** Tab route name, or an absolute path for items that live inside another stack. */
  route?: string;
  href?: string;
  isActive: (pathname: string, routeName: string) => boolean;
};

const ITEMS: Item[] = [
  {
    key: "clubhouse",
    label: "Clubhouse",
    icon: "home-outline",
    iconActive: "home",
    route: "index",
    isActive: (_p, r) => r === "index",
  },
  {
    key: "missions",
    label: "Missions",
    icon: "flag-outline",
    iconActive: "flag",
    route: "missions",
    isActive: (p, r) => r === "missions" || (r === "activity" && p.includes("/activity/mission")),
  },
  {
    key: "explore",
    label: "Explore",
    icon: "compass-outline",
    iconActive: "compass",
    href: "/(tabs)/activity/explore",
    isActive: (p) => p.includes("/activity/explore") && !p.includes("explore-collection") && !p.includes("explore-packs"),
  },
  {
    key: "me",
    label: "Me",
    icon: "person-outline",
    iconActive: "person",
    route: "me",
    isActive: (p, r) =>
      ["me", "reminders", "profile", "badges", "settings", "parents", "journal-book", "resources"].includes(r) ||
      p.includes("/activity/explore-collection") ||
      p.includes("/activity/explore-packs"),
  },
];

const BAR_PADDING = 7;
/** Keeps the bar a comfortable thumb width on tablets and large phones. */
const MAX_BAR_WIDTH = 520;

/** Page colour behind the floating bar, so it sits on the screen it belongs to. */
// "/activity/explore" also covers the binder and packs screens; the map itself is light now.
const MOSS_ACTIVITY_ROUTES = ["/activity/pick-activity", "/activity/explore"];

function pageBehind(pathname: string, routeName: string): string {
  // The campfire screen is black edge to edge.
  if (routeName === "campfire") return "#000";
  if (routeName !== "activity") return FK.moss;
  if (MOSS_ACTIVITY_ROUTES.some((r) => pathname.includes(r))) return FK.moss;
  // The walk/cycle screens are still on the dark forest page.
  return "#2D4A35";
}

/**
 * One nav, one colour: the floating ink bar never changes between tabs. Four equal
 * slots that never reflow; a single sunbeam highlight glides to the active one.
 */
export function FloatingTabBar({ state, navigation, disabled }: BottomTabBarProps & { disabled?: boolean }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, fontScale } = useWindowDimensions();
  const routeName = state.routes[state.index]?.name ?? "index";
  const bottom = Platform.OS === "android" ? Math.max(insets.bottom, 12) : Math.max(insets.bottom - 6, 10);

  const activeIndex = ITEMS.findIndex((item) => item.isActive(pathname, routeName));
  const [barWidth, setBarWidth] = useState(0);
  const slot = barWidth > 0 ? (barWidth - BAR_PADDING * 2) / ITEMS.length : 0;

  // Small phones (SE, mini) get a slightly tighter label; large text settings are respected but capped.
  const compact = screenWidth < 360;
  const labelSize = compact ? 11 : 12.5;

  const x = useSharedValue(0);
  const visible = useSharedValue(activeIndex >= 0 ? 1 : 0);
  const placed = React.useRef(false);

  useEffect(() => {
    if (!slot) return;
    const target = Math.max(activeIndex, 0) * slot;
    // First placement jumps; after that the highlight eases across (no overshoot).
    x.value = placed.current ? withTiming(target, MOVE) : target;
    placed.current = true;
    visible.value = withTiming(activeIndex >= 0 ? 1 : 0, { duration: 160 });
  }, [activeIndex, slot, x, visible]);

  const highlight = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    opacity: visible.value,
  }));

  const go = (item: Item, index: number) => {
    if (disabled) return;
    // Some screens light up a tab they don't live in (the binder lights Me, mission
    // screens light Missions). Only treat it as a re-tap when we're really on that
    // tab's own screen; otherwise tapping it should take you there.
    if (index === activeIndex && !item.href && routeName === item.route) {
      // Re-tapping the current tab: let screens scroll to top, as tabs usually do.
      const target = state.routes.find((r) => r.name === item.route);
      if (target) navigation.emit({ type: "tabPress", target: target.key, canPreventDefault: true });
      return;
    }
    void Haptics.selectionAsync().catch(() => undefined);
    if (item.href) {
      if (index !== activeIndex) router.navigate(item.href as never);
      return;
    }
    const target = state.routes.find((r) => r.name === item.route);
    if (!target) return;
    const event = navigation.emit({ type: "tabPress", target: target.key, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(target.name as never);
  };

  return (
    <View style={[styles.outer, { backgroundColor: pageBehind(pathname, routeName), paddingBottom: bottom }]}>
      <View
        style={[styles.bar, { maxWidth: MAX_BAR_WIDTH }]}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        accessibilityRole="tablist"
      >
        {slot ? (
          <Animated.View pointerEvents="none" style={[styles.highlight, { width: slot }, highlight]} />
        ) : null}
        {ITEMS.map((item, index) => {
          const active = index === activeIndex;
          const colour = active ? FK.ink : "#E4EADF";
          return (
            <Pressable
              key={item.key}
              onPress={() => go(item, index)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              testID={`tab-${item.key}`}
              style={styles.item}
              hitSlop={4}
            >
              <Ionicons name={active ? item.iconActive : item.icon} size={23} color={colour} />
              <Text
                style={[styles.label, { color: colour, fontSize: labelSize }, active && { fontFamily: FONT.display }]}
                numberOfLines={1}
                maxFontSizeMultiplier={Math.min(fontScale, 1.3)}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 14, paddingTop: 8, alignItems: "center" },
  bar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FK.ink,
    borderRadius: 36,
    padding: BAR_PADDING,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  highlight: {
    position: "absolute",
    left: BAR_PADDING,
    top: BAR_PADDING,
    bottom: BAR_PADDING,
    borderRadius: 29,
    backgroundColor: FK.sunbeam,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 9, gap: 3, minHeight: 58 },
  label: { fontFamily: FONT.displayBold },
});
