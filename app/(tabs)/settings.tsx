import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { MaterialIcons } from "@expo/vector-icons";

const COLORS = {
  darkGreen: "#4F6F52",
  cream: "#F8F7F4",
  white: "#FFFFFF",
  black: "#000000",
};

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { scaleW, scaleH } = useLayoutScale();
  const [weeklyEmail, setWeeklyEmail] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);

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
        scrollView: { flex: 1 },
        scrollContent: {
          paddingHorizontal: scaleW(24),
          paddingTop: scaleH(24),
          paddingBottom: scaleH(32),
        },
        sectionTitle: {
          fontSize: scaleW(18),
          fontWeight: "600",
          color: COLORS.white,
          marginBottom: scaleH(8),
        },
        email: {
          fontSize: scaleW(15),
          color: COLORS.white,
          marginBottom: scaleH(20),
        },
        signOutButton: {
          width: scaleW(240),
          backgroundColor: COLORS.cream,
          borderRadius: scaleW(48),
          paddingVertical: scaleH(16),
          paddingHorizontal: scaleW(24),
          alignItems: "center",
          justifyContent: "center",
          marginBottom: scaleH(48),
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
          marginBottom: scaleH(16),
        },
        prefRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: scaleH(14),
        },
        prefLabel: {
          fontSize: scaleW(16),
          color: COLORS.white,
          flex: 1,
        },
        checkbox: {
          width: scaleW(24),
          height: scaleH(24),
          borderRadius: scaleW(6),
          borderWidth: 2,
          borderColor: COLORS.white,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.white,
        },
      }),
    [scaleW, scaleH]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="heading" style={styles.sectionTitle}>Your account</ThemedText>
        <ThemedText style={styles.email} numberOfLines={1}>
          {user?.email ?? "parentemail@somewhere.com"}
        </ThemedText>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <ThemedText type="heading" style={styles.signOutText}>Sign Out</ThemedText>
        </Pressable>

        <ThemedText type="heading" style={styles.prefsTitle}>Your preferences</ThemedText>
        <Pressable
          style={styles.prefRow}
          onPress={() => setWeeklyEmail((v) => !v)}
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
        <Pressable
          style={styles.prefRow}
          onPress={() => setPushNotifications((v) => !v)}
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
      </ScrollView>
    </SafeAreaView>
  );
}
