import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchases } from "@/contexts/PurchasesContext";
import { useSignUpOptional } from "@/contexts/SignUpContext";
import { getProfiles, getUserData } from "@/services/profileService";
import { REQUIRE_EMAIL_VERIFICATION } from "@/constants/auth";
import {
  START_MISSION_STEP,
  isStartMissionOnboardingActive,
} from "@/constants/startMissionOnboarding";
import { getWeekOneRippedMapChapterId } from "@/services/startMissionOnboardingService";
import { getActivityByName } from "@/services/packService";

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
  const [checkingProfiles, setCheckingProfiles] = useState(true);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth";
    const inGetStarted = segments[0] === "get-started";
    const inSignUp = segments[0] === "sign-up";
    const inOnboarding = segments[0] === "onboarding";
    const inPrivacy = segments[0] === "privacy";
    const inStorySlides =
      segments[0] === "(tabs)" && segments[1] === "story" && segments[2] === "slides";
    const inMissionFlow = segments[0] === "(tabs)" && segments[1] === "activity";
    const inUnauthFlow = inAuthGroup || inGetStarted || inSignUp || inPrivacy;

    if (!user && !inUnauthFlow) {
      router.replace("/auth");
      return;
    }

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
        Promise.all([getProfiles(user.id), getUserData(user.id)])
          .then(([profiles, userData]) => {
            if (profiles.length === 0) {
              router.replace("/sign-up/players");
            } else if (userData?.team == null) {
              router.replace("/sign-up/team");
            } else if (isStartMissionOnboardingActive(userData.start_mission_step)) {
              if (userData.start_mission_step <= START_MISSION_STEP.WELCOME) {
                router.replace("/onboarding/welcome");
              } else if (userData.start_mission_step === START_MISSION_STEP.TEASER) {
                router.replace("/onboarding/teaser");
              } else if (userData.start_mission_step === START_MISSION_STEP.MISSION_INTRO) {
                router.replace("/onboarding/mission-intro");
              } else {
                router.replace("/(tabs)");
              }
            } else {
              router.replace("/(tabs)");
            }
          })
          .catch((error) => {
            console.error("Error checking profiles/user data:", error);
            router.replace("/(tabs)");
          })
          .finally(() => setCheckingProfiles(false));
      } else {
        setCheckingProfiles(false);
      }
      return;
    }

    if (user && inOnboarding) {
      setCheckingProfiles(true);
      Promise.all([getProfiles(user.id), getUserData(user.id)])
        .then(async ([profiles, userData]) => {
          if (profiles.length === 0) {
            router.replace("/sign-up/players");
            return;
          }
          if (userData?.team == null) {
            router.replace("/sign-up/team");
            return;
          }
          if (!isStartMissionOnboardingActive(userData.start_mission_step)) {
            router.replace("/(tabs)");
            return;
          }
          if (userData.start_mission_step <= START_MISSION_STEP.WELCOME && segments[1] !== "welcome") {
            router.replace("/onboarding/welcome");
            return;
          }
          if (userData.start_mission_step === START_MISSION_STEP.TEASER && segments[1] !== "teaser") {
            router.replace("/onboarding/teaser");
            return;
          }
          if (
            userData.start_mission_step === START_MISSION_STEP.MISSION_INTRO &&
            segments[1] !== "mission-intro"
          ) {
            router.replace("/onboarding/mission-intro");
          }
        })
        .catch((error) => {
          console.error("Error validating onboarding route:", error);
        })
        .finally(() => setCheckingProfiles(false));
      return;
    }

    if (user && !inUnauthFlow && !inOnboarding) {
      setCheckingProfiles(true);
      Promise.all([getProfiles(user.id), getUserData(user.id)])
        .then(async ([profiles, userData]) => {
          if (profiles.length === 0) {
            router.replace("/sign-up/players");
            return;
          }
          if (userData?.team == null) {
            router.replace("/sign-up/team");
            return;
          }
          if (!isStartMissionOnboardingActive(userData.start_mission_step)) return;

          const onboardingStep = userData.start_mission_step;
          if (onboardingStep <= START_MISSION_STEP.WELCOME) {
            router.replace("/onboarding/welcome");
            return;
          }
          if (onboardingStep === START_MISSION_STEP.TEASER) {
            router.replace("/onboarding/teaser");
            return;
          }
          if (onboardingStep === START_MISSION_STEP.STORY) {
            if (inStorySlides) return;
            const chapterId = await getWeekOneRippedMapChapterId();
            if (chapterId != null) {
              router.replace({
                pathname: "/(tabs)/story/slides",
                params: {
                  source: "chapter",
                  chapterId: String(chapterId),
                  onboardingFlow: "start-mission",
                },
              });
            } else {
              router.replace("/onboarding/teaser");
            }
            return;
          }
          if (onboardingStep === START_MISSION_STEP.MISSION_INTRO) {
            router.replace("/onboarding/mission-intro");
            return;
          }
          if (onboardingStep === START_MISSION_STEP.MISSION_IN_PROGRESS) {
            if (inMissionFlow) return;
            const activity = await getActivityByName("build_your_base");
            if (activity?.id != null) {
              router.replace({
                pathname: "/(tabs)/activity/mission",
                params: { id: String(activity.id), onboardingFlow: "start-mission" },
              });
            } else {
              router.replace("/onboarding/mission-intro");
            }
          }
        })
        .catch((error) => {
          console.error("Error checking mission-first onboarding:", error);
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

  const showOverlay = loading || (checkingProfiles && segments[0] !== "onboarding");

  return (
    <View style={styles.wrapper}>
      {children}
      {showOverlay && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" />
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
});
