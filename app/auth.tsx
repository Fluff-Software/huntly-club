import React, { useState } from "react";
import { ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ThemedView } from "@/components/ThemedView";
import { LoginForm } from "@/components/authentication/LoginForm";
import { SignUpForm } from "@/components/authentication/SignUpForm";

enum AuthMode {
  LOGIN,
  SIGNUP,
}

export default function AuthScreen() {
  const [mode, setMode] = useState(AuthMode.LOGIN);

  return (
    <ThemedView className="flex-1 bg-huntly-cream">
      <StatusBar style="auto" />
      <Stack.Screen options={{ title: "Authentication", headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center p-5"
          keyboardShouldPersistTaps="handled"
        >
          {mode === AuthMode.LOGIN ? (
            <LoginForm onCreateAccount={() => setMode(AuthMode.SIGNUP)} />
          ) : (
            <SignUpForm onLoginInstead={() => setMode(AuthMode.SIGNUP)} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
