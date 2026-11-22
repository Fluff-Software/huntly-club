/**
 * Explore / activity map stop bubble.
 * SVG only (no MaterialIcons) so iOS MapKit markers avoid the
 * LegacyViewManagerInterop deadlock path.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { FK } from "@/constants/fieldKit";
import type { ActivityMapMarkerIcon } from "./types";

const LOCK_KEYHOLE = "#2A3A32";

type Props = {
  color: string;
  icon?: ActivityMapMarkerIcon;
};

function LockGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        d="M7 10V8a5 5 0 0 1 10 0v2"
        stroke="#FFF"
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      />
      <Rect x={5} y={10} width={14} height={11} rx={2.5} fill="#FFF" />
      <Path
        d="M12 14v3"
        stroke={LOCK_KEYHOLE}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** A little collectible card with a star: "there's a card waiting here". */
function CardGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Rect
        x={5}
        y={2.5}
        width={14}
        height={19}
        rx={3}
        fill={FK.sunbeam}
        transform="rotate(-8 12 12)"
      />
      <Path
        d="M12 7.6l1.3 2.7 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z"
        fill={FK.forest}
        transform="rotate(-8 12 12)"
      />
    </Svg>
  );
}

function CheckGlyph({ color = "#FFF" }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        d="M5 13.5 9.5 18 19 7"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function DotGlyph() {
  return (
    <Svg width={10} height={10} viewBox="0 0 10 10" accessibilityElementsHidden>
      <Rect x={2} y={2} width={6} height={6} rx={3} fill="#FFF" />
    </Svg>
  );
}

export function ActivityMapStopMarkerView({ color, icon }: Props) {
  if (icon === "card") {
    return (
      <View style={styles.wrap} collapsable={false}>
        <View style={[styles.bubble, styles.cardBubble]} collapsable={false}>
          <CardGlyph />
        </View>
      </View>
    );
  }

  if (icon === "collected") {
    return (
      <View style={styles.wrap} collapsable={false}>
        <View style={[styles.bubble, styles.collectedBubble]} collapsable={false}>
          <CheckGlyph color={FK.forest} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap} collapsable={false}>
      <View style={[styles.bubble, { backgroundColor: color }]} collapsable={false}>
        {icon === "lock" ? (
          <LockGlyph />
        ) : icon === "check" ? (
          <CheckGlyph />
        ) : (
          <DotGlyph />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Padding leaves room for the shadow, which MapKit would otherwise clip.
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  bubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  cardBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    backgroundColor: FK.forest,
    borderColor: FK.sunbeam,
    shadowColor: "#10251B",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  collectedBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    backgroundColor: FK.paper,
    borderColor: "#C9D3C0",
    shadowColor: "#10251B",
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
