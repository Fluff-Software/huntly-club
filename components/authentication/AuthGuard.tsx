import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
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

    if (!user && !inUnauthFlow) {
      router.replace("/auth");
      return;
    }

    if (user && (inAuthGroup || inGetStarted || inSignUp)) {
      if (!inSignUp) {
        setCheckingProfiles(true);
        getProfiles(user.id)
          .then((profiles) => {
            if (profiles.length === 0) {
              router.replace("/sign-up/players");
            } else {
              router.replace("/(tabs)");
            }
          })
          .catch((error) => {
            console.error("Error checking profiles:", error);
            router.replace("/(tabs)");
          })
          .finally(() => setCheckingProfiles(false));
      }
      return;
    }

    if (
      user &&
      inTabsGroup &&
      !currentPlayer &&
      segments[1] !== "profile" &&
      segments[1] !== "parents"
    ) {
      setCheckingProfiles(true);
      getProfiles(user.id)
        .then((profiles) => {
          if (profiles.length === 0) {
            router.replace("/sign-up/players");
          } else {
            // Stay on current tab (e.g. dashboard); PlayerContext will auto-select first profile
          }
        })
        .catch((error) => {
          console.error("Error checking profiles:", error);
          router.replace("/(tabs)");
        })
        .finally(() => setCheckingProfiles(false));
    }
  }, [user, loading, segments, checkingProfiles, currentPlayer]);

  const showOverlay = loading || checkingProfiles;

  return (
    <View style={styles.wrapper}>
      {children}
      {showOverlay && (
        <ThemedView style={styles.overlay}>
          <ActivityIndicator size="large" />
        </ThemedView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
});
