import { View, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { useNetwork } from "@/contexts/NetworkContext";

/**
 * App-level banner shown when the device has no connection.
 * Content will refresh automatically when back online (handled by screens that use backOnlineTrigger).
 */
export function OfflineBanner() {
  const { isConnected } = useNetwork();
  const insets = useSafeAreaInsets();

  if (isConnected !== false) return null;

  return (
    <View
      style={[
        styles.banner,
        { paddingTop: Math.max(insets.top, 8) + 8, paddingBottom: 8 },
      ]}
    >
      <ThemedText style={styles.text}>
        No connection. Content will refresh when you're back online.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#D2684B",
    paddingHorizontal: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
      android: { elevation: 4 },
    }),
  },
  text: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
