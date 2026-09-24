/**
 * One open binder page plate — charcoal sheet for the card grid.
 */
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { EXPLORE_BINDER_PAGE_BG } from "@/constants/exploreBinder";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function BinderPageSheet({ children, style }: Props) {
  return (
    <View style={[styles.outer, style]}>
      <View style={styles.plate} pointerEvents="none" />
      <View style={styles.textureA} pointerEvents="none" />
      <View style={styles.textureB} pointerEvents="none" />
      <View style={styles.page}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: "100%",
    overflow: "visible",
  },
  plate: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: EXPLORE_BINDER_PAGE_BG,
  },
  page: {
    flex: 1,
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 14,
  },
  textureA: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.015)",
  },
  textureB: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "40%",
    height: "35%",
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
});
