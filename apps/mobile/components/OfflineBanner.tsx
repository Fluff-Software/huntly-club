import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetwork } from "@/contexts/NetworkContext";

const CREAM = "#F4F0EB";
const OFFLINE_BG = "#8B4513";
const OFFLINE_TEXT = "#FFF";

/**
 * Banner shown at the top of the app when there is no internet connection.
 * Only renders after network state is ready to avoid flashing on startup.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { isConnected, isReady } = useNetwork();
  const opacity = React.useRef(new Animated.Value(0)).current;

  const show = isReady && !isConnected;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: show ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [show, opacity]);

  if (!isReady) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: Math.max(insets.top, 8), paddingBottom: 8 },
        { opacity },
      ]}
      pointerEvents={show ? "auto" : "none"}
    >
      <View style={styles.content}>
        <Text style={styles.text}>You're offline</Text>
        <Text style={styles.subtext}>
          When you're back online, your adventures will be here.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 9999,
    backgroundColor: OFFLINE_BG,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: "column",
    gap: 2,
  },
  text: {
    fontFamily: "ComicNeue_700Bold",
    fontSize: 15,
    color: OFFLINE_TEXT,
  },
  subtext: {
    fontFamily: "ComicNeue_400Regular",
    fontSize: 13,
    color: CREAM,
    opacity: 0.95,
  },
});
