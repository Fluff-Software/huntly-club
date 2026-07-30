import React from "react";
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";

interface Props {
  visible: boolean;
  permissionStatus: "undetermined" | "denied";
  requesting: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

export function LocationPermissionModal({
  visible,
  permissionStatus,
  requesting,
  onEnable,
  onDismiss,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="location-on" size={36} color="#4F6F52" />
          </View>

          <ThemedText style={styles.title}>
            Enable location
          </ThemedText>

          <ThemedText style={styles.body}>
            Huntly uses your location to show nearby adventures and let you explore the outdoors.
          </ThemedText>

          <Pressable
            style={[styles.btn, styles.btnPrimary, requesting && styles.btnDisabled]}
            onPress={onEnable}
            disabled={requesting}
          >
            {requesting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <ThemedText style={styles.btnPrimaryText}>
                Enable location
              </ThemedText>
            )}
          </Pressable>

          <Pressable style={styles.btn} onPress={onDismiss}>
            <ThemedText style={styles.btnSecondaryText}>Not now</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EEF6EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  btn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: "center",
    marginBottom: 8,
  },
  btnPrimary: {
    backgroundColor: "#4F6F52",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  btnSecondaryText: {
    color: "#888",
    fontSize: 15,
    fontWeight: "500",
  },
});
