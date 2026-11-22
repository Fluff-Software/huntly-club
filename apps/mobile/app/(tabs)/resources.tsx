import React, { useCallback, useMemo } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { FKButton, FKCard, FKEyebrow, FKPageHeader, FKSkeleton } from "@/components/fieldkit";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import { useParentResources, type ParentResource } from "@/hooks/useParentResources";

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.navigate("/(tabs)/me");
};

/** Printable guides and downloads for grown-ups. */
export default function ResourcesScreen() {
  const { resources, loading, error, refetch } = useParentResources();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
    }, [])
  );

  // Keep the server's order, grouped by category where there is one.
  const groups = useMemo(() => {
    const out: { category: string | null; items: ParentResource[] }[] = [];
    resources.forEach((r) => {
      const category = r.category?.trim() || null;
      const existing = out.find((g) => g.category === category);
      if (existing) existing.items.push(r);
      else out.push({ category, items: [r] });
    });
    return out;
  }, [resources]);
  const showCategories = groups.length > 1 || groups[0]?.category != null;

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FKPageHeader eyebrow="For grown-ups" title="Guides and downloads" onBack={goBack} />
        <Text style={[TYPE.body, { color: FK.muted, marginTop: -8, marginBottom: 8 }]}>
          Printable sheets and short guides to help you plan time outside. They open in your browser.
        </Text>

        {loading ? (
          <View style={{ gap: 10, marginTop: 12 }}>
            <FKSkeleton height={88} />
            <FKSkeleton height={88} />
            <FKSkeleton height={88} />
          </View>
        ) : error ? (
          <FKCard style={{ marginTop: 12 }}>
            <Text style={TYPE.heading}>We couldn&apos;t load these</Text>
            <Text style={[TYPE.body, { marginTop: 6, marginBottom: 14 }]}>
              Check your connection and try again.
            </Text>
            <FKButton label="Try again" variant="ink" icon="refresh" onPress={() => void refetch()} />
          </FKCard>
        ) : resources.length === 0 ? (
          <FKCard style={{ marginTop: 12 }}>
            <Text style={TYPE.heading}>Nothing here yet</Text>
            <Text style={[TYPE.body, { marginTop: 6 }]}>New guides will appear here when we add them.</Text>
          </FKCard>
        ) : (
          groups.map((group, gIndex) => (
            <View key={group.category ?? `none-${gIndex}`}>
              {showCategories ? (
                <FKEyebrow style={styles.section}>{group.category ?? "Other"}</FKEyebrow>
              ) : (
                <View style={{ height: 12 }} />
              )}
              {group.items.map((resource) => (
                <Pressable
                  key={resource.id}
                  style={styles.row}
                  disabled={!resource.file_url}
                  onPress={() => {
                    if (resource.file_url) void Linking.openURL(resource.file_url);
                  }}
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${resource.title}`}
                >
                  <View style={styles.rowIcon}>
                    <Ionicons name="document-text-outline" size={22} color={FK.skyInk} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{resource.title}</Text>
                    {resource.description ? <Text style={styles.rowSub}>{resource.description}</Text> : null}
                  </View>
                  <Ionicons name="open-outline" size={20} color={FK.muted} />
                </Pressable>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FK.moss },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, width: "100%", maxWidth: 720, alignSelf: "center" },
  section: { marginTop: 20, marginBottom: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: FK.paper,
    borderRadius: RADIUS.md,
    padding: 14,
    paddingRight: 16,
    marginBottom: 8,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: FK.sky,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontFamily: FONT.display, fontSize: 17, color: FK.ink },
  rowSub: { fontFamily: FONT.body, fontSize: 15, lineHeight: 21, color: FK.muted, marginTop: 2 },
});
