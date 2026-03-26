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
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/ui/Button";
import { useLayoutScale } from "@/hooks/useLayoutScale";

type LoginFormProps = {
  onCreateAccount: () => void;
};

export function LoginForm({ onCreateAccount }: LoginFormProps) {
  const { scaleW } = useLayoutScale();
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
    <View 
      style={{ 
        padding: scaleW(20), 
        width: "100%", 
        maxWidth: scaleW(340),
        alignSelf: "center",
      }}
    >
      {/* Logo/Character */}
      <View style={{ alignItems: "center", marginBottom: scaleW(24) }}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={{  width: scaleW(280), height: scaleW(280) }}
          resizeMode="contain"
        />
        <ThemedText
          type="title"
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
          style={{ textAlign: "center", marginBottom: scaleW(8), fontSize: scaleW(28) }}
        >
          Welcome to Huntly World!
        </ThemedText>
        <ThemedText
          type="body"
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
          style={{ textAlign: "center", opacity: 0.95, fontSize: scaleW(16) }}
        >
          Ready for your next adventure?
        </ThemedText>
      </View>

      {/* Login Form */}
      <View 
        style={{ 
          backgroundColor: "#FFFFFF", 
          borderRadius: scaleW(16), 
          padding: scaleW(24),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <ThemedText
          type="subtitle"
          style={{ 
            textAlign: "center", 
            marginBottom: scaleW(24),
            fontSize: scaleW(20),
          }}
        >
          Sign In
        </ThemedText>

        <TextInput
          style={{
            height: scaleW(56),
            marginBottom: scaleW(16),
            borderWidth: 2,
            borderColor: "#A8D5BA",
            borderRadius: scaleW(12),
            paddingHorizontal: scaleW(16),
            backgroundColor: "#FDF8F3",
            color: "#4F6F52",
            fontSize: scaleW(16),
            lineHeight: scaleW(22),
            textAlignVertical: "center",
          }}
          placeholder="Email"
          placeholderTextColor="#8B4513"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={{
            height: scaleW(56),
            marginBottom: scaleW(24),
            borderWidth: 2,
            borderColor: "#A8D5BA",
            borderRadius: scaleW(12),
            paddingHorizontal: scaleW(16),
            backgroundColor: "#FDF8F3",
            color: "#4F6F52",
            fontSize: scaleW(16),
            lineHeight: scaleW(22),
            textAlignVertical: "center",
          }}
          placeholder="Password"
          placeholderTextColor="#8B4513"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          onPress={() =>
            router.push("/auth/forgot-password" as Parameters<typeof router.push>[0])
          }
          style={{ marginBottom: scaleW(16), alignItems: "center" }}
        >
          <ThemedText 
            type="link" 
            style={{ textAlign: "center", fontSize: scaleW(14) }}
          >
            Forgot your password?
          </ThemedText>
        </Pressable>

        <Button
          variant="primary"
          size="large"
          onPress={handleSignIn}
          loading={loading}
          style={{ marginBottom: scaleW(16) }}
        >
          Sign In
        </Button>

        <Pressable onPress={onCreateAccount} style={{ alignItems: "center" }}>
          <ThemedText 
            type="link" 
            style={{ textAlign: "center", fontSize: scaleW(14) }}
          >
            Don't have an account? Create one
          </ThemedText>
        </Pressable>
      </View>
      <View style={{ height: scaleW(40) }} />
    </View>
  );
}
