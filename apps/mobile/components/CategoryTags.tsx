import React from "react";
import { View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { getCategoryIcon, getCategoryColor } from "@/utils/categoryUtils";

interface CategoryTagsProps {
  categories: string[];
  size?: "small" | "medium" | "large";
  maxDisplay?: number;
  showIcons?: boolean;
}

export const CategoryTags: React.FC<CategoryTagsProps> = ({
  categories,
  size = "medium",
  maxDisplay = 3,
  showIcons = true,
}) => {
  if (!categories || categories.length === 0) {
    return null;
  }

  const displayCategories = categories.slice(0, maxDisplay);
  const remainingCount = categories.length - maxDisplay;

  const getSizeClasses = () => {
    switch (size) {
      case "small":
        return { container: "px-2 py-1", text: "text-xs", iconSize: 12 };
      case "large":
        return { container: "px-3 py-2", text: "text-sm", iconSize: 16 };
      default:
        return { container: "px-2.5 py-1.5", text: "text-xs", iconSize: 14 };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <View className="flex-row flex-wrap gap-1">
      {displayCategories.map((category, index) => (
        <View
          key={category}
          className={`rounded-full ${sizeClasses.container} bg-white border border-gray-200`}
        >
          <View className="flex-row items-center">
            {showIcons && (
              <View className="mr-1">
                <MaterialIcons
                  name={getCategoryIcon(category) as any}
                  size={sizeClasses.iconSize}
                  color={getCategoryColor(category)}
                />
              </View>
            )}
            <ThemedText
              type="caption"
              className={`${sizeClasses.text} font-medium text-gray-700`}
            >
              {category}
            </ThemedText>
          </View>
        </View>
      ))}
      
      {remainingCount > 0 && (
        <View
          className={`rounded-full ${sizeClasses.container} bg-gray-200`}
        >
          <ThemedText
            type="caption"
            className={`${sizeClasses.text} text-gray-600 font-medium`}
          >
            +{remainingCount}
          </ThemedText>
        </View>
      )}
    </View>
  );
};
