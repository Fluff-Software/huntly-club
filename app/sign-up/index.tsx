import React, { useState } from "react";
import {
  View,
  Pressable,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ThemedText } from "@/components/ThemedText";
import { useSignUp } from "@/contexts/SignUpContext";

const HUNTLY_GREEN = "#4F6F52";

/** Reference design size (logical pts). Scale layout to current window logical pixels. */
const REFERENCE_WIDTH = 390;
const REFERENCE_HEIGHT = 844;

/** Basic email validation: local@domain.tld */
const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function SignUpParentEmailScreen() {
  const { width, height } = useWindowDimensions();
  const { setParentEmail } = useSignUp();
  const [email, setEmail] = useState("");

  const scaleW = (n: number) => Math.round((width / REFERENCE_WIDTH) * n);
  const scaleH = (n: number) => Math.round((height / REFERENCE_HEIGHT) * n);

  const isEmailValid = isValidEmail(email);

  const handleContinue = () => {
    setParentEmail(email.trim());
    router.replace("/sign-up/players");
  };

  const openPrivacyPolicy = () => {
    router.push("/privacy");
  };

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ title: "Sign up", headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: HUNTLY_GREEN }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: scaleW(24),
            paddingTop: scaleH(80),
            paddingBottom: scaleH(40),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ThemedText
            type="heading"
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{
              textAlign: "center",
              fontWeight: "600",
              fontSize: scaleW(20),
            }}
          >
            Let's save your adventures
          </ThemedText>
          <ThemedText
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{
              textAlign: "center",
              fontSize: scaleW(18),
              opacity: 0.95,
              marginHorizontal: scaleW(20),
              marginTop: scaleH(20),
            }}
          >
            Add a parent email so progress isn't lost.
          </ThemedText>

          <ThemedText
            type="subtitle"
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{
              fontWeight: "600",
              fontSize: scaleW(16),
              marginTop: scaleH(120),
              textAlign: "center",
            }}
          >
            Parent email address
          </ThemedText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="e.g. parent@example.com"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={{
              width: "100%",
              height: scaleH(56),
              backgroundColor: "#FFFFFF",
              borderRadius: scaleW(16),
              paddingHorizontal: scaleW(20),
              fontSize: scaleW(16),
              color: "#36454F",
              marginTop: scaleH(12),
            }}
          />

          <Pressable onPress={openPrivacyPolicy} style={{ marginTop: scaleH(24) }}>
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                fontSize: scaleW(14),
                textAlign: "center",
                opacity: 0.95,
                marginHorizontal: scaleW(40)
              }}
            >
              By continuing, you agree to our{" "}
              <Text style={{ color: "#FFFFFF", textDecorationLine: "underline", fontWeight: "600" }}>
                Privacy Policy.
              </Text>
            </ThemedText>
          </Pressable>

          <View style={{ flex: 1, minHeight: scaleH(80) }} />

          <Pressable
            onPress={handleContinue}
            disabled={!isEmailValid}
            style={{
              alignSelf: "center",
              width: "100%",
              maxWidth: scaleW(220),
              paddingVertical: scaleH(18),
              borderRadius: scaleW(50),
              backgroundColor: isEmailValid ? "#FFFFFF" : "#9CA3AF",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isEmailValid ? 0.3 : 0.1,
              shadowRadius: 4,
              elevation: 2,
              opacity: isEmailValid ? 1 : 0.8,
            }}
          >
            <ThemedText
              type="heading"
              lightColor={isEmailValid ? HUNTLY_GREEN : "#6B7280"}
              darkColor={isEmailValid ? HUNTLY_GREEN : "#6B7280"}
              style={{ fontSize: scaleW(18), fontWeight: "600" }}
            >
              Continue
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
