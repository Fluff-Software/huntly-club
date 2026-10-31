import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FK, FONT } from "@/constants/fieldKit";

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
    isActive: (p) => p.includes("/activity/explore"),
  },
  {
    key: "me",
    label: "Me",
    icon: "person-outline",
    iconActive: "person",
    route: "profile",
    isActive: (_p, r) => ["profile", "journal", "social", "badges", "settings", "parents", "journal-book"].includes(r),
  },
];

/** Page colour behind the floating bar, so the pill sits on the screen it belongs to. */
const PAGE_BEHIND: Record<string, string> = { index: FK.moss, missions: FK.moss };

/**
 * One nav, one colour: the floating ink bar never changes colour between tabs.
 * The active tab is the one sunbeam pill.
 */
export function FloatingTabBar({ state, navigation, disabled }: BottomTabBarProps & { disabled?: boolean }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const routeName = state.routes[state.index]?.name ?? "index";
  const bottom = Platform.OS === "android" ? Math.max(insets.bottom, 12) : Math.max(insets.bottom - 6, 10);

  const go = (item: Item) => {
    if (disabled) return;
    void Haptics.selectionAsync().catch(() => undefined);
    if (item.href) {
      router.push(item.href as never);
      return;
    }
    const target = state.routes.find((r) => r.name === item.route);
    if (!target) return;
    const event = navigation.emit({ type: "tabPress", target: target.key, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(target.name as never);
  };

  return (
    <View style={[styles.outer, { backgroundColor: PAGE_BEHIND[routeName] ?? FK.ink, paddingBottom: bottom }]}>
      <View style={styles.bar}>
        {ITEMS.map((item) => {
          const active = item.isActive(pathname, routeName);
          return (
            <Animated.View key={item.key} layout={LinearTransition.duration(220)} style={active ? styles.activeWrap : styles.itemWrap}>
              <Pressable
                onPress={() => go(item)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={item.label}
                testID={`tab-${item.key}`}
                style={active ? styles.activePill : styles.item}
              >
                <Ionicons name={active ? item.iconActive : item.icon} size={active ? 22 : 24} color={active ? FK.ink : "#E4EADF"} />
                <Text style={active ? styles.activeLabel : styles.label} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 14, paddingTop: 8 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FK.ink,
    borderRadius: 40,
    padding: 7,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  itemWrap: { flex: 1 },
  activeWrap: { flex: 1.7 },
  item: { alignItems: "center", justifyContent: "center", paddingVertical: 8, gap: 3 },
  label: { fontFamily: FONT.displayBold, fontSize: 12, color: "#E4EADF" },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: FK.sunbeam,
    borderRadius: 32,
    paddingVertical: 15,
    paddingHorizontal: 12,
  },
  activeLabel: { fontFamily: FONT.display, fontSize: 17, color: FK.ink },
});
