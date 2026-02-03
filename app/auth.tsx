import React, { useState } from "react";
import {
  View,
  Image,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { LoginForm } from "@/components/authentication/LoginForm";
import { SignUpForm } from "@/components/authentication/SignUpForm";

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
  const { width, height } = useWindowDimensions();
  const heroHeight = height * 0.45;

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
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {mode === AuthScreenMode.LOGIN ? (
              <LoginForm onCreateAccount={() => setMode(AuthScreenMode.SIGNUP)} />
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
      {/* Banner in front + Characters behind */}
      <View
        style={{
          flex: 1,
          width,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 350,
            height: 228,
            position: "relative",
            marginTop: -60,
          }}
        >
          {/* Characters behind - inline with banner */}
          <View
            style={{
              position: "absolute",
              left: 5,
              top: -85,
              width: 169,
              height: 169,
              zIndex: 1,
              transform: [{ rotate: "-10deg" }],
            }}
          >
            <Image
              source={require("@/assets/images/bear-wave.png")}
              resizeMode="contain"
              style={{ width: 169, height: 169 }}
            />
          </View>
          <View style={{ position: "absolute", left: 78, top: -107, width: 195, height: 195, zIndex: 2 }}>
            <Image
              source={require("@/assets/images/fox.png")}
              resizeMode="contain"
              style={{ width: 195, height: 195 }}
            />
          </View>
          <View
            style={{
              position: "absolute",
              left: 175,
              top: -85,
              width: 169,
              height: 169,
              zIndex: 1,
              transform: [{ rotate: "10deg" }],
            }}
          >
            <Image
              source={require("@/assets/images/otter.png")}
              resizeMode="contain"
              style={{ width: 169, height: 169 }}
            />
          </View>
          {/* Banner in front - big, on top */}
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 350,
              height: 175,
              zIndex: 2,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              source={require("@/assets/images/huntly-world-banner.png")}
              resizeMode="contain"
              style={{ width: 350, height: 350 }}
            />
          </View>
        </View>
      </View>
      {/* Bottom section: slogan + buttons on green */}
      <View
        style={{
          position: "absolute",
          width: "200%",
          top: heroHeight - (width * 0.1),
          left: -width / 2,
          bottom: 0,
          backgroundColor: HUNTLY_GREEN,
          borderTopLeftRadius: "200%",
          borderTopRightRadius: "200%",
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
            top: 100,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
            alignItems: "center",
          }}
        >
          <ThemedText
            type="heading"
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{ marginBottom: 80, textAlign: "center", fontWeight: "600", fontSize: 28 }}
          >
            Where curiosity grows.
          </ThemedText>
          <Pressable
            onPress={() => setMode(AuthScreenMode.SIGNUP)}
            style={{
              width: 260,
              paddingVertical: 20,
              borderRadius: 999,
              backgroundColor: BUTTON_BG,
              marginBottom: 40,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <ThemedText type="heading" style={{ color: HUNTLY_GREEN, fontSize: 18, fontWeight: "600" }}>
              Get started
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setMode(AuthScreenMode.LOGIN)}
            style={{
              width: 260,
              paddingVertical: 20,
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
            <ThemedText type="heading" style={{ color: HUNTLY_GREEN, fontSize: 18, fontWeight: "600" }}>
              I already have an account
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
