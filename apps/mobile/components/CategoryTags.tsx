import React from "react";
import { View, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";

export type CategoryInfo = {
  id: number;
  name: string;
  icon: string | null;
};

interface CategoryTagsProps {
  /** Resolved category infos (id, name, icon URL). Use this when activities have category ids. */
  categoryInfos?: CategoryInfo[];
  /** @deprecated Use categoryInfos. Raw category names for legacy display. */
  categories?: string[];
  size?: "small" | "medium" | "large";
  maxDisplay?: number;
  showIcons?: boolean;
}

export const CategoryTags: React.FC<CategoryTagsProps> = ({
  categoryInfos = [],
  categories = [],
  size = "medium",
  maxDisplay = 3,
  showIcons = true,
}) => {
  const useInfos = categoryInfos.length > 0;
  const displayItems = useInfos
    ? categoryInfos.slice(0, maxDisplay)
    : categories.slice(0, maxDisplay).map((name, i) => ({ id: i, name, icon: null as string | null }));
  const remainingCount = useInfos
    ? categoryInfos.length - maxDisplay
    : categories.length - maxDisplay;

  if (displayItems.length === 0) {
    return null;
  }

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
      {displayItems.map((item, index) => (
        <View
          key={useInfos ? item.id : item.name}
          className={`rounded-full ${sizeClasses.container} bg-white border border-gray-200`}
        >
          <View className="flex-row items-center">
            {showIcons && "icon" in item && item.icon ? (
              <View className="mr-1 overflow-hidden rounded" style={{ width: sizeClasses.iconSize, height: sizeClasses.iconSize }}>
                <Image
                  source={{ uri: item.icon }}
                  style={{ width: sizeClasses.iconSize, height: sizeClasses.iconSize }}
                  resizeMode="cover"
                />
              </View>
            ) : showIcons ? (
              <View className="mr-1">
                <MaterialIcons name="label" size={sizeClasses.iconSize} color="#6B7280" />
              </View>
            ) : null}
            <ThemedText
              type="caption"
              className={`${sizeClasses.text} font-medium text-gray-700`}
            >
              {item.name}
            </ThemedText>
          </View>
        </View>
      ))}

      {remainingCount > 0 && (
        <View className={`rounded-full ${sizeClasses.container} bg-gray-200`}>
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
