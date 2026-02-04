import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { ThemedView } from "@/components/ThemedView";
import { getProfiles } from "@/services/profileService";

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const { currentPlayer } = usePlayer();
  const segments = useSegments();
  const router = useRouter();
  const [checkingProfiles, setCheckingProfiles] = useState(false);

  useEffect(() => {
    if (loading || checkingProfiles) return;

    const inAuthGroup = segments[0] === "auth";
    const inGetStarted = segments[0] === "get-started";
    const inSignUp = segments[0] === "sign-up";
    const inPrivacy = segments[0] === "privacy";
    const inUnauthFlow = inAuthGroup || inGetStarted || inSignUp || inPrivacy;
    const inTabsGroup = segments[0] === "(tabs)";

    const checkProfiles = async () => {
      if (!user) return;

      setCheckingProfiles(true);
      try {
        const profiles = await getProfiles(user.id);
        // Always redirect to profile tab after login to select an explorer
        if (inTabsGroup && segments[1] !== "profile") {
          router.replace("/(tabs)/profile");
        }
      } catch (error) {
        console.error("Error checking profiles:", error);
      } finally {
        setCheckingProfiles(false);
      }
    };

    if (!user && !inUnauthFlow) {
      // Redirect to the auth screen if user is not authenticated and not in auth/get-started flow
      router.replace("/auth");
    } else if (user && (inAuthGroup || inGetStarted || inSignUp)) {
      // When user logs in from auth screen, redirect to profile tab to select explorer
      router.replace("/(tabs)/profile");
    } else if (
      user &&
      inTabsGroup &&
      !currentPlayer &&
      segments[1] !== "profile" &&
      segments[1] !== "parents"
    ) {
      // User is authenticated but no current player selected, redirect to profile tab
      // Allow access to parents screen even without current player
      router.replace("/(tabs)/profile");
    }
  }, [user, loading, segments, checkingProfiles, currentPlayer]);

  if (loading || checkingProfiles) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
