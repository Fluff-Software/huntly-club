import React from "react";
import { View, Modal, Pressable, Image } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ThemedText } from "./ThemedText";
import { Badge, getBadgeDisplay, UserBadge } from "@/services/badgeService";
import { useLayoutScale } from "@/hooks/useLayoutScale";

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
  const { scaleW, isTablet } = useLayoutScale();
  const spinY = useSharedValue(0);

  React.useEffect(() => {
    if (!visible || !badge) return;
    spinY.value = 0;
    spinY.value = withTiming(360, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, badge?.id, spinY]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${spinY.value}deg` }],
  }));

  const handleSpinBadge = React.useCallback(() => {
    const nextFullTurn = Math.ceil(spinY.value / 360) + 1;
    spinY.value = withTiming(nextFullTurn * 360, {
      duration: 850,
      easing: Easing.out(Easing.cubic),
    });
  }, [spinY]);

  if (!badge) return null;

  const badgeDisplay = getBadgeDisplay(badge);
  const hasMultipleBadges = allBadges.length > 1;
  const canGoNext = hasMultipleBadges && currentIndex < allBadges.length - 1;
  const canGoPrev = hasMultipleBadges && currentIndex > 0;

  const getImageSource = () => {
    if (badgeDisplay.type === "image" && badgeDisplay.content.startsWith("http")) {
      return { uri: badgeDisplay.content };
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
        return badge.requirement_value > 1
          ? `Complete all missions within ${badge.requirement_value} chapters`
          : "Complete all missions within a chapter";
      case "activities_completed":
        return `Complete ${badge.requirement_value} mission${
          badge.requirement_value > 1 ? "s" : ""
        }`;
      case "team_xp":
        return `Contribute ${badge.requirement_value} XP to your team`;
      case "team_contribution":
        return `Contribute ${badge.requirement_value} XP yourself to your team`;
      case "activities_by_category":
        return `Complete ${badge.requirement_value} missions in this category`;
      default:
        return "Complete the required challenge";
    }
  };
  const getDisplayDescription = () => {
    if (badge.requirement_type === "packs_completed") {
      return badge.requirement_value > 1
        ? `Complete all missions within ${badge.requirement_value} chapters.`
        : "Complete all missions within a chapter.";
    }
    return badge.description;
  };
  const shouldShowHowToEarn = badge.badge_type !== "manual";
  const cardPadding = scaleW(isTablet ? 18 : 14);
  const iconOuter = scaleW(isTablet ? 280 : 236);
  const iconInner = scaleW(isTablet ? 214 : 184);

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
          style={{
            padding: cardPadding,
            maxWidth: scaleW(isTablet ? 390 : 310),
          }}
        >
          {/* Header with Close Button */}
          <View
            className="flex-row items-center justify-end"
            style={{ marginBottom: scaleW(8) }}
          >
            <Pressable
              onPress={onClose}
              className="bg-gray-100 rounded-full items-center justify-center"
              style={{ width: scaleW(40), height: scaleW(40) }}
            >
              <ThemedText
                className="text-huntly-charcoal font-bold"
                style={{ fontSize: scaleW(22), lineHeight: scaleW(24) }}
              >
                ×
              </ThemedText>
            </Pressable>
          </View>

          {/* Navigation Arrows */}
          {hasMultipleBadges && (
            <View
              className="flex-row items-center justify-between"
              style={{ marginBottom: scaleW(16) }}
            >
              <Pressable
                onPress={onPrev}
                disabled={!canGoPrev}
                className={`rounded-full items-center justify-center ${
                  canGoPrev ? "bg-huntly-mint" : "bg-gray-200"
                }`}
                style={{ width: scaleW(40), height: scaleW(40) }}
              >
                <ThemedText
                  className={`font-bold ${
                    canGoPrev ? "text-huntly-forest" : "text-gray-400"
                  }`}
                  style={{ fontSize: scaleW(16) }}
                >
                  ←
                </ThemedText>
              </Pressable>

              <View
                className="bg-huntly-sage/20 rounded-full"
                style={{ paddingHorizontal: scaleW(10), paddingVertical: scaleW(4) }}
              >
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
                className={`rounded-full items-center justify-center ${
                  canGoNext ? "bg-huntly-mint" : "bg-gray-200"
                }`}
                style={{ width: scaleW(40), height: scaleW(40) }}
              >
                <ThemedText
                  className={`font-bold ${
                    canGoNext ? "text-huntly-forest" : "text-gray-400"
                  }`}
                  style={{ fontSize: scaleW(16) }}
                >
                  →
                </ThemedText>
              </Pressable>
            </View>
          )}

          {/* Large Badge Icon */}
          <View className="items-center" style={{ marginBottom: scaleW(4) }}>
            <Pressable onPress={handleSpinBadge}>
              <Animated.View
                className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full items-center justify-center shadow-soft"
                style={[
                  { width: iconOuter, height: iconOuter, marginBottom: scaleW(2) },
                  badgeAnimatedStyle,
                ]}
              >
                {badgeDisplay.type === "image" && imageSource ? (
                  <Image
                    source={imageSource}
                    style={{ width: iconInner, height: iconInner }}
                    resizeMode="contain"
                  />
                ) : (
                  <ThemedText style={{ fontSize: scaleW(58), lineHeight: scaleW(62) }}>
                    {badgeDisplay.content}
                  </ThemedText>
                )}
              </Animated.View>
            </Pressable>
          </View>

          {/* Badge Title */}
          <ThemedText
            type="title"
            className="text-huntly-forest text-center"
            style={{ marginBottom: scaleW(6) }}
          >
            {badge.name}
          </ThemedText>

          {/* Badge Description */}
          <ThemedText
            type="body"
            className="text-huntly-charcoal text-center"
            style={{ marginBottom: scaleW(8), lineHeight: scaleW(20), fontSize: scaleW(14) }}
          >
            {getDisplayDescription()}
          </ThemedText>

          {/* Requirement Info */}
          {shouldShowHowToEarn ? (
            <View
              className="bg-huntly-mint/20 rounded-2xl"
              style={{ paddingVertical: scaleW(9), paddingHorizontal: scaleW(12), marginBottom: scaleW(8) }}
            >
              <ThemedText
                type="defaultSemiBold"
                className="text-huntly-forest"
                style={{ marginBottom: scaleW(3), fontSize: scaleW(14) }}
              >
                How to Earn:
              </ThemedText>
              <ThemedText
                type="body"
                className="text-huntly-charcoal"
                style={{ fontSize: scaleW(14), lineHeight: scaleW(18) }}
              >
                {getRequirementText()}
              </ThemedText>
            </View>
          ) : null}

          {/* Earned Date */}
          {earnedAt && (
            <View
              className="bg-huntly-sage/20 rounded-2xl"
              style={{ paddingVertical: scaleW(9), paddingHorizontal: scaleW(12), marginBottom: scaleW(8) }}
            >
              <ThemedText
                type="defaultSemiBold"
                className="text-huntly-forest"
                style={{ marginBottom: scaleW(3), fontSize: scaleW(14) }}
              >
                Earned:
              </ThemedText>
              <ThemedText
                type="body"
                className="text-huntly-charcoal"
                style={{ fontSize: scaleW(14), lineHeight: scaleW(18) }}
              >
                {formatDate(earnedAt)}
              </ThemedText>
            </View>
          )}

          {/* Close Button */}
          <Pressable
            onPress={onClose}
            className="bg-huntly-leaf rounded-2xl items-center shadow-soft"
            style={{ paddingVertical: scaleW(10) }}
          >
            <ThemedText
              type="defaultSemiBold"
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{ color: "#FFFFFF" }}
            >
              Close
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};
