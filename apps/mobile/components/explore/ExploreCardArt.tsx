/**
 * Trading-card face. Full-bleed Explore card art; optional catalogue overlay.
 */
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const CARD_BG = require("@/assets/images/explore-card-bg.png");

type Props = {
  imageUrl: string | null;
  name: string;
  rarity: string;
  /** When true, never show a lock — card is owned / unlocked. */
  collected: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ExploreCardArt({
  imageUrl,
  collected,
  compact = false,
  style,
}: Props) {
  const [failed, setFailed] = useState(false);
  const showCatalogueImage = Boolean(imageUrl?.startsWith("http")) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  return (
    <View style={[styles.frame, style]}>
      <Image
        source={CARD_BG}
        style={[styles.art, !collected && styles.artLocked]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      {showCatalogueImage ? (
        <Image
          source={{ uri: imageUrl! }}
          style={[styles.art, !collected && styles.artLocked]}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : null}

      {!collected ? (
        <View style={styles.missingOverlay} pointerEvents="none">
          <MaterialIcons name="lock-outline" size={compact ? 22 : 28} color="#FFF" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1A241E",
  },
  art: {
    ...StyleSheet.absoluteFillObject,
  },
  artLocked: {
    opacity: 0.45,
  },
  missingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
});
