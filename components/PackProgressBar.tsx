import React from "react";
import { View } from "react-native";
import { ThemedText } from "./ThemedText";

interface PackProgressBarProps {
  percentage: number;
  className?: string;
  showCompletionBadge?: boolean;
}

export const PackProgressBar: React.FC<PackProgressBarProps> = ({
  percentage,
  className = "",
  showCompletionBadge = false,
}) => {
  return (
    <View className={`${className}`}>
      {/* Progress Bar Container */}
      <View className="w-full h-2 bg-huntly-mint/30 rounded-full overflow-hidden">
        {/* Progress Fill */}
        <View
          className={`h-full rounded-full ${
            percentage === 100 ? "bg-huntly-amber" : "bg-huntly-leaf"
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </View>

      {/* Percentage Text and Completion Badge */}
      <View className="flex-row justify-between items-center mt-2">
        <ThemedText type="caption" className="text-huntly-charcoal">
          Progress
        </ThemedText>
        <View className="flex-row items-center">
          {showCompletionBadge && (
            <View className="bg-huntly-leaf px-2 py-1 rounded-full mr-2">
              <ThemedText
                type="caption"
                className="text-white font-bold text-xs"
              >
                ✓ COMPLETED
              </ThemedText>
            </View>
          )}
          <ThemedText
            type="caption"
            className="text-huntly-forest font-semibold"
          >
            {percentage}%
          </ThemedText>
        </View>
      </View>
    </View>
  );
};
