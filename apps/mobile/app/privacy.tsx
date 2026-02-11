import React from "react";
import { ScrollView } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/ui/Button";
import { useLayoutScale } from "@/hooks/useLayoutScale";

export default function PrivacyScreen() {
  const { scaleW } = useLayoutScale();

  return (
    <>
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          title: "Privacy Policy",
          headerBackTitle: "Back",
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: scaleW(24),
          paddingBottom: scaleW(40),
        }}
      >
        <ThemedText type="title" style={{ marginBottom: scaleW(16) }}>
          Privacy Policy
        </ThemedText>
        <ThemedText type="body" style={{ marginBottom: scaleW(12) }}>
          Huntly Club respects your privacy. This page is a placeholder for your full privacy policy.
        </ThemedText>
        <ThemedText type="body" style={{ marginBottom: scaleW(24) }}>
          Add your privacy policy content here.
        </ThemedText>
        <Button variant="primary" size="large" onPress={() => router.back()}>
          Back
        </Button>
      </ScrollView>
    </>
  );
}
