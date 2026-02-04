import React from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/ui/Button";

const REFERENCE_WIDTH = 390;

export default function PrivacyScreen() {
  const { width } = useWindowDimensions();
  const scaleW = (n: number) => Math.round((width / REFERENCE_WIDTH) * n);

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
          paddingBottom: 40,
        }}
      >
        <ThemedText type="title" style={{ marginBottom: 16 }}>
          Privacy Policy
        </ThemedText>
        <ThemedText type="body" style={{ marginBottom: 12 }}>
          Huntly Club respects your privacy. This page is a placeholder for your full privacy policy.
        </ThemedText>
        <ThemedText type="body" style={{ marginBottom: 24 }}>
          Add your privacy policy content here.
        </ThemedText>
        <Button variant="primary" size="large" onPress={() => router.back()}>
          Back
        </Button>
      </ScrollView>
    </>
  );
}
