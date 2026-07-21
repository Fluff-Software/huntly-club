import React from "react";
import { Pressable, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { ScavengerQuestItem } from "@/services/scavengerService";
import { SCAVENGER_GREEN } from "@/constants/scavengerTheme";
import { ScavengerImage } from "@/components/scavenger/ScavengerImage";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const PREVIEW_OVERLAP = 16;
const CARD_WIDTH = 112;

type Props = {
  items: ScavengerQuestItem[];
  onItemPress?: () => void;
};

/** Stacked preview of the first few findables (OG Huntly overview fan). */
export function ItemPreviewFan({ items, onItemPress }: Props) {
  const { scaleW } = useLayoutScale();
  const preview = items.slice(0, 3);
  if (preview.length === 0) return null;

  const cardW = scaleW(CARD_WIDTH);
  const overlap = scaleW(PREVIEW_OVERLAP);
  const rotations = preview.length === 2 ? [-6, 6] : [-8, 0, 8];
  const rowWidth = cardW + Math.max(0, preview.length - 1) * (cardW - overlap);

  const placeholder = (
    <View
      style={{
        height: scaleW(110),
        backgroundColor: "#D7E4D7",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialIcons name="image" size={scaleW(28)} color={SCAVENGER_GREEN} />
    </View>
  );

  return (
    <View style={{ marginTop: scaleW(8), width: "100%", alignItems: "center", paddingVertical: scaleW(12) }}>
      <View style={{ width: rowWidth, flexDirection: "row", alignItems: "flex-end" }}>
        {preview.map((item, index) => (
          <Pressable
            key={item.id}
            onPress={onItemPress}
            style={{
              marginLeft: index === 0 ? 0 : -overlap,
              transform: [{ rotate: `${rotations[index] ?? 0}deg` }],
              zIndex: index === 1 ? 2 : 1,
              width: cardW,
              borderRadius: scaleW(14),
              overflow: "hidden",
              backgroundColor: "#fff",
            }}
          >
            <ScavengerImage
              uri={item.image_url}
              style={{ width: "100%", height: scaleW(110) }}
              fallback={placeholder}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
