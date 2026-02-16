import { Link, Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F4F0EB" }} edges={["top", "left", "right"]}>
      <ThemedView className="flex-1 bg-huntly-cream">
        <View className="flex-1 items-center justify-center p-8">
          {/* Character Illustration */}
          <View className="w-24 h-24 bg-huntly-sage rounded-full items-center justify-center mb-6">
            <ThemedText className="text-4xl">🤔</ThemedText>
          </View>

          <ThemedText
            type="title"
            className="text-huntly-forest text-center mb-4"
          >
            Adventure Not Found!
          </ThemedText>

          <ThemedText
            type="body"
            className="text-huntly-charcoal text-center mb-8 leading-6"
          >
            This path doesn't exist in our forest. Let's go back to the main
            trail!
          </ThemedText>

          <Link
            href="/"
            className="bg-huntly-amber px-8 py-4 rounded-xl shadow-soft"
          >
            <ThemedText className="text-huntly-forest font-bold text-lg">
              Back to Home
            </ThemedText>
          </Link>
        </View>
      </ThemedView>
      </SafeAreaView>
    </>
  );
}
