import React, { useState, useEffect } from "react";
import {
  TextInput,
  Alert,
  Pressable,
  View,
  Image,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useSignUpOptional } from "@/contexts/SignUpContext";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/ui/Button";

type SignUpFormProps = {
  onLoginInstead: () => void;
};

export function SignUpForm({ onLoginInstead }: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { signUp, loading } = useAuth();
  const signUpContext = useSignUpOptional();

  useEffect(() => {
    if (signUpContext?.parentEmail) setEmail(signUpContext.parentEmail);
    if (signUpContext?.password) {
      setPassword(signUpContext.password);
      setConfirmPassword(signUpContext.password);
    }
  }, [signUpContext?.parentEmail, signUpContext?.password]);

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
      
      // Clear sign-up context data if it exists
      if (signUpContext) {
        signUpContext.clearSignUpData();
      }
      
      setSuccessMessage(
        `Account created! A confirmation link has been sent to ${email}. Please check your email to verify your account before signing in.`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create account";
      Alert.alert("Error", errorMessage);
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

          <Button
            variant="primary"
            size="large"
            onPress={onLoginInstead}
          >
            Back to Login
          </Button>
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

        <Button
          variant="primary"
          size="large"
          onPress={handleSignUp}
          loading={loading}
          className="mb-4"
        >
          Create Account
        </Button>

        <Pressable onPress={onLoginInstead} className="items-center">
          <ThemedText type="link" className="text-huntly-leaf text-center">
            Already have an account? Sign in
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}
