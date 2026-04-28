import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring } from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { getActivityById } from "@/services/packService";
import { useUser } from "@/contexts/UserContext";
import { isStartMissionOnboardingActive } from "@/constants/startMissionOnboarding";
import type { Activity } from "@/types/activity";
import type { PrepChecklistItem } from "@/types/activity";

const FOREST_DARK = "#2D4A35";
const LIGHT_GREEN_BG = "#EEF5EE";
const CARD_BG = "#FFF";
const CARD_CHECKED_BG = "#D8EDD8";
const HUNTLY_GREEN = "#4F6F52";
const CHECK_GREEN = "#2D5A27";

export default function PrepScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { scaleW, isTablet } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const { userData } = useUser();
  const onboardingActive = isStartMissionOnboardingActive(userData?.start_mission_step);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const loadActivity = useCallback(async () => {
    if (!id) {
      setError("No activity selected");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await getActivityById(Number(id));
      setActivity(data ?? null);
      if (!data) setError("Activity not found");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
      setActivity(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const checklist: PrepChecklistItem[] = useMemo(() => {
    if (!activity?.prep_checklist || activity.prep_checklist.length === 0) return [];
    return activity.prep_checklist;
  }, [activity?.prep_checklist]);

  const allChecked = checklist.length > 0 && checklist.every((_, i) => checked[i]);
  const toggleCheck = (index: number) => {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const buttonScale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }] }));

  const handleStart = () => {
    if (!activity?.id) return;
    router.push({
      pathname: "/(tabs)/activity/mission/steps",
      params: { id: String(activity.id), step: "0" } });
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: FOREST_DARK },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: scaleW(24) },
        errorText: { fontSize: scaleW(17), color: "#2F3336", textAlign: "center" },
        header: {
          backgroundColor: FOREST_DARK,
          paddingTop: scaleW(32),
          paddingBottom: scaleW(28),
          paddingHorizontal: scaleW(24),
          borderBottomLeftRadius: scaleW(28),
          borderBottomRightRadius: scaleW(28) },
        headerTitle: {
          fontSize: scaleW(24),
          fontWeight: "700",
          color: "#FFF",
          textAlign: "center",
          marginBottom: scaleW(6) },
        headerSubtext: {
          fontSize: scaleW(15),
          color: "rgba(255,255,255,0.75)",
          textAlign: "center" },
        scroll: { flex: 1, backgroundColor: LIGHT_GREEN_BG },
        scrollContent: { padding: scaleW(16), paddingBottom: scaleW(120) },
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
        cardChecked: {
          backgroundColor: CARD_CHECKED_BG },
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
        cardBody: { flex: 1 },
        cardTitle: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: "#1A2E1E",
          marginBottom: scaleW(2) },
        cardTitleChecked: {
          color: "#4F6F52",
          textDecorationLine: "line-through" },
        cardDesc: { fontSize: scaleW(14), color: "#5a6e5a", lineHeight: scaleW(20) },
        footerText: {
          fontSize: scaleW(14),
          color: "#5a5a5a",
          textAlign: "center",
          marginBottom: scaleW(16) },
        startButton: {
          backgroundColor: HUNTLY_GREEN,
          borderRadius: scaleW(28),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(32),
          alignSelf: "stretch",
          alignItems: "center" },
        startButtonText: { fontSize: scaleW(18), fontWeight: "700", color: "#FFF" },
        footer: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: scaleW(12),
          paddingHorizontal: scaleW(20),
          paddingBottom:
            insets.bottom +
            (onboardingActive ? scaleW(20) : scaleW(8)) +
            (isTablet ? scaleW(40) : 0),
          backgroundColor: LIGHT_GREEN_BG,
          borderTopWidth: 1,
          borderTopColor: "rgba(79,111,82,0.1)" } }),
    [scaleW, insets.bottom, onboardingActive, isTablet]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={["top", "left", "right"]}>
        <ActivityIndicator size="large" color={HUNTLY_GREEN} />
        <ThemedText style={[styles.errorText, { marginTop: scaleW(16) }]}>Loading…</ThemedText>
      </SafeAreaView>
    );
  }

  if (error || !activity) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={["top", "left", "right"]}>
        <ThemedText style={styles.errorText}>{error ?? "Activity not found"}</ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <ThemedText type="heading" style={styles.headerTitle}>
          Before you start…
        </ThemedText>
        <ThemedText style={styles.headerSubtext}>
          Here's what you'll need.
        </ThemedText>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {checklist.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
            <ThemedText style={styles.cardDesc}>No prep items — tap below when you&apos;re ready.</ThemedText>
          </Animated.View>
        ) : (
          checklist.map((item, index) => (
            <Animated.View
              key={index}
            >
              <Pressable
                onPress={() => toggleCheck(index)}
                style={[styles.card, checked[index] && styles.cardChecked]}
              >
                <View style={[styles.checkbox, checked[index] && styles.checkboxChecked]}>
                  {checked[index] && (
                    <MaterialIcons name="check" size={scaleW(16)} color="#FFF" />
                  )}
                </View>
                <View style={styles.cardBody}>
                  <ThemedText
                    style={[styles.cardTitle, checked[index] && styles.cardTitleChecked]}
                  >
                    {item.title}
                  </ThemedText>
                  {item.description ? (
                    <ThemedText style={styles.cardDesc}>{item.description}</ThemedText>
                  ) : null}
                </View>
              </Pressable>
            </Animated.View>
          ))
        )}
      </ScrollView>
      <View style={styles.footer} pointerEvents="box-none">
        <View>
          {allChecked && (
            <ThemedText style={styles.footerText}>Looking good — ready to go!</ThemedText>
          )}
          <Animated.View style={buttonStyle}>
            <Pressable
              onPress={handleStart}
              onPressIn={() => {
                buttonScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                buttonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
              style={styles.startButton}
            >
              <ThemedText type="heading" style={styles.startButtonText}>
                I&apos;m ready — start the mission!
              </ThemedText>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}
