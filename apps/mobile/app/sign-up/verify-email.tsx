import React, { useState, useEffect, useRef } from "react";
import { Alert, AppState, AppStateStatus, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { FKButton, FKEyebrow, FKScreen } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { useSignUp } from "@/contexts/SignUpContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/supabase";
import { resendVerificationEmail } from "@/services/authService";


function useVerifiedAndContinue(email: string, password: string, nextRoute: "/sign-up/finish" | "/sign-up/players") {
  const { session } = useAuth();
  const [verificationComplete, setVerificationComplete] = useState(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = () => {
    setVerificationComplete(true);
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    setTimeout(() => router.replace(nextRoute), 1200);
  };

  const checkAndAdvance = async () => {
    try {
      // If we have credentials, try sign-in; once they've verified, this succeeds and we get a session (no login screen)
      if (email.trim() && password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password });
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
  const signUpContext = useSignUp();
  const { user, signOut } = useAuth();
  const parentEmail = (signUpContext.parentEmail || user?.email) ?? "";
  const [resendLoading, setResendLoading] = useState(false);
  const { verificationComplete } = useVerifiedAndContinue(
    parentEmail,
    signUpContext.password,
    signUpContext.hasPendingSetup ? "/sign-up/finish" : "/sign-up/players"
  );

  const handleResendEmail = async () => {
    if (!parentEmail || resendLoading) return;
    setResendLoading(true);
    try {
      await resendVerificationEmail(parentEmail, "signup");
      Alert.alert("Email sent", "Check your inbox for a new link.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resend email.";
      Alert.alert("Error", message);
    } finally {
      setResendLoading(false);
    }
  };

  if (verificationComplete) {
    return (
      <FKScreen dark scroll={false} contentStyle={styles.center}>
        <Stack.Screen options={{ title: "Email verified", headerShown: false }} />
        <StatusBar style="light" />
        <Animated.View entering={ZoomIn.duration(400)} style={styles.tick}>
          <Ionicons name="checkmark" size={56} color={FK.ink} />
        </Animated.View>
        <Text style={[styles.title, { color: FK.white, textAlign: "center" }]}>You're in!</Text>
        <Text style={[styles.body, { color: FK.mutedOnDark, textAlign: "center" }]}>Getting your Clubhouse ready…</Text>
      </FKScreen>
    );
  }

  return (
    <FKScreen
      footer={
        <>
          <FKButton
            label={resendLoading ? "Sending…" : "Send it again"}
            variant="paper"
            icon="refresh"
            onPress={handleResendEmail}
            loading={resendLoading}
          />
          <FKButton
            label="Use a different email"
            variant="link"
            onPress={() =>
              Alert.alert("Start again?", "You'll go back to sign in. Your team and plan are saved on this phone.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Continue",
                  style: "destructive",
                  onPress: () => void signOut().catch(() => undefined).finally(() => router.replace("/sign-up")),
                },
              ])
            }
          />
        </>
      }
    >
      <Stack.Screen options={{ title: "Check your email", headerShown: false }} />
      <StatusBar style="dark" />
      <Animated.View entering={FadeIn.duration(400)} style={styles.envelope}>
        <Ionicons name="mail-open-outline" size={44} color={FK.ink} />
      </Animated.View>
      <FKEyebrow style={{ marginTop: 24, marginBottom: 6 }}>FOR GROWN-UPS</FKEyebrow>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.body}>
        Tap the link we sent to <Text style={{ fontFamily: FONT.bodyBold, color: FK.ink }}>{parentEmail || "your inbox"}</Text>. This
        screen moves on by itself as soon as you do.
      </Text>
      <View style={styles.tip}>
        <Ionicons name="information-circle-outline" size={20} color={FK.skyInk} />
        <Text style={styles.tipText}>Can't see it? Check spam or promotions. It comes from Huntly World.</Text>
      </View>
    </FKScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tick: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: FK.sunbeam,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  envelope: {
    marginTop: 40,
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: FK.sunbeam,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...TYPE.title },
  body: { ...TYPE.body, color: FK.muted, marginTop: 10 },
  tip: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: FK.sky,
    borderRadius: RADIUS.md,
    padding: 16,
    marginTop: 24,
    alignItems: "flex-start",
  },
  tipText: { flex: 1, fontFamily: FONT.body, fontSize: 15, lineHeight: 21, color: FK.skyInk },
});
