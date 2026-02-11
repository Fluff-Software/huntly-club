import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
      <View className="flex-1" style={{ backgroundColor: HUNTLY_GREEN }}>
        <StatusBar style="light" />
        <Stack.Screen options={{ title: "Authentication", headerShown: false }} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              padding: scaleW(20),
            }}
            keyboardShouldPersistTaps="handled"
          >
            {mode === AuthScreenMode.LOGIN ? (
              <LoginForm onCreateAccount={() => router.replace("/sign-up")} />
            ) : (
              <SignUpForm onLoginInstead={() => setMode(AuthScreenMode.LOGIN)} />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View className="flex-1 relative">
      <StatusBar style="light" />
      <Stack.Screen options={{ title: "Authentication", headerShown: false }} />
      <View className="absolute top-0 left-0 right-0 items-center" style={{ width }}>
        <Image
          source={require("@/assets/images/huntly-world-background.png")}
          style={{ width, height: heroHeight }}
          resizeMode="cover"
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
          {/* Characters behind - inline with banner */}
          <View
            style={{
              position: "absolute",
              left: scaleW(20),
              top: scaleW(-60),
              width: scaleW(130),
              height: scaleW(150),
              zIndex: 1,
              transform: [{ rotate: "-10deg" }],
            }}
          >
            <Image
              source={require("@/assets/images/bear-wave.png")}
              resizeMode="contain"
              style={{ width: scaleW(150), height: scaleW(150) }}
            />
          </View>
          <View
            style={{
              position: "absolute",
              left: scaleW(85),
              top: scaleW(-82),
              width: scaleW(170),
              height: scaleW(170),
              zIndex: 2,
            }}
          >
            <Image
              source={require("@/assets/images/fox.png")}
              resizeMode="contain"
              style={{ width: scaleW(170), height: scaleW(170) }}
            />
          </View>
          <View
            style={{
              position: "absolute",
              left: scaleW(169),
              top: scaleW(-65),
              width: scaleW(150),
              height: scaleW(150),
              zIndex: 1,
              transform: [{ rotate: "10deg" }],
            }}
          >
            <Image
              source={require("@/assets/images/otter.png")}
              resizeMode="contain"
              style={{ width: scaleW(150), height: scaleW(150) }}
            />
          </View>
          {/* Banner in front - big, on top */}
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: scaleW(350),
              height: scaleW(175),
              zIndex: 2,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              source={require("@/assets/images/huntly-world-banner.png")}
              resizeMode="contain"
              style={{ width: scaleW(300), height: scaleW(300) }}
            />
          </View>
        </Animated.View>
      </View>
      {/* Bottom section: slogan + buttons on green */}
      <View
        style={{
          position: "absolute",
          width: scaleW(800),
          top: heroHeight - scaleW(36),
          left: -scaleW(200),
          bottom: 0,
          backgroundColor: HUNTLY_GREEN,
          borderTopLeftRadius: "50%",
          borderTopRightRadius: "50%",
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
            left: 0,
            right: 0,
            top: scaleW(100),
            paddingHorizontal: scaleW(24),
            paddingTop: scaleW(24),
            paddingBottom: scaleW(40),
            alignItems: "center",
          }}
        >
          <Animated.View entering={FadeInDown.duration(500).delay(150).springify().damping(18)}>
            <ThemedText
              type="heading"
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                marginBottom: scaleW(80),
                textAlign: "center",
                fontWeight: "600",
                fontSize: scaleW(26),
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
    </View>
  );
}
