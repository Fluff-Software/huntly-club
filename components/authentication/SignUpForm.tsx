import React, { useState } from "react";
import {
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
  View,
  Image,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";

type SignUpFormProps = {
  onLoginInstead: () => void;
};

export function SignUpForm({ onLoginInstead }: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { signUp, loading } = useAuth();

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      await signUp(email, password);
      setSuccessMessage(
        `Account created! A confirmation link has been sent to ${email}. Please check your email to verify your account.`
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create account");
    }
  };

  if (successMessage) {
    return (
      <View className="p-5 w-full max-w-sm rounded-2xl self-center">
        {/* Success State */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 bg-huntly-leaf rounded-full items-center justify-center mb-4">
            <ThemedText className="text-4xl">✅</ThemedText>
          </View>
          <ThemedText
            type="title"
            className="text-huntly-forest text-center mb-2"
          >
            Check Your Email
          </ThemedText>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-soft">
          <ThemedText
            type="body"
            className="text-huntly-charcoal text-center mb-6 leading-6"
          >
            {successMessage}
          </ThemedText>

          <ThemedText
            type="caption"
            className="text-huntly-brown text-center mb-6 italic"
          >
            If you don't see the email, check your spam folder.
          </ThemedText>

          <Pressable
            className="bg-huntly-amber h-14 rounded-xl justify-center items-center shadow-soft"
            onPress={onLoginInstead}
          >
            <ThemedText className="text-huntly-forest font-bold text-lg">
              Back to Login
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="p-5 w-full max-w-sm rounded-2xl self-center">
      {/* Logo/Character */}
      <View className="items-center mb-6">
        <Image
          source={require("@/assets/images/logo.png")}
          className="w-80 h-80 mb-4"
          resizeMode="contain"
        />
        <ThemedText
          type="title"
          className="text-huntly-forest text-center mb-2"
        >
          Join Huntly Club!
        </ThemedText>
        <ThemedText type="body" className="text-huntly-charcoal text-center">
          Start your adventure today!
        </ThemedText>
      </View>

      {/* Sign Up Form */}
      <View className="bg-white rounded-2xl p-6 shadow-soft">
        <ThemedText
          type="subtitle"
          className="text-huntly-forest text-center mb-6"
        >
          Create Account
        </ThemedText>

        <TextInput
          className="h-14 mb-4 border-2 border-huntly-mint rounded-xl px-4 bg-huntly-cream text-huntly-forest text-base"
          placeholder="Email"
          placeholderTextColor="#8B4513"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          className="h-14 mb-4 border-2 border-huntly-mint rounded-xl px-4 bg-huntly-cream text-huntly-forest text-base"
          placeholder="Password"
          placeholderTextColor="#8B4513"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          className="h-14 mb-6 border-2 border-huntly-mint rounded-xl px-4 bg-huntly-cream text-huntly-forest text-base"
          placeholder="Confirm Password"
          placeholderTextColor="#8B4513"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <Pressable
          className="bg-huntly-amber h-14 rounded-xl justify-center items-center mb-4 shadow-soft"
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#2D5A27" />
          ) : (
            <ThemedText className="text-huntly-forest font-bold text-lg">
              Create Account
            </ThemedText>
          )}
        </Pressable>

        <Pressable onPress={onLoginInstead} className="items-center">
          <ThemedText type="link" className="text-huntly-leaf text-center">
            Already have an account? Sign in
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}
