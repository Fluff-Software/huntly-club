import React, { useMemo } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Linking } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import {
  getTrackingLocationGuidance,
  type TrackingLocationIssue,
} from "@/utils/trackingLocationPermission";

const HUNTLY_GREEN = "#4F6F52";

type TrackingLocationAccessPromptProps = {
  status: "loading" | "denied" | "error";
  accessIssue: TrackingLocationIssue | null;
  errorMessage?: string | null;
  onRetry: () => void;
  loadingMessage?: string;
};

export function TrackingLocationAccessPrompt({
  status,
  accessIssue,
  errorMessage,
  onRetry,
  loadingMessage = "Getting your location…",
}: TrackingLocationAccessPromptProps) {
  const { scaleW } = useLayoutScale();
  const guidance = accessIssue ? getTrackingLocationGuidance(accessIssue) : null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: scaleW(24) },
        title: {
          textAlign: "center",
          fontSize: scaleW(17),
          fontWeight: "800",
          color: "#1A2E1E",
          marginTop: scaleW(12),
        },
        message: { textAlign: "center", fontSize: scaleW(15), color: "#2F3336", marginTop: scaleW(8) },
        steps: { marginTop: scaleW(16), alignSelf: "stretch", gap: scaleW(10) },
        step: { fontSize: scaleW(14), color: "#2F3336", lineHeight: scaleW(20) },
        primaryButton: {
          marginTop: scaleW(20),
          backgroundColor: HUNTLY_GREEN,
          borderRadius: scaleW(22),
          paddingVertical: scaleW(12),
          paddingHorizontal: scaleW(24),
          alignSelf: "stretch",
          alignItems: "center",
        },
        secondaryButton: {
          marginTop: scaleW(12),
          borderRadius: scaleW(22),
          paddingVertical: scaleW(12),
          paddingHorizontal: scaleW(24),
          alignSelf: "stretch",
          alignItems: "center",
          borderWidth: 2,
          borderColor: HUNTLY_GREEN,
        },
        buttonText: { color: "#FFF", fontWeight: "800", textAlign: "center" },
        secondaryButtonText: { color: HUNTLY_GREEN, fontWeight: "800", textAlign: "center" },
      }),
    [scaleW]
  );

  if (status === "loading") {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator size="large" color={HUNTLY_GREEN} />
        <ThemedText style={styles.message}>{loadingMessage}</ThemedText>
      </View>
    );
  }

  if (guidance) {
    return (
      <View style={styles.wrap}>
        <ThemedText style={styles.title}>{guidance.title}</ThemedText>
        <View style={styles.steps}>
          {guidance.steps.map((step, index) => (
            <ThemedText key={step} style={styles.step}>
              {index + 1}. {step}
            </ThemedText>
          ))}
        </View>
        <Pressable
          style={styles.primaryButton}
          onPress={() => Linking.openSettings()}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <ThemedText style={styles.buttonText}>Settings</ThemedText>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <ThemedText style={styles.secondaryButtonText}>Try again</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ThemedText style={styles.message}>
        {errorMessage ?? "Something went wrong while getting your location."}
      </ThemedText>
      <Pressable style={styles.primaryButton} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try again">
        <ThemedText style={styles.buttonText}>Try again</ThemedText>
      </Pressable>
    </View>
  );
}
