import React from "react";
import { View, Modal, Pressable, Dimensions, Image } from "react-native";
import { ThemedText } from "./ThemedText";
import { Badge, getBadgeDisplay, UserBadge } from "@/services/badgeService";

interface BadgeDetailModalProps {
  visible: boolean;
  badge: Badge | null;
  earnedAt?: string;
  onClose: () => void;
  allBadges?: UserBadge[];
  currentIndex?: number;
  onNext?: () => void;
  onPrev?: () => void;
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

export const BadgeDetailModal: React.FC<BadgeDetailModalProps> = ({
  visible,
  badge,
  earnedAt,
  onClose,
  allBadges = [],
  currentIndex = 0,
  onNext,
  onPrev,
}) => {
  if (!badge) return null;

  const badgeDisplay = getBadgeDisplay(badge);
  const hasMultipleBadges = allBadges.length > 1;
  const canGoNext = hasMultipleBadges && currentIndex < allBadges.length - 1;
  const canGoPrev = hasMultipleBadges && currentIndex > 0;

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getRequirementText = () => {
    switch (badge.requirement_type) {
      case "xp_gained":
        return `Earn ${badge.requirement_value} XP through completing activities`;
      case "packs_completed":
        return `Complete ${badge.requirement_value} pack${
          badge.requirement_value > 1 ? "s" : ""
        } of activities`;
      case "activities_completed":
        return `Complete ${badge.requirement_value} nature-related activities`;
      case "team_xp":
        return `Contribute ${badge.requirement_value} XP to your team`;
      default:
        return "Complete the required challenge";
    }
  };

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
          <View className="flex-row items-center justify-between mb-8">
            <ThemedText type="subtitle" className="text-huntly-forest">
              Badge Details
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

          {/* Navigation Arrows */}
          {hasMultipleBadges && (
            <View className="flex-row items-center justify-between mb-6">
              <Pressable
                onPress={onPrev}
                disabled={!canGoPrev}
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  canGoPrev ? "bg-huntly-mint" : "bg-gray-200"
                }`}
              >
                <ThemedText
                  className={`text-lg font-bold ${
                    canGoPrev ? "text-huntly-forest" : "text-gray-400"
                  }`}
                >
                  ←
                </ThemedText>
              </Pressable>

              <View className="bg-huntly-sage/20 px-3 py-1 rounded-full">
                <ThemedText
                  type="caption"
                  className="text-huntly-forest font-semibold"
                >
                  {currentIndex + 1} of {allBadges.length}
                </ThemedText>
              </View>

              <Pressable
                onPress={onNext}
                disabled={!canGoNext}
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  canGoNext ? "bg-huntly-mint" : "bg-gray-200"
                }`}
              >
                <ThemedText
                  className={`text-lg font-bold ${
                    canGoNext ? "text-huntly-forest" : "text-gray-400"
                  }`}
                >
                  →
                </ThemedText>
              </Pressable>
            </View>
          )}

          {/* Large Badge Icon */}
          <View className="items-center mb-8">
            <View className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full items-center justify-center mb-6 shadow-soft">
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
            className="text-huntly-forest text-center mb-4"
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

          {/* Requirement Info */}
          <View className="bg-huntly-mint/20 rounded-2xl p-4 mb-6">
            <ThemedText
              type="defaultSemiBold"
              className="text-huntly-forest mb-2"
            >
              How to Earn:
            </ThemedText>
            <ThemedText type="body" className="text-huntly-charcoal">
              {getRequirementText()}
            </ThemedText>
          </View>

          {/* Earned Date */}
          {earnedAt && (
            <View className="bg-huntly-sage/20 rounded-2xl p-4 mb-6">
              <ThemedText
                type="defaultSemiBold"
                className="text-huntly-forest mb-2"
              >
                Earned:
              </ThemedText>
              <ThemedText type="body" className="text-huntly-charcoal">
                {formatDate(earnedAt)}
              </ThemedText>
            </View>
          )}

          {/* Close Button */}
          <Pressable
            onPress={onClose}
            className="bg-huntly-leaf py-4 rounded-2xl items-center shadow-soft"
          >
            <ThemedText type="defaultSemiBold" className="text-white">
              Close
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};
