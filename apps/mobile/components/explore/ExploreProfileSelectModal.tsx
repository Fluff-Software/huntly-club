import React from "react";
import { Modal, View, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { FK, FONT, RADIUS } from "@/constants/fieldKit";

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
            <ThemedText style={styles.title}>Who's collecting?</ThemedText>
            <Pressable
              onPress={onDismiss}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={FK.ink} />
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
                  accessibilityLabel={`Collect cards as ${p.name}`}
                  style={[styles.row, active && styles.rowActive]}
                >
                  <ThemedText
                    style={[styles.rowText, active && styles.rowTextActive]}
                    numberOfLines={1}
                  >
                    {p.name}
                  </ThemedText>
                  {active ? <Ionicons name="checkmark" size={20} color={FK.sunbeam} /> : null}
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => {
                onSelectAll();
                onDismiss();
              }}
              accessibilityRole="button"
              accessibilityLabel="Collect cards for everyone"
              style={[styles.row, claimedMode === "all" && styles.rowActive]}
            >
              <ThemedText
                style={[styles.rowText, claimedMode === "all" && styles.rowTextActive]}
              >
                Everyone
              </ThemedText>
              {claimedMode === "all" ? <Ionicons name="checkmark" size={20} color={FK.sunbeam} /> : null}
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
    backgroundColor: "rgba(16,37,27,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  card: {
    backgroundColor: FK.moss,
    borderRadius: RADIUS.lg,
    padding: 22,
    width: "100%",
    maxWidth: 380,
    maxHeight: "70%",
    shadowColor: "#10251B",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontFamily: FONT.display,
    fontSize: 22,
    lineHeight: 26,
    color: FK.ink,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FK.paper,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
    marginBottom: 10,
    backgroundColor: FK.paper,
  },
  rowActive: {
    backgroundColor: FK.forest,
  },
  rowText: {
    fontFamily: FONT.displayBold,
    fontSize: 17,
    color: FK.ink,
  },
  rowTextActive: {
    color: FK.white,
  },
});
