import React, { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator, Pressable, Alert, AppState, AppStateStatus } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemedText } from "@/components/ThemedText";
import { useSignUp } from "@/contexts/SignUpContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/supabase";
import { resendVerificationEmail } from "@/services/authService";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const HUNTLY_GREEN = "#4F6F52";
const CREAM = "#F4F0EB";

function useVerifiedAndContinue(email: string, password: string) {
  const { session } = useAuth();
  const [verificationComplete, setVerificationComplete] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const advance = () => {
    setVerificationComplete(true);
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    setTimeout(() => router.replace("/sign-up/players"), 1500);
  };

  const checkAndAdvance = async () => {
    try {
      // If we have credentials, try sign-in; once they've verified, this succeeds and we get a session (no login screen)
      if (email.trim() && password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (!error && data.session?.user?.email_confirmed_at) {
          advance();
          return;
        }
      }
      // If we already have a session, refresh and check server user
      await supabase.auth.refreshSession();
      const { data: { user: serverUser } } = await supabase.auth.getUser();
      if (serverUser?.email_confirmed_at) {
        advance();
      }
    } catch {
      // ignore (e.g. not verified yet, or no session)
    }
  };

  // React to session from context (e.g. after deep link sets session)
  useEffect(() => {
    if (session?.user?.email_confirmed_at) {
      advance();
      return;
    }

    checkAndAdvance();
    checkIntervalRef.current = setInterval(checkAndAdvance, 1000);
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [session?.user?.email_confirmed_at, email, password]);

  // When app comes to foreground, check immediately
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") void checkAndAdvance();
    });
    return () => subscription.remove();
  }, [email, password]);

  return { verificationComplete };
}

export default function VerifyEmailScreen() {
  const { scaleW } = useLayoutScale();
  const signUpContext = useSignUp();
  const { user, signOut } = useAuth();
  const parentEmail = (signUpContext.parentEmail || user?.email) ?? "";
  const [resendLoading, setResendLoading] = useState(false);
  const { verificationComplete } = useVerifiedAndContinue(parentEmail, signUpContext.password);

  const handleResendEmail = async () => {
    if (!parentEmail || resendLoading) return;
    setResendLoading(true);
    try {
      await resendVerificationEmail(parentEmail, "signup");
      Alert.alert("Email sent", "Check your inbox for a new verification link.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resend email.";
      Alert.alert("Error", message);
    } finally {
      setResendLoading(false);
    }
  };

  if (verificationComplete) {
    return (
      <>
        <StatusBar style="light" />
        <Stack.Screen options={{ title: "Email Verified", headerShown: false }} />
        <SafeAreaView style={{ flex: 1, backgroundColor: HUNTLY_GREEN }} edges={["top", "left", "right"]}>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: scaleW(24),
            }}
          >
            <ThemedText
              type="heading"
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                textAlign: "center",
                fontWeight: "600",
                fontSize: scaleW(24),
                marginBottom: scaleW(12),
              }}
            >
              Email Verified!
            </ThemedText>

            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                textAlign: "center",
                fontSize: scaleW(16),
                opacity: 0.95,
              }}
            >
              Setting up your account...
            </ThemedText>
          </View>
        </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ title: "Verify Email", headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: HUNTLY_GREEN }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: scaleW(24),
          }}
        >
          <ThemedText
            type="heading"
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{
              textAlign: "center",
              fontWeight: "600",
              fontSize: scaleW(24),
              marginBottom: scaleW(12),
            }}
          >
            Check Your Email
          </ThemedText>

          <ThemedText
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{
              textAlign: "center",
              fontSize: scaleW(16),
              opacity: 0.95,
              marginBottom: scaleW(32),
              lineHeight: scaleW(24),
            }}
          >
            We've sent a confirmation link to{"\n"}
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{ fontWeight: "600" }}
            >
              {parentEmail}
            </ThemedText>
            {"\n\n"}
            Click the link in the email to continue setting up your explorers.
          </ThemedText>

          {!verificationComplete && (
            <View style={{ marginBottom: scaleW(24) }}>
              <ActivityIndicator size="large" color={CREAM} />
              <ThemedText
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                style={{
                  textAlign: "center",
                  fontSize: scaleW(14),
                  opacity: 0.8,
                  marginTop: scaleW(12),
                }}
              >
                Waiting for verification...
              </ThemedText>
            </View>
          )}

          <ThemedText
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{
              textAlign: "center",
              fontSize: scaleW(14),
              opacity: 0.9,
              marginTop: scaleW(24),
            }}
          >
            Didn't receive the email?
          </ThemedText>
          <Pressable
            onPress={handleResendEmail}
            disabled={resendLoading}
            style={{
              alignSelf: "center",
              marginTop: scaleW(8),
              paddingVertical: scaleW(14),
              paddingHorizontal: scaleW(28),
              borderRadius: scaleW(28),
              backgroundColor: CREAM,
              minWidth: scaleW(200),
              alignItems: "center",
              justifyContent: "center",
              opacity: resendLoading ? 0.8 : 1,
            }}
          >
            {resendLoading ? (
              <ActivityIndicator size="small" color={HUNTLY_GREEN} />
            ) : (
              <ThemedText
                lightColor={HUNTLY_GREEN}
                darkColor={HUNTLY_GREEN}
                style={{
                  fontSize: scaleW(16),
                  fontWeight: "600",
                }}
              >
                Resend verification email
              </ThemedText>
            )}
          </Pressable>

          <ThemedText
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={{
              textAlign: "center",
              fontSize: scaleW(12),
              opacity: 0.7,
              marginTop: scaleW(24),
              fontStyle: "italic",
            }}
          >
            Check your spam folder if you don't see it
          </ThemedText>

          <Pressable
            onPress={() => {
              Alert.alert("Log out", "Return to sign in? You can verify your email later.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Log out",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await signOut();
                      router.replace("/auth");
                    } catch {
                      router.replace("/auth");
                    }
                  },
                },
              ]);
            }}
            style={{
              alignSelf: "center",
              marginTop: scaleW(32),
              paddingVertical: scaleW(12),
              paddingHorizontal: scaleW(20),
            }}
          >
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                fontSize: scaleW(15),
                fontWeight: "600",
                textDecorationLine: "underline",
                opacity: 0.9,
              }}
            >
              Log out
            </ThemedText>
          </Pressable>
        </View>
      </View>
      </SafeAreaView>
    </>
  );
}
