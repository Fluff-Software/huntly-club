/**
 * Explore trading-card face — Yu-Gi-Oh-style layout on the textured card bg:
 * outer frame → name + attribute → rarity → art window → type/description box.
 */
import React, { useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { EXPLORE_RARITY_COLORS } from "@/constants/exploreBinder";
import {
  formatRarityLabel,
  readableHabitatAffinities,
} from "@/utils/exploreBinder";

const CARD_BG = require("@/assets/images/explore-card-bg.png");

const INK = "#1A2A1C";
const FRAME_EDGE = "#1A2E20";
const BEVEL_LIGHT = "#D2E2C8";
const BEVEL_MID = "#7E9678";
const BEVEL_DARK = "#33483A";
/** Translucent mint so the textured green bg stays visible. */
const PANEL_FILL = "rgba(228, 242, 215, 0.72)";
const PANEL_BORDER = "rgba(50, 90, 55, 0.4)";
const PANEL_FILL_LOCKED = "rgba(18, 28, 22, 0.78)";
const PANEL_BORDER_LOCKED = "rgba(255,255,255,0.16)";

type Props = {
  imageUrl: string | null;
  name: string;
  rarity: string;
  description?: string;
  category?: string;
  habitatWeights?: Record<string, number>;
  count?: number;
  firstCollectedAt?: string | null;
  lastCollectedAt?: string | null;
  /** When true, never show a lock — card is owned / unlocked. */
  collected: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

function categoryTypeLabel(category: string | undefined): string {
  switch (category) {
    case "animal":
      return "Animal";
    case "habitat":
      return "Habitat";
    case "flora_wildlife":
      return "Flora";
    default:
      return "Explore";
  }
}

function formatFoundDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

export function ExploreCardArt({
  imageUrl,
  name,
  rarity,
  description = "",
  category,
  habitatWeights,
  count = 0,
  firstCollectedAt = null,
  lastCollectedAt: _lastCollectedAt = null,
  collected,
  compact = false,
  style,
}: Props) {
  const [failed, setFailed] = useState(false);
  const showCatalogueImage = Boolean(imageUrl?.startsWith("http")) && !failed;
  const rarityColor = EXPLORE_RARITY_COLORS[rarity] ?? "#3B82F6";
  const typeLabel = categoryTypeLabel(category);
  const displayName = collected ? name.toUpperCase() : "?????";
  const rarityLabel = collected ? formatRarityLabel(rarity).toUpperCase() : "UNKNOWN";
  const bodyText = collected
    ? description.trim() || "A discovery from your Explore adventures."
    : "Not discovered yet. Keep exploring to find this card.";
  const habitats = collected
    ? readableHabitatAffinities(habitatWeights ?? {})
        .filter((h) => h.key !== "general")
        .slice(0, compact ? 2 : 4)
    : [];
  const firstFound = formatFoundDate(firstCollectedAt);
  const copiesLabel =
    collected && count > 0 ? (count === 1 ? "1 copy" : `${count} copies`) : null;

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  return (
    <View style={[styles.frame, style]}>
      {/* stretch so the full textured bg fills the card (no corner crop) */}
      <Image
        source={CARD_BG}
        style={[styles.bg, !collected && styles.bgLocked]}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />
      {/* Soft lift so the green texture reads through the chrome */}
      {collected ? <View style={styles.bgLift} pointerEvents="none" /> : null}
      {!collected ? <View style={styles.lockedScrim} pointerEvents="none" /> : null}

      <View style={styles.outerStroke} pointerEvents="none" />

      <View
        style={[
          styles.innerPad,
          compact ? styles.innerPadCompact : styles.innerPadFull,
        ]}
        pointerEvents="none"
      >
        <View
          style={[
            styles.nameBar,
            compact && styles.nameBarCompact,
            !collected && styles.nameBarLocked,
          ]}
        >
          <ThemedText
            type="heading"
            lightColor={collected ? INK : "rgba(235,240,230,0.9)"}
            darkColor={collected ? INK : "rgba(235,240,230,0.9)"}
            numberOfLines={1}
            style={[styles.name, compact && styles.nameCompact]}
          >
            {displayName}
          </ThemedText>
        </View>

        <View style={[styles.rarityRow, compact && styles.rarityRowCompact]}>
          <View
            style={[
              styles.rarityPill,
              compact && styles.rarityPillCompact,
              {
                backgroundColor: collected ? rarityColor : "rgba(80,95,88,0.85)",
              },
            ]}
          >
            <ThemedText
              lightColor="#FFF"
              darkColor="#FFF"
              numberOfLines={1}
              style={[styles.rarityText, compact && styles.rarityTextCompact]}
            >
              {rarityLabel}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.artBevelOuter, compact && styles.artBevelOuterCompact]}>
          <View style={styles.artBevelMid}>
            <View style={[styles.artWindow, !collected && styles.artWindowLocked]}>
              {collected && showCatalogueImage ? (
                <Image
                  source={{ uri: imageUrl! }}
                  style={styles.artImage}
                  resizeMode="cover"
                  onError={() => setFailed(true)}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View style={[styles.placeholder, !collected && styles.placeholderLocked]}>
                  <MaterialIcons
                    name={collected ? "image" : "lock"}
                    size={compact ? 28 : 42}
                    color={collected ? "rgba(30,50,32,0.4)" : "rgba(255,255,255,0.75)"}
                  />
                  {collected && !compact ? (
                    <ThemedText
                      lightColor="rgba(30,50,32,0.5)"
                      darkColor="rgba(30,50,32,0.5)"
                      style={styles.placeholderLabel}
                    >
                      Artwork coming soon
                    </ThemedText>
                  ) : null}
                </View>
              )}
            </View>
          </View>
        </View>

        <View
          style={[
            styles.descBox,
            compact && styles.descBoxCompact,
            !collected && styles.descBoxLocked,
          ]}
        >
          <ThemedText
            lightColor={collected ? INK : "rgba(220,230,220,0.85)"}
            darkColor={collected ? INK : "rgba(220,230,220,0.85)"}
            numberOfLines={1}
            style={[styles.typeLine, compact && styles.typeLineCompact]}
          >
            {typeLabel}
          </ThemedText>
          <ThemedText
            lightColor={collected ? "#243028" : "rgba(210,220,210,0.75)"}
            darkColor={collected ? "#243028" : "rgba(210,220,210,0.75)"}
            numberOfLines={compact ? 2 : 4}
            style={[styles.description, compact && styles.descriptionCompact]}
          >
            {bodyText}
          </ThemedText>

          {collected && habitats.length > 0 ? (
            <View style={styles.metaBlock}>
              <ThemedText
                lightColor={INK}
                darkColor={INK}
                style={[styles.metaHeading, compact && styles.metaHeadingCompact]}
              >
                Habitats
              </ThemedText>
              <ThemedText
                lightColor="#243028"
                darkColor="#243028"
                numberOfLines={compact ? 1 : 2}
                style={[styles.metaBody, compact && styles.metaBodyCompact]}
              >
                {habitats.map((h) => h.label).join(" · ")}
              </ThemedText>
            </View>
          ) : null}

          {!compact && collected ? (
            <>
              <View style={styles.descRule} />
              <View style={styles.footerStats}>
                {copiesLabel ? (
                  <ThemedText lightColor={INK} darkColor={INK} style={styles.footerLeft}>
                    {copiesLabel.toUpperCase()}
                  </ThemedText>
                ) : (
                  <View />
                )}
                {firstFound ? (
                  <ThemedText lightColor={INK} darkColor={INK} style={styles.footerRight}>
                    FOUND {firstFound}
                  </ThemedText>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#3D6B42",
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  bgLocked: {
    opacity: 0.4,
  },
  bgLift: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 250, 210, 0.14)",
  },
  lockedScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 10, 8, 0.62)",
  },
  outerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: FRAME_EDGE,
    borderRadius: 14,
  },
  innerPad: {
    flex: 1,
  },
  innerPadCompact: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 5,
  },
  innerPadFull: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 6,
  },
  nameBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PANEL_FILL,
    borderWidth: 1.5,
    borderColor: PANEL_BORDER,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
    minHeight: 40,
  },
  nameBarCompact: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    minHeight: 26,
  },
  nameBarLocked: {
    backgroundColor: PANEL_FILL_LOCKED,
    borderColor: PANEL_BORDER_LOCKED,
  },
  name: {
    flex: 1,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "900",
    letterSpacing: 0.35,
  },
  nameCompact: {
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.2,
    fontWeight: "900",
  },
  rarityRow: {
    alignItems: "flex-end",
    paddingRight: 2,
  },
  rarityRowCompact: {
    paddingRight: 1,
  },
  rarityPill: {
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  rarityPillCompact: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  rarityText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  rarityTextCompact: {
    fontSize: 9,
    letterSpacing: 0.6,
    fontWeight: "900",
  },
  artBevelOuter: {
    width: "78%",
    aspectRatio: 1,
    alignSelf: "center",
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: BEVEL_LIGHT,
    borderWidth: 1,
    borderColor: BEVEL_DARK,
    borderRadius: 12,
    padding: 3,
  },
  artBevelOuterCompact: {
    width: "76%",
    borderRadius: 9,
    padding: 2,
  },
  artBevelMid: {
    flex: 1,
    backgroundColor: BEVEL_MID,
    borderRadius: 9,
    borderWidth: 1,
    borderTopColor: BEVEL_LIGHT,
    borderLeftColor: BEVEL_LIGHT,
    borderRightColor: BEVEL_DARK,
    borderBottomColor: BEVEL_DARK,
    padding: 2,
    overflow: "hidden",
  },
  artWindow: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#1A2420",
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#0A0E0C",
  },
  artWindowLocked: {
    backgroundColor: "#0A100E",
  },
  artImage: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(180, 210, 150, 0.28)",
  },
  placeholderLocked: {
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  placeholderLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  descBox: {
    flexGrow: 1,
    flexShrink: 1,
    backgroundColor: PANEL_FILL,
    borderWidth: 1.5,
    borderColor: PANEL_BORDER,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingTop: 9,
    paddingBottom: 12,
    gap: 5,
    minHeight: 78,
  },
  descBoxCompact: {
    borderRadius: 9,
    minHeight: 46,
    paddingHorizontal: 7,
    paddingTop: 5,
    paddingBottom: 7,
    gap: 2,
  },
  descBoxLocked: {
    backgroundColor: PANEL_FILL_LOCKED,
    borderColor: PANEL_BORDER_LOCKED,
  },
  typeLine: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.35,
  },
  typeLineCompact: {
    fontSize: 10,
    fontWeight: "900",
  },
  description: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  descriptionCompact: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
  },
  metaBlock: {
    marginTop: 4,
    gap: 2,
  },
  metaHeading: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.35,
  },
  metaHeadingCompact: {
    fontSize: 9,
    fontWeight: "900",
  },
  metaBody: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
  },
  metaBodyCompact: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "700",
  },
  descRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PANEL_BORDER,
    marginTop: 6,
    opacity: 0.8,
  },
  footerStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  footerLeft: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  footerRight: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
});
