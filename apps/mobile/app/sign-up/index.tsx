import React, { useState } from "react";
import {
  View,
  Pressable,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ThemedText } from "@/components/ThemedText";
import { useSignUp } from "@/contexts/SignUpContext";
import { checkEmailAvailable, signUp } from "@/services/authService";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const HUNTLY_GREEN = "#4F6F52";

/** Basic email validation: local@domain.tld */
const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const MIN_PASSWORD_LENGTH = 6;

export default function SignUpParentEmailScreen() {
  const { scaleW } = useLayoutScale();
  const { setParentEmail, setPassword } = useSignUp();
  const [email, setEmail] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const isEmailValid = isValidEmail(email);
  const isPasswordValid =
    passwordValue.length >= MIN_PASSWORD_LENGTH &&
    passwordValue === confirmPassword;

  const canContinue = isEmailValid && isPasswordValid;

  const disabledReason = ((): string | null => {
    if (checkingEmail) return "Checking email…";
    if (creatingAccount) return "Creating account…";
    if (canContinue) return null;
    if (!email.trim()) return "Enter your email to continue.";
    if (!isEmailValid) return "Please enter a valid email address.";
    if (passwordValue.length < MIN_PASSWORD_LENGTH)
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (passwordValue !== confirmPassword) return "Passwords do not match.";
    return "Complete all fields to continue.";
  })();

  const isDisabled = !canContinue || checkingEmail || creatingAccount;

  const handleContinue = async () => {
    setEmailError(null);
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) return;

    setCheckingEmail(true);
    const { available, error } = await checkEmailAvailable(trimmed);
    setCheckingEmail(false);

    if (error) {
      setEmailError(error);
      return;
    }
    if (!available) {
      setEmailError("This email is already in use. Sign in or use a different email.");
      return;
    }

    // Create the account immediately
    setCreatingAccount(true);
    try {
      await signUp(trimmed, passwordValue);
      
      // Save email and password to context for later use
      setParentEmail(trimmed);
      setPassword(passwordValue);
      
      // Clear loading state before navigation
      setCreatingAccount(false);
      
      // Redirect to verification waiting screen
      router.push("/sign-up/verify-email");
    } catch (signUpError) {
      setCreatingAccount(false);
      const errorMessage = signUpError instanceof Error ? signUpError.message : "Failed to create account";
      Alert.alert("Error", errorMessage);
      setEmailError(errorMessage);
    }
  };

  const openPrivacyPolicy = () => {
    router.push("/privacy");
  };

  const goToSignIn = () => {
    router.replace({ pathname: "/auth", params: { mode: "login" } });
  };

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ title: "Sign up", headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: HUNTLY_GREEN }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: scaleW(24),
            paddingTop: scaleW(80),
            paddingBottom: scaleW(40),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ThemedText
            type="heading"
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{
              textAlign: "center",
              fontWeight: "600",
              fontSize: scaleW(20),
            }}
          >
            Let's save your adventures
          </ThemedText>
          <ThemedText
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{
              textAlign: "center",
              fontSize: scaleW(18),
              opacity: 0.95,
              marginHorizontal: scaleW(20),
              marginTop: scaleW(20),
            }}
          >
            Add a parent email so progress isn't lost.
          </ThemedText>

          <ThemedText
            type="subtitle"
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{
              fontWeight: "600",
              fontSize: scaleW(16),
              marginTop: scaleW(40),
              textAlign: "center",
            }}
          >
            Parent email address
          </ThemedText>
          <TextInput
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setEmailError(null);
            }}
            placeholder="e.g. parent@example.com"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={{
              width: "100%",
              height: scaleW(56),
              backgroundColor: "#FFFFFF",
              borderRadius: scaleW(16),
              paddingHorizontal: scaleW(20),
              fontSize: scaleW(16),
              color: "#36454F",
              marginTop: scaleW(12),
            }}
          />
          {emailError !== null && (
            <ThemedText
              lightColor="#FEE2E2"
              darkColor="#FEE2E2"
              style={{
                fontSize: scaleW(14),
                marginTop: scaleW(8),
                textAlign: "center",
              }}
            >
              {emailError}
            </ThemedText>
          )}

          <ThemedText
            type="subtitle"
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{
              fontWeight: "600",
              fontSize: scaleW(16),
              marginTop: scaleW(24),
              textAlign: "center",
            }}
          >
            Password
          </ThemedText>
          <TextInput
            value={passwordValue}
            onChangeText={setPasswordValue}
            placeholder="Min 6 characters"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={{
              width: "100%",
              height: scaleW(56),
              backgroundColor: "#FFFFFF",
              borderRadius: scaleW(16),
              paddingHorizontal: scaleW(20),
              fontSize: scaleW(16),
              color: "#36454F",
              marginTop: scaleW(12),
            }}
          />

          <ThemedText
            type="subtitle"
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{
              fontWeight: "600",
              fontSize: scaleW(16),
              marginTop: scaleW(24),
              textAlign: "center",
            }}
          >
            Confirm password
          </ThemedText>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat your password"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={{
              width: "100%",
              height: scaleW(56),
              backgroundColor: "#FFFFFF",
              borderRadius: scaleW(16),
              paddingHorizontal: scaleW(20),
              fontSize: scaleW(16),
              color: "#36454F",
              marginTop: scaleW(12),
            }}
          />

          <Pressable onPress={openPrivacyPolicy} style={{ marginTop: scaleW(28) }}>
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                fontSize: scaleW(14),
                textAlign: "center",
                opacity: 0.95,
                marginHorizontal: scaleW(40)
              }}
            >
              By continuing, you agree to our{" "}
              <Text style={{ color: "#FFFFFF", textDecorationLine: "underline", fontWeight: "600" }}>
                Privacy Policy.
              </Text>
            </ThemedText>
          </Pressable>

          <Pressable onPress={goToSignIn} style={{ marginTop: scaleW(24) }}>
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                fontSize: scaleW(14),
                textAlign: "center",
                opacity: 0.95,
                marginHorizontal: scaleW(40),
              }}
            >
              Already have an account?{" "}
              <Text style={{ color: "#FFFFFF", textDecorationLine: "underline", fontWeight: "600" }}>
                Sign In
              </Text>
            </ThemedText>
          </Pressable>

          <View style={{ flex: 1, minHeight: scaleW(80) }} />

          {disabledReason !== null && !emailError && (
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                textAlign: "center",
                fontSize: scaleW(14),
                opacity: 0.9,
                marginBottom: scaleW(12),
              }}
            >
              {disabledReason}
            </ThemedText>
          )}

          <Pressable
            onPress={handleContinue}
            disabled={isDisabled}
            style={{
              alignSelf: "center",
              width: "100%",
              maxWidth: scaleW(220),
              paddingVertical: scaleW(18),
              borderRadius: scaleW(50),
              backgroundColor: isDisabled ? "#9CA3AF" : "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDisabled ? 0.1 : 0.3,
              shadowRadius: 4,
              elevation: 2,
              opacity: isDisabled ? 0.8 : 1,
            }}
          >
            {checkingEmail || creatingAccount ? (
              <ActivityIndicator size="small" color={HUNTLY_GREEN} />
            ) : (
              <ThemedText
                type="heading"
                lightColor={isDisabled ? "#6B7280" : HUNTLY_GREEN}
                darkColor={isDisabled ? "#6B7280" : HUNTLY_GREEN}
                style={{ fontSize: scaleW(18), fontWeight: "600" }}
              >
                Continue
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
