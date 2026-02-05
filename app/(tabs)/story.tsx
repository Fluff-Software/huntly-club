import React from "react";
import { View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { BaseLayout } from "@/components/layout/BaseLayout";

export default function StoryScreen() {
  return (
    <BaseLayout>
      <View className="flex-1 justify-center items-center">
        <ThemedText type="title" className="text-center font-jua">
          Story
        </ThemedText>
        <ThemedText type="body" className="text-center mt-2 opacity-80">
          Coming soon
        </ThemedText>
      </View>
    </BaseLayout>
  );
}
