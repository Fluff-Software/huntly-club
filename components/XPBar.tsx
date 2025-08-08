import React from "react";
import { View } from "react-native";
import { ThemedText } from "./ThemedText";

interface XPBarProps {
  currentXP: number;
  level?: number;
  className?: string;
}

export const XPBar: React.FC<XPBarProps> = ({
  currentXP,
  level = 1,
  className = "",
}) => {
  // Calculate XP needed for next level (500 XP per level)
  const xpForNextLevel = level * 500;
  // Calculate progress within the current level
  const xpInCurrentLevel = currentXP % 500;
  const progress = Math.min((xpInCurrentLevel / 500) * 100, 100);

  return (
    <View className={`bg-white rounded-2xl p-4 shadow-soft ${className}`}>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="w-8 h-8 bg-huntly-amber rounded-full items-center justify-center mr-2">
            <ThemedText className="text-white text-sm font-bold">⭐</ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" className="text-huntly-forest">
            Level {level}
          </ThemedText>
        </View>
        <ThemedText type="caption" className="text-huntly-charcoal">
          {xpInCurrentLevel} / {500} XP
        </ThemedText>
      </View>

      {/* Progress Bar */}
      <View className="h-3 bg-huntly-mint rounded-full overflow-hidden border border-huntly-leaf">
        <View
          className="h-full bg-huntly-leaf rounded-full"
          style={{ width: `${progress}%` }}
        />
      </View>

      <View className="flex-row items-center justify-between mt-2">
        <ThemedText type="caption" className="text-huntly-charcoal">
          {500 - xpInCurrentLevel} XP to next level
        </ThemedText>
        <ThemedText type="caption" className="text-huntly-leaf font-semibold">
          {Math.round(progress)}%
        </ThemedText>
      </View>
    </View>
  );
};
