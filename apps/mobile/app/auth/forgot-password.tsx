import React, { useState } from "react";
import {
  View,
  TextInput,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/services/supabase";

const HUNTLY_GREEN = "#4F6F52";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendReset = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("resend-auth-email", {
        body: { email: trimmed, type: "recovery" },
      });
      if (error) throw error;

      Alert.alert(
        "Check your email",
        "If this email is registered with Huntly World, you'll receive a link to reset your password."
      );
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: HUNTLY_GREEN }} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ title: "Forgot password", headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="bg-white rounded-2xl p-6 shadow-soft max-w-sm self-center w-full">
            <ThemedText type="subtitle" className="text-huntly-forest text-center mb-2">
              Forgot your password?
            </ThemedText>
            <ThemedText type="body" className="text-huntly-charcoal text-center mb-6">
              Enter your email and we'll send you a link to set a new password.
            </ThemedText>

            <TextInput
              className="h-14 mb-6 border-2 border-huntly-mint rounded-xl px-4 bg-huntly-cream text-huntly-forest text-base"
              placeholder="Email"
              placeholderTextColor="#8B4513"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Button
              variant="primary"
              size="large"
              onPress={handleSendReset}
              loading={loading}
              className="mb-4"
            >
              Send reset link
            </Button>

            <Pressable onPress={() => router.back()} className="items-center">
              <ThemedText type="link" className="text-huntly-leaf text-center">
                Back to Sign In
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

