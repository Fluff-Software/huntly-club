import React, { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator, Pressable, Alert } from "react-native";
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

export default function VerifyEmailScreen() {
  const { scaleW } = useLayoutScale();
  const signUpContext = useSignUp();
  const { user, signOut } = useAuth();
  const parentEmail = (signUpContext.parentEmail || user?.email) ?? "";
  const [checking, setChecking] = useState(true);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only treat as verified when email is confirmed (so unverified logins see this screen)
    if (user?.email_confirmed_at) {
      setVerificationComplete(true);
      setChecking(false);
      setTimeout(() => {
        router.replace("/sign-up/players");
      }, 1500);
      return;
    }

    const checkVerification = async () => {
      try {
        const { data: { session } } = await supabase.auth.refreshSession();
        const sessionToCheck = session ?? (await supabase.auth.getSession()).data.session;
        const confirmed = sessionToCheck?.user?.email_confirmed_at;

        if (sessionToCheck?.user && confirmed) {
          setVerificationComplete(true);
          setChecking(false);

          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }

          setTimeout(() => {
            router.replace("/sign-up/players");
          }, 1500);
        }
      } catch {
        // ignore
      }
    };

    // Check immediately
    checkVerification();

    // Then check every 3 seconds
    checkIntervalRef.current = setInterval(checkVerification, 3000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user]);

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
        <View style={{ flex: 1, backgroundColor: HUNTLY_GREEN }}>
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: scaleW(24),
            }}
          >
            <View
              style={{
                width: scaleW(80),
                height: scaleW(80),
                backgroundColor: "#A8D5BA",
                borderRadius: scaleW(40),
                alignItems: "center",
                justifyContent: "center",
                marginBottom: scaleW(24),
              }}
            >
              <ThemedText
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                style={{ fontSize: scaleW(40) }}
              >
                ✅
              </ThemedText>
            </View>

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
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ title: "Verify Email", headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: HUNTLY_GREEN }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: scaleW(24),
          }}
        >
          <View
            style={{
              width: scaleW(80),
              height: scaleW(80),
              backgroundColor: "#A8D5BA",
              borderRadius: scaleW(40),
              alignItems: "center",
              justifyContent: "center",
              marginBottom: scaleW(24),
            }}
          >
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{ fontSize: scaleW(40) }}
            >
              📧
            </ThemedText>
          </View>

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

          {checking && (
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
    </>
  );
}
