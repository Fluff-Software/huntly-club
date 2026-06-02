import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { ThemedText } from "@/components/ThemedText";
import { Badge, getBadgeDisplay } from "@/services/badgeService";
import { getBadgeImageUri } from "@/utils/badgeImageCache";

type BadgeImageProps = {
  badge: Pick<Badge, "image_url">;
  size: number;
  emojiFontSize?: number;
  style?: StyleProp<ViewStyle>;
  /** When true, skip cross-fade so cached images appear instantly (e.g. modals). */
  instant?: boolean;
};

export function BadgeImage({
  badge,
  size,
  emojiFontSize,
  style,
  instant = false,
}: BadgeImageProps) {
  const display = getBadgeDisplay(badge as Badge);
  const uri = getBadgeImageUri(badge);

  if (display.type === "image" && uri) {
    return (
      <ExpoImage
        source={{ uri }}
        cachePolicy="memory-disk"
        recyclingKey={uri}
        contentFit="contain"
        transition={instant ? 0 : 150}
        style={[{ width: size, height: size }, style]}
      />
    );
  }

  const fontSize = emojiFontSize ?? size * 0.82;
  return (
    <ThemedText
      style={{
        fontSize,
        lineHeight: fontSize + 4,
        textAlign: "center",
      }}
    >
      {display.content}
    </ThemedText>
  );
}
