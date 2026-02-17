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
const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      Alert.alert("Error", `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      Alert.alert("Success", "Your password has been updated. You can now sign in.", [
        { text: "OK", onPress: () => router.replace("/auth") },
      ]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to update password.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: HUNTLY_GREEN }} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ title: "Set new password", headerShown: false }} />
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
              Set new password
            </ThemedText>
            <ThemedText type="body" className="text-huntly-charcoal text-center mb-6">
              Enter your new password below.
            </ThemedText>

            <TextInput
              className="h-14 mb-4 border-2 border-huntly-mint rounded-xl px-4 bg-huntly-cream text-huntly-forest text-base"
              placeholder="New password"
              placeholderTextColor="#8B4513"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TextInput
              className="h-14 mb-6 border-2 border-huntly-mint rounded-xl px-4 bg-huntly-cream text-huntly-forest text-base"
              placeholder="Confirm password"
              placeholderTextColor="#8B4513"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Button
              variant="primary"
              size="large"
              onPress={handleUpdatePassword}
              loading={loading}
              className="mb-4"
            >
              Update password
            </Button>

            <Pressable onPress={() => router.replace("/auth")} className="items-center">
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
