import React from "react";
import { View, Modal, Pressable, Image } from "react-native";
import { ThemedText } from "./ThemedText";
import { Badge, getBadgeDisplay } from "@/services/badgeService";
import { useLayoutScale } from "@/hooks/useLayoutScale";

interface BadgePopupModalProps {
  visible: boolean;
  badge: Badge | null;
  onClose: () => void;
  onViewAllBadges: () => void;
}

export const BadgePopupModal: React.FC<BadgePopupModalProps> = ({
  visible,
  badge,
  onClose,
  onViewAllBadges,
}) => {
  const { scaleW, isTablet } = useLayoutScale();
  if (!badge) return null;

  const badgeDisplay = getBadgeDisplay(badge);

  const getImageSource = () => {
    if (badgeDisplay.type === "image" && badgeDisplay.content.startsWith("http")) {
      return { uri: badgeDisplay.content };
    }
    return null;
  };

  const imageSource = getImageSource();
  const cardPadding = scaleW(isTablet ? 26 : 20);
  const iconOuter = scaleW(isTablet ? 140 : 120);
  const iconInner = scaleW(isTablet ? 104 : 88);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 bg-black/50 justify-center items-center"
        style={{ padding: scaleW(20) }}
      >
        <View
          className="bg-white rounded-3xl w-full shadow-soft"
          style={{ padding: cardPadding, maxWidth: scaleW(isTablet ? 460 : 360) }}
        >
          {/* Header with Close Button */}
          <View
            className="flex-row items-center justify-between"
            style={{ marginBottom: scaleW(16) }}
          >
            <ThemedText type="subtitle" className="text-huntly-forest">
              Badge Earned!
            </ThemedText>
            <Pressable
              onPress={onClose}
              className="bg-gray-100 rounded-full items-center justify-center"
              style={{ width: scaleW(32), height: scaleW(32) }}
            >
              <ThemedText
                className="text-huntly-charcoal font-bold"
                style={{ fontSize: scaleW(16) }}
              >
                ×
              </ThemedText>
            </Pressable>
          </View>

          {/* Badge Icon */}
          <View className="items-center" style={{ marginBottom: scaleW(16) }}>
            <View
              className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full items-center justify-center shadow-soft"
              style={{ width: iconOuter, height: iconOuter, marginBottom: scaleW(10) }}
            >
              {badgeDisplay.type === "image" && imageSource ? (
                <Image
                  source={imageSource}
                  style={{ width: iconInner, height: iconInner }}
                  resizeMode="contain"
                />
              ) : (
                <ThemedText style={{ fontSize: scaleW(52), lineHeight: scaleW(56) }}>
                  {badgeDisplay.content}
                </ThemedText>
              )}
            </View>
          </View>

          {/* Badge Title */}
          <ThemedText
            type="title"
            className="text-huntly-forest text-center"
            style={{ marginBottom: scaleW(8) }}
          >
            {badge.name}
          </ThemedText>

          {/* Badge Description */}
          <ThemedText
            type="body"
            className="text-huntly-charcoal text-center"
            style={{ marginBottom: scaleW(16), lineHeight: scaleW(24) }}
          >
            {badge.description}
          </ThemedText>

          {/* Action Buttons */}
          <View className="space-y-3">
            <Pressable
              onPress={onViewAllBadges}
              className="bg-huntly-leaf rounded-2xl items-center shadow-soft"
              style={{ paddingVertical: scaleW(12) }}
            >
              <ThemedText type="defaultSemiBold" className="text-white">
                View All Badges
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={onClose}
              className="bg-gray-100 rounded-2xl items-center"
              style={{ paddingVertical: scaleW(12) }}
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
