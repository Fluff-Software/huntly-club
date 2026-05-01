import React, { useMemo, useState } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useUser } from "@/contexts/UserContext";

const FOREST_DARK = "#2D4A35";
const LIGHT_GREEN_BG = "#EEF5EE";
const CARD_BG = "#FFF";
const CARD_CHECKED_BG = "#D8EDD8";
const HUNTLY_GREEN = "#4F6F52";
const CHECK_GREEN = "#2D5A27";

const WALK_CHECKLIST = ["Find your adult", "Choose a route"] as const;

export default function WalkPrepScreen() {
  const router = useRouter();
  const { scaleW, isTablet } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const { teamId } = useUser();
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const allChecked = WALK_CHECKLIST.every((_, i) => checked[i]);
  const toggleCheck = (index: number) => {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: FOREST_DARK },
        header: {
          backgroundColor: FOREST_DARK,
          paddingTop: scaleW(24),
          paddingBottom: scaleW(18),
          paddingHorizontal: scaleW(16),
          borderBottomLeftRadius: scaleW(28),
          borderBottomRightRadius: scaleW(28),
          flexDirection: "row",
          alignItems: "center" },
        backButton: {
          width: scaleW(42),
          height: scaleW(42),
          borderRadius: scaleW(21),
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.14)" },
        headerTextWrap: { flex: 1, alignItems: "center" },
        headerTitle: {
          fontSize: scaleW(22),
          fontWeight: "700",
          color: "#FFF",
          textAlign: "center" },
        headerSubtext: {
          marginTop: scaleW(4),
          fontSize: scaleW(14),
          color: "rgba(255,255,255,0.75)",
          textAlign: "center" },
        headerRightSpacer: { width: scaleW(42) },
        scroll: { flex: 1, backgroundColor: LIGHT_GREEN_BG },
        scrollContent: { padding: scaleW(16), paddingBottom: scaleW(140) },
        card: {
          backgroundColor: CARD_BG,
          borderRadius: scaleW(16),
          padding: scaleW(18),
          marginBottom: scaleW(10),
          flexDirection: "row",
          alignItems: "center",
          gap: scaleW(14),
          shadowColor: "#2D4A35",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2 },
        cardChecked: { backgroundColor: CARD_CHECKED_BG },
        checkbox: {
          width: scaleW(28),
          height: scaleW(28),
          borderRadius: scaleW(14),
          borderWidth: 2,
          borderColor: HUNTLY_GREEN,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0 },
        checkboxChecked: {
          backgroundColor: CHECK_GREEN,
          borderColor: CHECK_GREEN },
        cardTitle: {
          fontSize: scaleW(16),
          fontWeight: "700",
          color: "#1A2E1E" },
        cardTitleChecked: {
          color: "#4F6F52",
          textDecorationLine: "line-through" },
        footer: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: scaleW(12),
          paddingHorizontal: scaleW(20),
          paddingBottom: insets.bottom + scaleW(12) + (isTablet ? scaleW(40) : 0),
          backgroundColor: LIGHT_GREEN_BG,
          borderTopWidth: 1,
          borderTopColor: "rgba(79,111,82,0.1)" },
        footerHint: {
          fontSize: scaleW(14),
          color: "#5a5a5a",
          textAlign: "center",
          marginBottom: scaleW(12) },
        startButton: {
          backgroundColor: HUNTLY_GREEN,
          borderRadius: scaleW(28),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(32),
          alignSelf: "stretch",
          alignItems: "center",
          opacity: allChecked && teamId != null ? 1 : 0.6 },
        startButtonText: { fontSize: scaleW(18), fontWeight: "800", color: "#FFF" } }),
    [scaleW, insets.bottom, isTablet, allChecked, teamId]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(tabs)")} style={styles.backButton}>
          <MaterialIcons name="chevron-left" size={scaleW(28)} color="#FFF" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <ThemedText type="heading" style={styles.headerTitle}>
            Before you walk…
          </ThemedText>
          <ThemedText style={styles.headerSubtext}>
            Tick these off, then you&apos;re ready!
          </ThemedText>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {WALK_CHECKLIST.map((title, index) => (
          <Pressable
            key={title}
            onPress={() => toggleCheck(index)}
            style={[styles.card, checked[index] && styles.cardChecked]}
          >
            <View style={[styles.checkbox, checked[index] && styles.checkboxChecked]}>
              {checked[index] && (
                <MaterialIcons name="check" size={scaleW(16)} color="#FFF" />
              )}
            </View>
            <ThemedText
              type="heading"
              style={[styles.cardTitle, checked[index] && styles.cardTitleChecked]}
            >
              {title}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.footer} pointerEvents="box-none">
        <ThemedText style={styles.footerHint}>
          {teamId == null
            ? "Join a team."
            : allChecked
            ? "Awesome — let’s go!"
            : "Check both boxes to continue."}
        </ThemedText>
        <Pressable
          style={styles.startButton}
          disabled={!allChecked || teamId == null}
          onPress={() => router.push("/(tabs)/activity/walk-map")}
        >
          <ThemedText type="heading" style={styles.startButtonText}>
            Let&apos;s Go!
          </ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

