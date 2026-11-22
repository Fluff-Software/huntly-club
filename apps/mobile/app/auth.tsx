import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring } from "react-native-reanimated";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image as ExpoImage } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { SignUpForm } from "@/components/authentication/SignUpForm";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { GrownUpWelcome } from "@/components/onboarding/GrownUpWelcome";
import { SignInScreen } from "@/components/onboarding/SignInScreen";

const HUNTLY_GREEN = "#4F6F52";
const GRADIENT_TOP = "#8FA5EE";
const BUTTON_BG = "#F4F0EB";
const AUTH_LOGO = require("@/assets/images/logo.png");

enum AuthScreenMode {
  WELCOME,
  LOGIN,
  SIGNUP }

export default function AuthScreen() {
  const [mode, setMode] = useState(AuthScreenMode.WELCOME);
  const { scaleW, width } = useLayoutScale();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();

  const heroHeight = scaleW(350);
  const getStartedScale = useSharedValue(1);
  const loginScale = useSharedValue(1);

  const getStartedAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: getStartedScale.value }] }));
  const loginAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: loginScale.value }] }));

  useEffect(() => {
    if (params.mode === "signup") setMode(AuthScreenMode.SIGNUP);
    if (params.mode === "login") setMode(AuthScreenMode.LOGIN);
  }, [params.mode]);

  if (mode === AuthScreenMode.LOGIN) {
    return (
      <>
        <Stack.Screen options={{ title: "Sign in", headerShown: false }} />
        <SignInScreen onBack={() => setMode(AuthScreenMode.WELCOME)} onCreateAccount={() => router.replace("/sign-up/players")} />
      </>
    );
  }

  if (mode !== AuthScreenMode.WELCOME) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: HUNTLY_GREEN }} edges={["top", "left", "right"]}>
        <StatusBar style="light" />
        <Stack.Screen options={{ title: "Authentication", headerShown: false }} />
        <KeyboardAvoidingView
          behavior="padding"
          className="flex-1"
          enabled={Platform.OS !== "ios"}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingHorizontal: scaleW(20),
              paddingVertical: scaleW(24) }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            <SignUpForm onLoginInstead={() => setMode(AuthScreenMode.LOGIN)} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Welcome", headerShown: false }} />
      <GrownUpWelcome
        onStart={() => router.push("/sign-up/players")}
        onLogin={() => setMode(AuthScreenMode.LOGIN)}
      />
    </>
  );
}
