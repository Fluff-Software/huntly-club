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

type LoginFormProps = {
  onCreateAccount: () => void;
};

export function LoginForm({ onCreateAccount }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, loading } = useAuth();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      await signIn(email, password);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to sign in");
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
          className="text-huntly-forest text-center mb-2"
        >
          Welcome to Huntly Club!
        </ThemedText>
        <ThemedText type="body" className="text-huntly-charcoal text-center">
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

        <Pressable
          className="bg-huntly-amber h-14 rounded-xl justify-center items-center mb-4 shadow-soft"
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#2D5A27" />
          ) : (
            <ThemedText className="text-huntly-forest font-bold text-lg">
              Sign In
            </ThemedText>
          )}
        </Pressable>

        <Pressable onPress={onCreateAccount} className="items-center">
          <ThemedText type="link" className="text-huntly-leaf text-center">
            Don't have an account? Create one
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}
