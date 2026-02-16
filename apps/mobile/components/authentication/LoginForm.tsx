import React, { useState } from "react";
import {
  TextInput,
  Alert,
  Pressable,
  View,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useSignUpOptional } from "@/contexts/SignUpContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/ui/Button";

type LoginFormProps = {
  onCreateAccount: () => void;
};

export function LoginForm({ onCreateAccount }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, loading } = useAuth();
  const signUpContext = useSignUpOptional();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      await signIn(email, password);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sign in";
      if (errorMessage.toLowerCase().includes("email not confirmed")) {
        signUpContext?.setParentEmail(email.trim());
        router.replace("/sign-up/verify-email");
        return;
      }
      Alert.alert("Error", errorMessage);
    }
  };

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
          className="text-white text-center mb-2"
        >
          Welcome to Huntly Club!
        </ThemedText>
        <ThemedText type="body" className="text-white text-center">
          Ready for your next adventure?
        </ThemedText>
      </View>

      {/* Login Form */}
      <View className="bg-white rounded-2xl p-6 shadow-soft">
        <ThemedText
          type="subtitle"
          className="text-huntly-forest text-center mb-6"
        >
          Sign In
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
          className="h-14 mb-6 border-2 border-huntly-mint rounded-xl px-4 bg-huntly-cream text-huntly-forest text-base"
          placeholder="Password"
          placeholderTextColor="#8B4513"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button
          variant="primary"
          size="large"
          onPress={handleSignIn}
          loading={loading}
          className="mb-4"
        >
          Sign In
        </Button>

        <Pressable onPress={onCreateAccount} className="items-center">
          <ThemedText type="link" className="text-huntly-leaf text-center">
            Don't have an account? Create one
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}
