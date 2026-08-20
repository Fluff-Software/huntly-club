import React from "react";
import { Modal, View, Pressable, StyleSheet, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";

const ACCENT = "#B8F000";

type Profile = {
  id: number;
  name: string;
  nickname?: string | null;
};

type Props = {
  visible: boolean;
  profiles: Profile[];
  claimedMode: "single" | "all";
  selectedProfileId: number | null;
  onSelectProfile: (id: number) => void;
  onSelectAll: () => void;
  onDismiss: () => void;
};

export function ExploreProfileSelectModal({
  visible,
  profiles,
  claimedMode,
  selectedProfileId,
  onSelectProfile,
  onSelectAll,
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
          <View style={styles.header}>
            <ThemedText style={styles.title}>Choose your profile</ThemedText>
            <Pressable
              onPress={onDismiss}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeBtn}
            >
              <MaterialIcons name="close" size={20} color="#666" />
            </Pressable>
          </View>

          <ScrollView style={styles.list} bounces={false}>
            {profiles.map((p) => {
              const active = claimedMode === "single" && selectedProfileId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    onSelectProfile(p.id);
                    onDismiss();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Collect cards as ${p.nickname || p.name}`}
                  style={[styles.row, active && styles.rowActive]}
                >
                  <ThemedText
                    style={[styles.rowText, active && styles.rowTextActive]}
                    numberOfLines={1}
                  >
                    {p.nickname || p.name}
                  </ThemedText>
                  {active ? (
                    <MaterialIcons name="check" size={18} color="#222" />
                  ) : null}
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => {
                onSelectAll();
                onDismiss();
              }}
              accessibilityRole="button"
              accessibilityLabel="View all profiles"
              style={[styles.row, claimedMode === "all" && styles.rowActive]}
            >
              <ThemedText
                style={[styles.rowText, claimedMode === "all" && styles.rowTextActive]}
              >
                All
              </ThemedText>
              {claimedMode === "all" ? (
                <MaterialIcons name="check" size={18} color="#222" />
              ) : null}
            </Pressable>
          </ScrollView>
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
    padding: 20,
    width: "100%",
    maxWidth: 360,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F1F1",
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: "#F5F6F3",
  },
  rowActive: {
    backgroundColor: ACCENT,
  },
  rowText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  rowTextActive: {
    color: "#1A2A1C",
  },
});
