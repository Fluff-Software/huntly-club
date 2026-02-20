import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { LoginForm } from "@/components/authentication/LoginForm";
import { SignUpForm } from "@/components/authentication/SignUpForm";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const HUNTLY_GREEN = "#4F6F52";
const GRADIENT_TOP = "#8FA5EE";
const BUTTON_BG = "#F4F0EB";

enum AuthScreenMode {
  WELCOME,
  LOGIN,
  SIGNUP,
}

export default function AuthScreen() {
  const [mode, setMode] = useState(AuthScreenMode.WELCOME);
  const { scaleW, width } = useLayoutScale();
  const params = useLocalSearchParams<{ mode?: string }>();

  const heroHeight = scaleW(350);
  const getStartedScale = useSharedValue(1);
  const loginScale = useSharedValue(1);

  const getStartedAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: getStartedScale.value }],
  }));
  const loginAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: loginScale.value }],
  }));

  useEffect(() => {
    if (params.mode === "signup") setMode(AuthScreenMode.SIGNUP);
    if (params.mode === "login") setMode(AuthScreenMode.LOGIN);
  }, [params.mode]);

  if (mode !== AuthScreenMode.WELCOME) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: HUNTLY_GREEN }} edges={["top", "left", "right"]}>
        <StatusBar style="light" />
        <Stack.Screen options={{ title: "Authentication", headerShown: false }} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              paddingHorizontal: scaleW(20),
              paddingVertical: scaleW(24),
            }}
          >
            {mode === AuthScreenMode.LOGIN ? (
              <LoginForm onCreateAccount={() => router.replace("/get-started")} />
            ) : (
              <SignUpForm onLoginInstead={() => setMode(AuthScreenMode.LOGIN)} />
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 relative" edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <Stack.Screen options={{ title: "Authentication", headerShown: false }} />
      <View className="absolute top-0 left-0 right-0 items-center overflow-hidden" style={{ width, height: heroHeight }}>
        <Image
          source={require("@/assets/images/huntly-world-background.png")}
          style={{ width, height: heroHeight }}
          resizeMode="cover"
        />
        <BlurView
          intensity={10}
          tint="dark"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width,
            height: heroHeight,
          }}
        />
      </View>
      {/* Characters + banner in front of bottom section */}
      <View
        pointerEvents="box-none"
        style={{
          flex: 1,
          width,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        <Animated.View
          entering={FadeInDown.duration(600).delay(0).springify().damping(18)}
          style={{
            width: scaleW(350),
            height: scaleW(228),
            position: "relative",
            marginTop: scaleW(-100),
          }}
        >
          {/* Logo - centered in 350-wide container */}
          <View
            style={{
              position: "absolute",
          
              top: scaleW(-160),
              width: scaleW(350),
              height: scaleW(350),
              zIndex: 1,
            }}
          >
            <Image
              source={require("@/assets/images/logo.png")}
              resizeMode="contain"
              style={{ width: "100%", height: "100%" }}
            />
          </View>
         
        </Animated.View>
      </View>
      {/* Bottom section: slogan + buttons on green */}
      <View
        style={{
          position: "absolute",
          width: width * 2,
          top: heroHeight - scaleW(80),
          left: -width / 2,
          bottom: 0,
          backgroundColor: HUNTLY_GREEN,
          borderTopLeftRadius: width,
          borderTopRightRadius: width,
          zIndex: 1,
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={[GRADIENT_TOP, "transparent"]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "100%",
            opacity: 0.25,
          }}
        />
        <View
          style={{
            position: "absolute",
            left: width / 2,
            right: 0,
            top: scaleW(180),
            paddingHorizontal: scaleW(24),
            paddingTop: scaleW(24),
            paddingBottom: scaleW(40),
            alignItems: "center",
            width: width,
          }}
        >
          <Animated.View entering={FadeInDown.duration(500).delay(150).springify().damping(18)}>
            <ThemedText
              type="heading"
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                marginBottom: scaleW(60),
                marginTop: scaleW(20),
                textAlign: "center",
                fontWeight: "600",
                fontSize: scaleW(28),
                lineHeight: scaleW(36),
              }}
            >
              Where curiosity grows.
            </ThemedText>
          </Animated.View>
          <Animated.View
            entering={FadeInDown.duration(500).delay(280).springify().damping(18)}
            style={getStartedAnimatedStyle}
          >
            <Pressable
              onPress={() => router.push("/get-started")}
              onPressIn={() => {
                getStartedScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                getStartedScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
              style={{
                width: scaleW(240),
                paddingVertical: scaleW(20),
                borderRadius: 999,
                backgroundColor: BUTTON_BG,
                marginBottom: scaleW(40),
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <ThemedText type="heading" style={{ color: HUNTLY_GREEN, fontSize: scaleW(16), fontWeight: "600" }}>
                Get started
              </ThemedText>
            </Pressable>
          </Animated.View>
          <Animated.View
            entering={FadeInDown.duration(500).delay(380).springify().damping(18)}
            style={loginAnimatedStyle}
          >
            <Pressable
              onPress={() => setMode(AuthScreenMode.LOGIN)}
              onPressIn={() => {
                loginScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                loginScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
              style={{
                width: scaleW(240),
                paddingVertical: scaleW(20),
                borderRadius: 999,
                backgroundColor: BUTTON_BG,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <ThemedText type="heading" style={{ color: HUNTLY_GREEN, fontSize: scaleW(16), fontWeight: "600" }}>
                I already have an account
              </ThemedText>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}
