import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { PRIVACY_POLICY_SECTIONS } from "@/constants/privacyPolicy";

const COLORS = {
  darkGreen: "#4F6F52",
  white: "#FFFFFF",
  slate: "#5a6b5d",
};

export default function PrivacyScreen() {
  const { scaleW } = useLayoutScale();

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          title: "Privacy Policy",
          headerShown: false,
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            padding: scaleW(24),
            paddingBottom: scaleW(40),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="title" style={[styles.title, { marginBottom: scaleW(12) }]}>
          Privacy Policy
        </ThemedText>
        <ThemedText type="body" style={[styles.intro, { marginBottom: scaleW(24) }]}>
          Huntly World respects your privacy. This policy explains how we collect, use and protect your information when you use our app.
        </ThemedText>
        {PRIVACY_POLICY_SECTIONS.map((section) => (
          <View key={section.title} style={{ marginBottom: scaleW(20) }}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>
            <ThemedText type="body" style={styles.sectionBody}>
              {section.body}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { backgroundColor: COLORS.white },
  scroll: { flex: 1, backgroundColor: COLORS.white },
  content: {},
  title: { color: COLORS.darkGreen },
  intro: { color: COLORS.slate },
  sectionTitle: { color: COLORS.darkGreen, marginBottom: 6 },
  sectionBody: { color: COLORS.slate },
});
