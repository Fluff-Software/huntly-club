import React, { useMemo, useState } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { usePlayer } from "@/contexts/PlayerContext";

const FOREST_DARK = "#2D4A35";
const LIGHT_BG = "#EEF0F7";
const CARD_BG = "#FFF";
const CARD_SELECTED_BG = "#DEE5F8";
const EXPLORE_BLUE = "#3E63C9";

export default function ExplorePrepScreen() {
  const router = useRouter();
  const { scaleW, isTablet } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const { profiles } = usePlayer();
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(
    profiles.length === 1 ? profiles[0]!.id : null
  );

  const canContinue = selectedProfileId != null;

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
        headerTitle: { fontSize: scaleW(22), fontWeight: "700", color: "#FFF", textAlign: "center" },
        headerSubtext: {
          marginTop: scaleW(4),
          fontSize: scaleW(14),
          color: "rgba(255,255,255,0.75)",
          textAlign: "center" },
        headerRightSpacer: { width: scaleW(42) },
        scroll: { flex: 1, backgroundColor: LIGHT_BG },
        scrollContent: { padding: scaleW(16), paddingBottom: scaleW(140) },
        intro: { fontSize: scaleW(14), color: "#3a3a3a", marginBottom: scaleW(14), lineHeight: scaleW(20) },
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
        cardSelected: { backgroundColor: CARD_SELECTED_BG },
        radio: {
          width: scaleW(26),
          height: scaleW(26),
          borderRadius: scaleW(13),
          borderWidth: 2,
          borderColor: EXPLORE_BLUE,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0 },
        radioDot: { width: scaleW(14), height: scaleW(14), borderRadius: scaleW(7), backgroundColor: EXPLORE_BLUE },
        cardTitle: { fontSize: scaleW(16), fontWeight: "700", color: "#1A2333" },
        footer: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: scaleW(12),
          paddingHorizontal: scaleW(20),
          paddingBottom: insets.bottom + scaleW(12) + (isTablet ? scaleW(40) : 0),
          backgroundColor: LIGHT_BG,
          borderTopWidth: 1,
          borderTopColor: "rgba(62,99,201,0.12)" },
        footerHint: { fontSize: scaleW(14), color: "#5a5a5a", textAlign: "center", marginBottom: scaleW(12) },
        startButton: {
          backgroundColor: EXPLORE_BLUE,
          borderRadius: scaleW(28),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(32),
          alignSelf: "stretch",
          alignItems: "center",
          opacity: canContinue ? 1 : 0.6 },
        startButtonText: { fontSize: scaleW(18), fontWeight: "800", color: "#FFF" } }),
    [scaleW, insets.bottom, isTablet, canContinue]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(tabs)")} style={styles.backButton}>
          <MaterialIcons name="chevron-left" size={scaleW(28)} color="#FFF" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <ThemedText type="heading" style={styles.headerTitle}>
            Card Hunt
          </ThemedText>
          <ThemedText style={styles.headerSubtext}>Who's opening packs today?</ThemedText>
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
        <ThemedText style={styles.intro}>
          Head out and explore the map — get close to a marker to check in and open a pack for
          your card binder.
        </ThemedText>
        {profiles.map((profile) => {
          const selected = selectedProfileId === profile.id;
          return (
            <Pressable
              key={profile.id}
              onPress={() => setSelectedProfileId(profile.id)}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <View style={styles.radio}>{selected && <View style={styles.radioDot} />}</View>
              <ThemedText type="heading" style={styles.cardTitle}>
                {profile.nickname || profile.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer} pointerEvents="box-none">
        <ThemedText style={styles.footerHint}>
          {canContinue ? "Ready to go!" : "Choose who's exploring."}
        </ThemedText>
        <Pressable
          style={styles.startButton}
          disabled={!canContinue}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/activity/explore-map",
              params: { profileId: String(selectedProfileId) },
            })
          }
        >
          <ThemedText type="heading" style={styles.startButtonText}>
            Let&apos;s Go!
          </ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
