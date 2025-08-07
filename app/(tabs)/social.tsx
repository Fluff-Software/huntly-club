import { View } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { ThemedText } from "@/components/ThemedText";

export default function SocialScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <BaseLayout className="bg-huntly-cream">
      <View className="flex-1 items-center justify-center p-8">
        {/* Character Illustration */}
        <View className="w-24 h-24 bg-huntly-sage rounded-full items-center justify-center mb-6">
          <ThemedText className="text-4xl">🦊</ThemedText>
        </View>

        {/* Coming Soon Message */}
        <ThemedText
          type="heading"
          className="text-huntly-forest text-center mb-4"
        >
          Coming Soon!
        </ThemedText>

        <ThemedText
          type="body"
          className="text-huntly-charcoal text-center mb-8 leading-6"
        >
          Social features are in development. Soon you'll be able to share
          adventures with friends and family!
        </ThemedText>

        {/* Feature Preview */}
        <View className="bg-white rounded-2xl p-6 shadow-soft w-full max-w-sm">
          <ThemedText
            type="subtitle"
            className="text-huntly-forest text-center mb-4"
          >
            What's Coming
          </ThemedText>

          <View className="space-y-3">
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-huntly-mint rounded-full items-center justify-center mr-3">
                <ThemedText className="text-huntly-forest text-sm">
                  🌿
                </ThemedText>
              </View>
              <ThemedText type="body" className="text-huntly-charcoal flex-1">
                Share your discoveries
              </ThemedText>
            </View>

            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-huntly-mint rounded-full items-center justify-center mr-3">
                <ThemedText className="text-huntly-forest text-sm">
                  👥
                </ThemedText>
              </View>
              <ThemedText type="body" className="text-huntly-charcoal flex-1">
                Team up with friends
              </ThemedText>
            </View>

            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-huntly-mint rounded-full items-center justify-center mr-3">
                <ThemedText className="text-huntly-forest text-sm">
                  🏆
                </ThemedText>
              </View>
              <ThemedText type="body" className="text-huntly-charcoal flex-1">
                Compete for badges
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    </BaseLayout>
  );
}
