import React from "react";
import { View, Platform, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useAuth } from "@/contexts/AuthContext";
import { getAvailableActivityTypes } from "@/constants/activityTypes";

const BG = "#2D4A35";
const CARD_BG = "#3D5F45";
const ACCENT = "#62A94F";

export default function PickActivityScreen() {
  const router = useRouter();
  const { scaleW } = useLayoutScale();
  const { user } = useAuth();
  const activityTypes = getAvailableActivityTypes(Platform.OS, user?.email);

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.container}>
          {/* Header */}
          <View style={{ paddingHorizontal: scaleW(24), paddingTop: scaleW(8), paddingBottom: scaleW(32) }}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={{ alignSelf: "flex-start", paddingVertical: scaleW(4), marginBottom: scaleW(24) }}
            >
              <MaterialIcons name="arrow-back" size={scaleW(28)} color="#FFFFFF" />
            </Pressable>

            <ThemedText
              type="heading"
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{ fontSize: scaleW(30), fontWeight: "800", lineHeight: scaleW(36) }}
            >
              Go on an Adventure
            </ThemedText>
            <ThemedText
              lightColor="rgba(255,255,255,0.7)"
              darkColor="rgba(255,255,255,0.7)"
              style={{ fontSize: scaleW(15), marginTop: scaleW(6) }}
            >
              Pick a way to get outside and earn rewards together.
            </ThemedText>
          </View>

          {/* Activity cards */}
          <View style={{ paddingHorizontal: scaleW(24), gap: scaleW(16) }}>
            {activityTypes.map((type) => (
              <Pressable
                key={type.key}
                onPress={() => router.push(type.route as Parameters<typeof router.push>[0])}
                style={({ pressed }) => [
                  styles.card,
                  { paddingHorizontal: scaleW(20), paddingVertical: scaleW(24), borderRadius: scaleW(20) },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: scaleW(16) }}>
                  <View style={{
                    backgroundColor: "rgba(98,169,79,0.25)",
                    borderRadius: scaleW(16),
                    width: scaleW(60),
                    height: scaleW(60),
                    alignItems: "center",
                    justifyContent: "center" }}>
                    <MaterialIcons name={type.icon} size={scaleW(32)} color={ACCENT} />
                  </View>
                  <View style={{ flex: 1, gap: scaleW(3) }}>
                    <ThemedText
                      type="heading"
                      lightColor="#FFFFFF"
                      darkColor="#FFFFFF"
                      style={{ fontSize: scaleW(22), fontWeight: "800" }}
                    >
                      {type.label}
                    </ThemedText>
                    <ThemedText
                      lightColor="rgba(255,255,255,0.65)"
                      darkColor="rgba(255,255,255,0.65)"
                      style={{ fontSize: scaleW(13), lineHeight: scaleW(19) }}
                    >
                      {type.description}
                    </ThemedText>
                  </View>
                  <MaterialIcons name="chevron-right" size={scaleW(26)} color="rgba(255,255,255,0.5)" />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },
  card: { backgroundColor: CARD_BG },
});
