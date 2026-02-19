import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { MaterialIcons } from "@expo/vector-icons";
import { BackHeader } from "@/components/BackHeader";

const COLORS = {
  darkGreen: "#4F6F52",
  cream: "#F8F7F4",
  white: "#FFFFFF",
  black: "#000000",
};

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { scaleW } = useLayoutScale();
  const [weeklyEmail, setWeeklyEmail] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);

  const signOutScale = useSharedValue(1);
  const weeklyEmailScale = useSharedValue(1);
  const pushScale = useSharedValue(1);
  const privacyScale = useSharedValue(1);
  const signOutAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: signOutScale.value }],
  }));
  const weeklyEmailAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: weeklyEmailScale.value }],
  }));
  const pushAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pushScale.value }],
  }));
  const privacyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: privacyScale.value }],
  }));

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch {
            Alert.alert("Error", "Failed to sign out");
          }
        },
      },
    ]);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: COLORS.darkGreen,
        },
        headerBar: {
          backgroundColor: COLORS.darkGreen,
        },
        scrollView: { flex: 1 },
        scrollContent: {
          paddingHorizontal: scaleW(24),
          paddingTop: scaleW(8),
          paddingBottom: scaleW(32),
        },
        sectionTitle: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: COLORS.white,
          marginBottom: scaleW(8),
        },
        email: {
          fontSize: scaleW(15),
          color: COLORS.white,
          marginBottom: scaleW(20),
        },
        signOutButton: {
          width: scaleW(240),
          backgroundColor: COLORS.cream,
          borderRadius: scaleW(48),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(24),
          alignItems: "center",
          justifyContent: "center",
          marginBottom: scaleW(48),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2,
        },
        signOutText: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: COLORS.darkGreen,
        },
        prefsTitle: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: COLORS.white,
          marginBottom: scaleW(16),
        },
        prefRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: scaleW(14),
        },
        prefLabel: {
          fontSize: scaleW(16),
          color: COLORS.white,
          flex: 1,
        },
        checkbox: {
          width: scaleW(24),
          height: scaleW(24),
          borderRadius: scaleW(6),
          borderWidth: 2,
          borderColor: COLORS.white,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.white,
        },
        privacyButton: {
          width: "100%",
          maxWidth: scaleW(280),
          alignSelf: "center",
          backgroundColor: COLORS.cream,
          borderRadius: scaleW(48),
          paddingVertical: scaleW(16),
          paddingHorizontal: scaleW(24),
          alignItems: "center",
          justifyContent: "center",
          marginTop: scaleW(24),
          marginBottom: scaleW(24),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2,
        },
        privacyButtonText: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: COLORS.darkGreen,
        },
      }),
    [scaleW]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={[styles.headerBar, { paddingHorizontal: scaleW(24), paddingBottom: scaleW(8) }]}>
        <BackHeader backToLabel="Back" backTo="/(tabs)/parents" />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <Animated.View entering={FadeInDown.duration(500).delay(0).springify().damping(18)}>
          <ThemedText type="heading" style={styles.sectionTitle}>Your account</ThemedText>
          <ThemedText style={styles.email} numberOfLines={1}>
            {user?.email ?? "parentemail@somewhere.com"}
          </ThemedText>
          <Animated.View style={signOutAnimatedStyle}>
            <Pressable
              style={styles.signOutButton}
              onPress={handleSignOut}
              onPressIn={() => {
                signOutScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                signOutScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
            >
              <ThemedText type="heading" style={styles.signOutText}>Sign Out</ThemedText>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(150).springify().damping(18)}>
          <ThemedText type="heading" style={styles.prefsTitle}>Your preferences</ThemedText>
          <Animated.View style={weeklyEmailAnimatedStyle}>
            <Pressable
              style={styles.prefRow}
              onPress={() => setWeeklyEmail((v) => !v)}
              onPressIn={() => {
                weeklyEmailScale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                weeklyEmailScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
            >
              <ThemedText style={styles.prefLabel}>Receive weekly email</ThemedText>
              <View style={styles.checkbox}>
                {weeklyEmail ? (
                  <MaterialIcons
                    name="check"
                    size={scaleW(18)}
                    color={COLORS.darkGreen}
                  />
                ) : null}
              </View>
            </Pressable>
          </Animated.View>
          <Animated.View style={pushAnimatedStyle}>
            <Pressable
              style={styles.prefRow}
              onPress={() => setPushNotifications((v) => !v)}
              onPressIn={() => {
                pushScale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                pushScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
            >
              <ThemedText style={styles.prefLabel}>
                Receive push notifications
              </ThemedText>
              <View style={styles.checkbox}>
                {pushNotifications ? (
                  <MaterialIcons
                    name="check"
                    size={scaleW(18)}
                    color={COLORS.darkGreen}
                  />
                ) : null}
              </View>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200).springify().damping(18)}>
          <ThemedText type="heading" style={styles.prefsTitle}>Legal</ThemedText>
          <Animated.View style={privacyAnimatedStyle}>
            <Pressable
              style={styles.privacyButton}
              onPress={() => router.push("/privacy")}
              onPressIn={() => {
                privacyScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
              }}
              onPressOut={() => {
                privacyScale.value = withSpring(1, { damping: 15, stiffness: 400 });
              }}
            >
              <ThemedText type="heading" style={styles.privacyButtonText}>
                Privacy Policy
              </ThemedText>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
