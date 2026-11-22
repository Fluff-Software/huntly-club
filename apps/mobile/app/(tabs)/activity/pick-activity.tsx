import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { FKPageHeader } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { useAuth } from "@/contexts/AuthContext";
import { getAvailableActivityTypes, type ActivityTypeKey } from "@/constants/activityTypes";
import { useExploreRegionSupport } from "@/hooks/useExploreRegionSupport";

/** Short, plain descriptions for this screen. */
const COPY: Partial<Record<ActivityTypeKey, string>> = {
  walk: "Head out on foot. We'll map your route as you go.",
  cycle: "Ride together and see how far you went.",
  hunt: "Follow the clues to find things outdoors.",
  explore: "Find cards hidden around your neighbourhood.",
};

/** Extras for any day. Missions are the main story and live in their own tab. */
export default function PickActivityScreen() {
  const { user } = useAuth();
  const { isSupported: exploreSupported } = useExploreRegionSupport();
  const activityTypes = getAvailableActivityTypes(Platform.OS, user?.email).filter(
    (type) => type.key !== "mission" && (type.key !== "explore" || exploreSupported)
  );

  const back = () => (router.canGoBack() ? router.back() : router.navigate("/(tabs)"));

  return (
    <>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <FKPageHeader onBack={back} eyebrow="EXTRAS" title="More ways to play" />
          <Text style={[TYPE.body, { color: FK.muted, marginTop: -6 }]}>
            Missions are the main story. These are for any day you fancy getting out.
          </Text>

          <View style={styles.list}>
            {activityTypes.map((type, i) => (
              <Animated.View key={type.key} entering={FadeInDown.duration(300).delay(i * 50)}>
                <Pressable
                  onPress={() => router.push(type.route as Parameters<typeof router.push>[0])}
                  style={styles.card}
                  accessibilityRole="button"
                  accessibilityLabel={type.label}
                  testID={`play-${type.key}`}
                >
                  <View style={[styles.icon, { backgroundColor: type.tint }]}>
                    <MaterialIcons name={type.icon} size={30} color={type.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{type.label}</Text>
                    <Text style={styles.desc}>{COPY[type.key] ?? type.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={FK.muted} />
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FK.moss },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 },
  list: { gap: 12, marginTop: 22 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: FK.paper,
    borderRadius: RADIUS.lg,
    padding: 18,
  },
  icon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: FONT.display, fontSize: 21, color: FK.ink },
  desc: { fontFamily: FONT.body, fontSize: 15, lineHeight: 21, color: FK.muted, marginTop: 2 },
});
