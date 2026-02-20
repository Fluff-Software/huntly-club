import React from "react";
import { ScrollView, StyleSheet, View, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

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
      <View style={[styles.header, { paddingHorizontal: scaleW(16), paddingVertical: scaleW(12) }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { 
              padding: scaleW(8),
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialIcons name="arrow-back" size={scaleW(24)} color={COLORS.darkGreen} />
        </Pressable>
      </View>
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
  header: { backgroundColor: COLORS.white, flexDirection: "row", alignItems: "center" },
  backButton: { borderRadius: 8 },
  scroll: { flex: 1, backgroundColor: COLORS.white },
  content: {},
  title: { color: COLORS.darkGreen },
  intro: { color: COLORS.slate },
  sectionTitle: { color: COLORS.darkGreen, marginBottom: 6 },
  sectionBody: { color: COLORS.slate },
});
