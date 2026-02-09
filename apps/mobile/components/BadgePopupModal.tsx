import React from "react";
import { View, Modal, Pressable, Dimensions, Image } from "react-native";
import { ThemedText } from "./ThemedText";
import { Badge, getBadgeDisplay } from "@/services/badgeService";

interface BadgePopupModalProps {
  visible: boolean;
  badge: Badge | null;
  onClose: () => void;
  onViewAllBadges: () => void;
}

const { width, height } = Dimensions.get("window");

// Helper function to get local image source
const getLocalImageSource = (imagePath: string) => {
  if (imagePath.includes("first-steps-badge")) {
    return require("@/assets/images/first-steps-badge.png");
  }
  // Add more cases as needed
  return null;
};

export const BadgePopupModal: React.FC<BadgePopupModalProps> = ({
  visible,
  badge,
  onClose,
  onViewAllBadges,
}) => {
  if (!badge) return null;

  const badgeDisplay = getBadgeDisplay(badge);

  const getImageSource = () => {
    if (badgeDisplay.type === "image") {
      if (badgeDisplay.content.startsWith("http")) {
        return { uri: badgeDisplay.content };
      } else {
        // Handle local images
        const localSource = getLocalImageSource(badgeDisplay.content);
        if (localSource) {
          return localSource;
        }
      }
    }
    return null;
  };

  const imageSource = getImageSource();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-6">
        <View className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-soft">
          {/* Header with Close Button */}
          <View className="flex-row items-center justify-between mb-6">
            <ThemedText type="subtitle" className="text-huntly-forest">
              Badge Earned!
            </ThemedText>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
            >
              <ThemedText className="text-huntly-charcoal text-lg font-bold">
                ×
              </ThemedText>
            </Pressable>
          </View>

          {/* Badge Icon */}
          <View className="items-center mb-6">
            <View className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full items-center justify-center mb-4 shadow-soft">
              {badgeDisplay.type === "image" && imageSource ? (
                <Image
                  source={imageSource}
                  className="w-24 h-24"
                  resizeMode="contain"
                />
              ) : (
                <ThemedText className="text-6xl">
                  {badgeDisplay.content}
                </ThemedText>
              )}
            </View>
          </View>

          {/* Badge Title */}
          <ThemedText
            type="title"
            className="text-huntly-forest text-center mb-3"
          >
            {badge.name}
          </ThemedText>

          {/* Badge Description */}
          <ThemedText
            type="body"
            className="text-huntly-charcoal text-center mb-6 leading-6"
          >
            {badge.description}
          </ThemedText>

          {/* Action Buttons */}
          <View className="space-y-3">
            <Pressable
              onPress={onViewAllBadges}
              className="bg-huntly-leaf py-4 rounded-2xl items-center shadow-soft"
            >
              <ThemedText type="defaultSemiBold" className="text-white">
                View All Badges
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={onClose}
              className="bg-gray-100 py-4 rounded-2xl items-center"
            >
              <ThemedText
                type="defaultSemiBold"
                className="text-huntly-charcoal"
              >
                Continue Exploring
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
