import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchases } from "@/contexts/PurchasesContext";
import { useSignUpOptional } from "@/contexts/SignUpContext";
import { getProfiles, getUserData } from "@/services/profileService";
import type { Profile } from "@/services/profileService";
import { REQUIRE_EMAIL_VERIFICATION } from "@/constants/auth";
import { useHomeBootstrapOptional } from "@/contexts/HomeBootstrapContext";

const LOADER_BACKGROUND = "#4F6F52";

function routeAfterSignupCheck(
  router: ReturnType<typeof useRouter>,
  profiles: Profile[],
  userData: Awaited<ReturnType<typeof getUserData>>
) {
  if (profiles.length === 0) {
    router.replace("/sign-up/players");
    return;
  }
  if (userData?.team == null) {
    router.replace("/sign-up/team");
    return;
  }
  router.replace("/(tabs)");
}

async function resolveSignupState(userId: string) {
  const profiles = await getProfiles(userId);
  const userData = await getUserData(userId);
  return { profiles, userData };
}
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
  const homeBootstrap = useHomeBootstrapOptional();
  const [checkingProfiles, setCheckingProfiles] = useState(true);
  const onTabs = segments[0] === "(tabs)";
  const waitingForClubhouseActivity =
    onTabs &&
    !!homeBootstrap?.clubhouseActivityRequired &&
    !homeBootstrap.clubhouseActivityReady;

  useEffect(() => {
    if (user && onTabs) {
      homeBootstrap?.requireClubhouseActivityReady();
    }
  }, [user, onTabs, homeBootstrap?.requireClubhouseActivityReady]);

  useEffect(() => {
    const inAuthGroup = segments[0] === "auth";
    const inGetStarted = segments[0] === "get-started";
    const inSignUp = segments[0] === "sign-up";
    const inPrivacy = segments[0] === "privacy";
    const inUnauthFlow = inAuthGroup || inGetStarted || inSignUp || inPrivacy;

    // Keep signed-out users off app routes even while auth is re-validating (e.g. after sign-out).
    if (!user && !session && !inUnauthFlow && !loading) {
      router.replace("/auth");
      return;
    }

    if (loading) return;

    if (!user && inUnauthFlow) {
      setCheckingProfiles(false);
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
        resolveSignupState(user.id)
          .then(({ profiles, userData }) => {
            routeAfterSignupCheck(router, profiles, userData);
          })
          .catch((error) => {
            console.error("Error checking profiles/user data:", error);
            getProfiles(user.id)
              .then((profiles) => {
                if (profiles.length === 0) {
                  router.replace("/sign-up/players");
                } else {
                  router.replace("/sign-up/team");
                }
              })
              .catch(() => {
                router.replace("/sign-up/players");
              });
          })
          .finally(() => setCheckingProfiles(false));
      } else {
        setCheckingProfiles(false);
      }
      return;
    }

    if (user && !inUnauthFlow) {
      setCheckingProfiles(true);
      resolveSignupState(user.id)
        .then(({ profiles, userData }) => {
          if (profiles.length === 0) {
            router.replace("/sign-up/players");
            return;
          }
          if (userData?.team == null) {
            router.replace("/sign-up/team");
            return;
          }
          // No mission-first onboarding redirects. Signed-in users with complete setup
          // can continue navigating normally.
        })
        .catch((error) => {
          console.error("Error checking profiles/user data:", error);
          getProfiles(user.id)
            .then((profiles) => {
              if (profiles.length === 0) {
                router.replace("/sign-up/players");
              } else {
                router.replace("/sign-up/team");
              }
            })
            .catch(() => {
              router.replace("/sign-up/players");
            });
        })
        .finally(() => setCheckingProfiles(false));
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

    setCheckingProfiles(false);
  }, [user, session, loading, segments, subscriptionInfo.isSubscribed, purchasesLoading]);

  // We still validate profiles/userData during normal navigation, but we don't want a blocking
  // full-screen spinner during tab switches. Keep the UI responsive and only block during
  // the initial auth bootstrap / non-tab flows.
  const showOverlay =
    loading ||
    (checkingProfiles && !onTabs) ||
    waitingForClubhouseActivity;

  return (
    <View style={styles.wrapper}>
      {children}
      {showOverlay && (
        <View style={styles.overlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={LOADER_SPINNER} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  fullScreenLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4F6F52",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: LOADER_BACKGROUND,
    justifyContent: "center",
    alignItems: "center",
  },
});
