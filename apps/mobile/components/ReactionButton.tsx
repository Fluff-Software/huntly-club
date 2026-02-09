import React from "react";
import { TouchableOpacity, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { ReactionType } from "@/services/reactionService";

interface ReactionButtonProps {
  reactionType: ReactionType;
  count: number;
  hasReacted: boolean;
  onPress: () => void;
  disabled?: boolean;
}

const getReactionEmoji = (type: ReactionType): string => {
  switch (type) {
    case "high_five":
      return "🖐️";
    case "like":
      return "👍";
    case "celebrate":
      return "🎉";
    case "awesome":
      return "🤩";
    case "great_job":
      return "👏";
    default:
      return "👍";
  }
};

const getReactionLabel = (type: ReactionType): string => {
  switch (type) {
    case "high_five":
      return "High Five";
    case "like":
      return "Like";
    case "celebrate":
      return "Celebrate";
    case "awesome":
      return "Awesome";
    case "great_job":
      return "Great Job";
    default:
      return "Like";
  }
};

export const ReactionButton: React.FC<ReactionButtonProps> = ({
  reactionType,
  count,
  hasReacted,
  onPress,
  disabled = false,
}) => {
  const emoji = getReactionEmoji(reactionType);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`mr-3 mb-2 items-center ${
        disabled ? "opacity-50" : "active:opacity-70"
      }`}
    >
      <View
        className={`items-center ${
          hasReacted ? "bg-blue-50 rounded-lg px-2 py-1" : ""
        }`}
      >
        <ThemedText
          className={`text-2xl ${hasReacted ? "opacity-100" : "opacity-60"}`}
        >
          {emoji}
        </ThemedText>
        {count > 0 && (
          <ThemedText
            type="caption"
            className={`text-xs font-bold mt-1 ${
              hasReacted ? "text-blue-600" : "text-huntly-charcoal/70"
            }`}
          >
            {count}
          </ThemedText>
        )}
      </View>
    </TouchableOpacity>
  );
};
