import React, { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator, Pressable } from "react-native";
import { router } from "expo-router";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemedText } from "@/components/ThemedText";
import { useSignUp } from "@/contexts/SignUpContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/supabase";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const HUNTLY_GREEN = "#4F6F52";
const CREAM = "#F4F0EB";

export default function VerifyEmailScreen() {
  const { scaleW } = useLayoutScale();
  const { parentEmail } = useSignUp();
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If user is already authenticated, they've verified their email
    if (user) {
      setVerificationComplete(true);
      setChecking(false);
      // Wait a moment to show success message, then proceed
      setTimeout(() => {
        router.replace("/sign-up/players");
      }, 1500);
      return;
    }

    const checkVerification = async () => {
      try {
        const { data: { session } } = await supabase.auth.refreshSession();
        const sessionToCheck = session ?? (await supabase.auth.getSession()).data.session;

        if (sessionToCheck?.user) {
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
      } catch (error) {
        console.error("Error checking verification:", error);
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
    if (!parentEmail) return;
    
    try {
      await supabase.auth.resend({
        type: 'signup',
        email: parentEmail,
      });
      // Show a brief success message (could use Alert or toast)
      console.log("Verification email resent");
    } catch (error) {
      console.error("Error resending email:", error);
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

          <Pressable
            onPress={handleResendEmail}
            style={{
              marginTop: scaleW(16),
              paddingVertical: scaleW(12),
              paddingHorizontal: scaleW(24),
            }}
          >
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                textAlign: "center",
                fontSize: scaleW(14),
                textDecorationLine: "underline",
              }}
            >
              Didn't receive the email? Resend
            </ThemedText>
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
        </View>
      </View>
    </>
  );
}
