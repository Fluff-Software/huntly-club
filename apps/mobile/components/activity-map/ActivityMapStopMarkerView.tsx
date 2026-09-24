/**
 * Explore / activity map stop bubble with lock / check glyphs.
 * SVG only (no MaterialIcons) so iOS MapKit markers avoid the
 * LegacyViewManagerInterop deadlock path.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
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

function CheckGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        d="M5 13.5 9.5 18 19 7"
        stroke="#FFF"
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
  wrap: {
    alignItems: "center",
    justifyContent: "center",
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
});
