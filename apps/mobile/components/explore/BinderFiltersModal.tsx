/**
 * Binder filter sheet — profile, category, status, and sort.
 */
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import {
  BINDER_FILTERS,
  BINDER_SORT_OPTIONS,
  BINDER_STATUS_FILTERS,
  type BinderCategoryFilter,
  type BinderSortOption,
  type BinderStatusFilter,
} from "@/utils/exploreBinder";

export type BinderFilterProfile = {
  id: number;
  name: string;
  nickname?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onReset: () => void;
  profiles: BinderFilterProfile[];
  showProfilePicker: boolean;
  /** `null` shows every player's cards merged together. */
  selectedProfileId: number | null;
  onSelectProfile: (id: number | null) => void;
  category: BinderCategoryFilter;
  onSelectCategory: (id: BinderCategoryFilter) => void;
  status: BinderStatusFilter;
  onSelectStatus: (id: BinderStatusFilter) => void;
  sort: BinderSortOption;
  onSelectSort: (id: BinderSortOption) => void;
};

function OptionChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipActive]}
    >
      <ThemedText
        lightColor="#FFF"
        darkColor="#FFF"
        style={[styles.chipText, selected && styles.chipTextActive]}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText lightColor="rgba(255,255,255,0.55)" darkColor="rgba(255,255,255,0.55)" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <View style={styles.chipRow}>{children}</View>
    </View>
  );
}

export function BinderFiltersModal({
  visible,
  onClose,
  onReset,
  profiles,
  showProfilePicker,
  selectedProfileId,
  onSelectProfile,
  category,
  onSelectCategory,
  status,
  onSelectStatus,
  sort,
  onSelectSort,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss filters" />
        <View style={[styles.sheet, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <ThemedText type="heading" lightColor="#FFF" darkColor="#FFF" style={styles.title}>
              Filters
            </ThemedText>
            <View style={styles.headerActions}>
              <Pressable
                onPress={onReset}
                accessibilityRole="button"
                accessibilityLabel="Reset filters"
                style={styles.textBtn}
              >
                <ThemedText lightColor="#8FCF7A" darkColor="#8FCF7A" style={styles.resetText}>
                  Reset
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close filters"
                style={styles.closeBtn}
              >
                <MaterialIcons name="close" size={22} color="#FFF" />
              </Pressable>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
            bounces={false}
          >
            {showProfilePicker ? (
              <Section title="Player">
                <OptionChip
                  label="All players"
                  selected={selectedProfileId === null}
                  onPress={() => onSelectProfile(null)}
                />
                {profiles.map((p) => (
                  <OptionChip
                    key={p.id}
                    label={p.nickname || p.name}
                    selected={selectedProfileId === p.id}
                    onPress={() => onSelectProfile(p.id)}
                  />
                ))}
              </Section>
            ) : null}

            <Section title="Category">
              {BINDER_FILTERS.map((f) => (
                <OptionChip
                  key={f.id}
                  label={f.label}
                  selected={category === f.id}
                  onPress={() => onSelectCategory(f.id)}
                />
              ))}
            </Section>

            <Section title="Status">
              {BINDER_STATUS_FILTERS.map((f) => (
                <OptionChip
                  key={f.id}
                  label={f.label}
                  selected={status === f.id}
                  onPress={() => onSelectStatus(f.id)}
                />
              ))}
            </Section>

            <Section title="Sort">
              {BINDER_SORT_OPTIONS.map((f) => (
                <OptionChip
                  key={f.id}
                  label={f.label}
                  selected={sort === f.id}
                  onPress={() => onSelectSort(f.id)}
                />
              ))}
            </Section>
          </ScrollView>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={styles.doneBtn}
          >
            <ThemedText lightColor="#FFF" darkColor="#FFF" style={styles.doneText}>
              Done
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: "#1A1A1D",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    maxHeight: "85%",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 20, lineHeight: 24 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  textBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  resetText: { fontSize: 15, fontWeight: "700" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 4,
  },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: "#62A94F" },
  chipText: { fontSize: 13, fontWeight: "600" },
  chipTextActive: { fontWeight: "700" },
  doneBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: "#62A94F",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneText: { fontSize: 16, fontWeight: "700" },
});
