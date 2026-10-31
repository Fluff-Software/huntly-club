import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { FKButton, FKScreen } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { useAuth } from "@/contexts/AuthContext";
import { useSignUpOptional } from "@/contexts/SignUpContext";

const APP_ICON = require("@/assets/images/ios-light.png");

export function SignInScreen({ onBack, onCreateAccount }: { onBack: () => void; onCreateAccount: () => void }) {
  const { signIn } = useAuth();
  const signUpContext = useSignUpOptional();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const canSubmit = email.trim().length > 3 && password.length > 0;

  const handleSignIn = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't sign in.";
      if (message.toLowerCase().includes("email not confirmed")) {
        signUpContext?.setParentEmail(email.trim());
        router.replace("/sign-up/verify-email");
        return;
      }
      setError(message.toLowerCase().includes("invalid") ? "That email and password don't match. Try again?" : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="dark" />
      <FKScreen>
        <Pressable onPress={onBack} style={styles.back} hitSlop={8} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={FK.ink} />
        </Pressable>
        <Image source={APP_ICON} style={styles.icon} />
        <Text style={[TYPE.title, { marginTop: 18 }]}>Welcome back</Text>
        <Text style={[TYPE.bodySmall, { marginTop: 6, marginBottom: 22, fontSize: 16 }]}>
          Sign in with your grown-up account.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(null);
          }}
          placeholder="you@example.com"
          placeholderTextColor="#8C988F"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          style={styles.input}
          testID="signin-email"
        />
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            ref={passwordRef}
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setError(null);
            }}
            placeholder="Your password"
            placeholderTextColor="#8C988F"
            secureTextEntry={!showPassword}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleSignIn}
            style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: "transparent" }]}
            testID="signin-password"
          />
          <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={10} accessibilityLabel="Show password">
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={FK.muted} />
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <FKButton
          label="Forgot your password?"
          variant="link"
          onPress={() => router.push("/auth/forgot-password" as Parameters<typeof router.push>[0])}
          style={{ alignSelf: "flex-start", marginTop: 4 }}
        />
        <FKButton label="Sign in" onPress={handleSignIn} disabled={!canSubmit} loading={busy} style={{ marginTop: 12 }} testID="signin-submit" />
        <FKButton label="New here? Set up your family" variant="link" onPress={onCreateAccount} style={{ marginTop: 6 }} />
      </FKScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  back: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: FK.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { width: 72, height: 72, borderRadius: 18, marginTop: 20 },
  label: { fontFamily: FONT.displayBold, fontSize: 15, color: FK.ink, marginBottom: 6 },
  input: {
    backgroundColor: FK.paper,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: FONT.body,
    fontSize: 17,
    color: FK.ink,
    marginBottom: 16,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FK.paper,
    borderRadius: RADIUS.md,
    paddingRight: 16,
  },
  error: { fontFamily: FONT.bodyBold, fontSize: 15, color: "#B3261E", marginTop: 12 },
});
