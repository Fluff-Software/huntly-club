import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchases } from "@/contexts/PurchasesContext";
import { useSignUpOptional } from "@/contexts/SignUpContext";
import { getProfiles, getUserData } from "@/services/profileService";
import { REQUIRE_EMAIL_VERIFICATION } from "@/constants/auth";

const LOADER_BACKGROUND = "#4F6F52";
const LOADER_SPINNER = "#F4F0EB";

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, session, loading } = useAuth();
  const { subscriptionInfo, isLoading: purchasesLoading } = usePurchases();
  const segments = useSegments();
  const router = useRouter();
  const signUpContext = useSignUpOptional();
  const [checkingProfiles, setCheckingProfiles] = useState(false);

  useEffect(() => {
    if (loading || checkingProfiles) return;

    const inAuthGroup = segments[0] === "auth";
    const inGetStarted = segments[0] === "get-started";
    const inSignUp = segments[0] === "sign-up";
    const inPrivacy = segments[0] === "privacy";
    const inUnauthFlow = inAuthGroup || inGetStarted || inSignUp || inPrivacy;

    if (!user && !inUnauthFlow) {
      router.replace("/auth");
      return;
    }

    // Email verification state lives in Supabase Auth (session.user.email_confirmed_at), not in our DB.
    // Only enforce this check once we actually have a session object; on cold start, session can be null
    // even though the user is already fully verified, which would otherwise bounce them back into
    // the verify-email flow every time they open the app.
    const emailConfirmed = session?.user?.email_confirmed_at != null;
    if (
      REQUIRE_EMAIL_VERIFICATION &&
      user &&
      session &&
      !emailConfirmed &&
      segments[0] !== "sign-up"
    ) {
      signUpContext?.setParentEmail(user.email ?? "");
      router.replace("/sign-up/verify-email");
      return;
    }

    if (user && (inAuthGroup || inGetStarted || inSignUp)) {
      if (!inSignUp) {
        setCheckingProfiles(true);
        Promise.all([getProfiles(user.id), getUserData(user.id)])
          .then(([profiles, userData]) => {
            if (profiles.length === 0) {
              router.replace("/sign-up/players");
            } else if (userData?.team == null) {
              router.replace("/sign-up/team");
            } else {
              router.replace("/(tabs)");
            }
          })
          .catch((error) => {
            console.error("Error checking profiles/user data:", error);
            router.replace("/(tabs)");
          })
          .finally(() => setCheckingProfiles(false));
      }
      return;
    }

    // Require active subscription for signed-in users to access the app
    const inSubscriptionRequired = segments[0] === "subscription-required";
    if (
      user &&
      !inUnauthFlow &&
      !inSubscriptionRequired &&
      !purchasesLoading &&
      !subscriptionInfo.isSubscribed
    ) {
      router.replace("/subscription-required");
      return;
    }
  }, [user, session, loading, segments, checkingProfiles, subscriptionInfo.isSubscribed, purchasesLoading]);

  const showLoader = loading || checkingProfiles;

  if (showLoader) {
    return (
      <View style={styles.fullScreenLoader} accessibilityLabel="Loading">
        <ActivityIndicator size="large" color={LOADER_SPINNER} />
      </View>
    );
  }

  return <View style={styles.wrapper}>{children}</View>;
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  fullScreenLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: LOADER_BACKGROUND,
  },
});
