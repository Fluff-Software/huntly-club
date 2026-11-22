/**
 * Binder sort and filter sheet: card type, found or not, and order.
 * Choosing whose binder to look at lives on the binder screen itself.
 */
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FKButton, FKEyebrow } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import {
  BINDER_FILTERS,
  BINDER_SORT_OPTIONS,
  BINDER_STATUS_FILTERS,
  type BinderCategoryFilter,
  type BinderSortOption,
  type BinderStatusFilter,
} from "@/utils/exploreBinder";

/** Friendlier labels for the found / not found filter. */
export const BINDER_STATUS_LABELS: Record<BinderStatusFilter, string> = {
  all: "All cards",
  collected: "Found",
  missing: "Still to find",
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onReset: () => void;
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
      style={[styles.chip, selected ? styles.chipActive : null]}
    >
      <Text style={[styles.chipText, selected ? styles.chipTextActive : null]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <FKEyebrow style={styles.sectionTitle}>{title}</FKEyebrow>
      <View style={styles.chipRow}>{children}</View>
    </View>
  );
}

export function BinderFiltersModal({
  visible,
  onClose,
  onReset,
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
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 10) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={TYPE.heading} accessibilityRole="header">
              Sort and filter
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color={FK.ink} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
            bounces={false}
          >
            <Section title="Show">
              {BINDER_STATUS_FILTERS.map((f) => (
                <OptionChip
                  key={f.id}
                  label={BINDER_STATUS_LABELS[f.id] ?? f.label}
                  selected={status === f.id}
                  onPress={() => onSelectStatus(f.id)}
                />
              ))}
            </Section>

            <Section title="Type of card">
              {BINDER_FILTERS.map((f) => (
                <OptionChip
                  key={f.id}
                  label={f.label}
                  selected={category === f.id}
                  onPress={() => onSelectCategory(f.id)}
                />
              ))}
            </Section>

            <Section title="Order">
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

          <View style={styles.footer}>
            <FKButton label="Done" variant="ink" icon="checkmark" onPress={onClose} />
            <FKButton label="Reset" variant="link" onPress={onReset} />
          </View>
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
    backgroundColor: "rgba(16,37,27,0.5)",
  },
  sheet: {
    backgroundColor: FK.moss,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingTop: 10,
    maxHeight: "88%",
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: FK.line,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingBottom: 10,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FK.paper,
  },
  body: {
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  section: { marginTop: 14 },
  sectionTitle: { marginBottom: 10 },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 46,
    justifyContent: "center",
    backgroundColor: FK.paper,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: FK.line,
    paddingHorizontal: 16,
  },
  chipActive: { backgroundColor: FK.ink, borderColor: FK.ink },
  chipText: { fontFamily: FONT.displayBold, fontSize: 16, color: FK.ink },
  chipTextActive: { color: FK.white },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 14,
  },
});
