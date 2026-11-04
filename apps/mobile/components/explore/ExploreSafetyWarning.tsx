/**
 * Safety check shown when opening Explore. Three short rules a child can
 * remember, read together with a grown-up.
 *
 * Rendered as an in-screen overlay (not RN Modal) so it cannot outlive the
 * Explore route when switching tabs.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { FKButton } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";

const RULES = [
  { icon: "eye-outline" as const, title: "Look up", text: "Watch where you're going, not the screen." },
  { icon: "people-outline" as const, title: "Grown-up close by", text: "Explore together, never on your own." },
  {
    icon: "walk-outline" as const,
    title: "Paths and pavements",
    text: "Only go where you're allowed. Not on a bike in traffic or in a car.",
  },
] as const;

type Props = {
  visible: boolean;
  onAccept: () => void;
  onCancel: () => void;
};

export function ExploreSafetyWarning({ visible, onAccept, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.root} accessibilityViewIsModal>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Not now" />
      <Animated.View
        entering={SlideInDown.springify().damping(20).stiffness(180)}
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
      >
        <View style={styles.handle} />
        <Text style={TYPE.eyebrow}>BEFORE YOU HEAD OUT</Text>
        <Text style={[TYPE.title, { marginTop: 4 }]}>Three explorer rules</Text>

        <View style={styles.rules}>
          {RULES.map((r) => (
            <View key={r.title} style={styles.rule}>
              <View style={styles.ruleIcon}>
                <Ionicons name={r.icon} size={22} color={FK.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ruleTitle}>{r.title}</Text>
                <Text style={styles.ruleText}>{r.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <FKButton label="Got it, let's explore" onPress={onAccept} testID="explore-safety-accept" />
        <FKButton label="Not now" variant="link" onPress={onCancel} testID="explore-safety-cancel" />
        <Text style={styles.fine}>Grown-ups are responsible for keeping explorers safe. You can turn this reminder off in Settings.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
    backgroundColor: "rgba(6,12,8,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: FK.moss,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingHorizontal: 22,
    paddingTop: 10,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: "#CBD3C2", marginBottom: 16 },
  rules: { gap: 10, marginTop: 16, marginBottom: 20 },
  rule: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: FK.paper, borderRadius: RADIUS.md, padding: 14 },
  ruleIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: FK.sunbeam, alignItems: "center", justifyContent: "center" },
  ruleTitle: { fontFamily: FONT.display, fontSize: 17, color: FK.ink },
  ruleText: { fontFamily: FONT.body, fontSize: 15, lineHeight: 20, color: FK.muted, marginTop: 2 },
  fine: { ...TYPE.bodySmall, fontSize: 13, lineHeight: 18, textAlign: "center" },
});
