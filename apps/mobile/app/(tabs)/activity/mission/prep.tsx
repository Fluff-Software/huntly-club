import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { getActivityById } from "@/services/packService";
import type { Activity } from "@/types/activity";
import type { PrepChecklistItem } from "@/types/activity";

const DARK_HEADER = "#5D4E37";
const LIGHT_GREEN_BG = "#E8F0E8";
const CARD_GREEN = "#C5D9C5";
const HUNTLY_GREEN = "#4F6F52";
const CHECK_GREEN = "#2D5A27";

export default function PrepScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { scaleW } = useLayoutScale();
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
    transform: [{ scale: buttonScale.value }],
  }));

  const handleStart = () => {
    if (!activity?.id) return;
    router.push({
      pathname: "/(tabs)/activity/mission/steps",
      params: { id: String(activity.id), step: "0" },
    });
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: scaleW(24),
        },
        errorText: { fontSize: scaleW(17), color: "#2F3336", textAlign: "center" },
        header: {
          backgroundColor: DARK_HEADER,
          paddingVertical: scaleW(24),
          paddingHorizontal: scaleW(24),
          borderBottomLeftRadius: scaleW(24),
          borderBottomRightRadius: scaleW(24),
        },
        headerTitle: {
          fontSize: scaleW(24),
          fontWeight: "700",
          color: "#FFF",
          textAlign: "center",
          marginBottom: scaleW(8),
        },
        headerSubtext: {
          fontSize: scaleW(15),
          color: "rgba(255,255,255,0.85)",
          textAlign: "center",
        },
        scroll: { flex: 1, backgroundColor: LIGHT_GREEN_BG },
        scrollContent: { padding: scaleW(20), paddingBottom: scaleW(120) },
        card: {
          backgroundColor: CARD_GREEN,
          borderRadius: scaleW(16),
          padding: scaleW(16),
          marginBottom: scaleW(14),
          flexDirection: "row",
          alignItems: "flex-start",
          gap: scaleW(14),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        },
        checkbox: {
          width: scaleW(28),
          height: scaleW(28),
          borderRadius: scaleW(6),
          borderWidth: 2,
          borderColor: CHECK_GREEN,
          alignItems: "center",
          justifyContent: "center",
        },
        checkboxChecked: { backgroundColor: CHECK_GREEN },
        cardBody: { flex: 1 },
        cardTitle: { fontSize: scaleW(17), fontWeight: "700", color: "#2F3336", marginBottom: scaleW(4) },
        cardDesc: { fontSize: scaleW(14), color: "#5a5a5a", lineHeight: scaleW(20) },
        footerText: {
          fontSize: scaleW(14),
          color: "#5a5a5a",
          textAlign: "center",
          marginBottom: scaleW(16),
        },
        startButton: {
          backgroundColor: HUNTLY_GREEN,
          borderRadius: scaleW(28),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(32),
          alignSelf: "stretch",
          alignItems: "center",
        },
        startButtonText: { fontSize: scaleW(18), fontWeight: "700", color: "#FFF" },
        footer: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: scaleW(20),
          paddingBottom: scaleW(24),
          backgroundColor: LIGHT_GREEN_BG,
        },
      }),
    [scaleW]
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
          Check off what you&apos;ve got. Bella won&apos;t send you in unprepared.
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
              entering={FadeInDown.duration(380).delay(80 + index * 60)}
              style={styles.card}
            >
              <Pressable
                onPress={() => toggleCheck(index)}
                style={[styles.checkbox, checked[index] && styles.checkboxChecked]}
              >
                {checked[index] && (
                  <MaterialIcons name="check" size={scaleW(18)} color="#FFF" />
                )}
              </Pressable>
              <View style={styles.cardBody}>
                <ThemedText type="heading" style={styles.cardTitle}>
                  {item.title}
                </ThemedText>
                {item.description ? (
                  <ThemedText style={styles.cardDesc}>{item.description}</ThemedText>
                ) : null}
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
      <View style={styles.footer} pointerEvents="box-none">
        <SafeAreaView edges={["bottom"]}>
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
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
