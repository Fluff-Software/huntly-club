import React, { useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useParentResources } from "@/hooks/useParentResources";
import { ChildScreenLayout } from "@/components/ChildScreenLayout";

const RESOURCES_GREEN = "#3A5248";
const CREAM = "#F4F0EB";
const CHARCOAL = "#333333";

export default function ResourcesScreen() {
  const { scaleW } = useLayoutScale();
  const { resources, loading, error } = useParentResources();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: RESOURCES_GREEN,
        },
        scrollContent: {
          flexGrow: 1,
        },
        heading: {
          fontSize: scaleW(24),
          fontWeight: "700",
          color: "#FFF",
          textAlign: "center",
          marginBottom: scaleW(4),
        },
        subtitle: {
          fontSize: scaleW(14),
          color: "rgba(255,255,255,0.85)",
          textAlign: "center",
          marginBottom: scaleW(24),
        },
        loadingContainer: {
          paddingVertical: scaleW(48),
          alignItems: "center",
        },
        loadingText: {
          marginTop: scaleW(12),
          fontSize: scaleW(16),
          color: "#FFF",
        },
        emptyText: {
          fontSize: scaleW(16),
          color: "rgba(255,255,255,0.9)",
          textAlign: "center",
        },
        errorText: {
          fontSize: scaleW(16),
          color: "#FFF",
          textAlign: "center",
        },
        resourceCard: {
          backgroundColor: CREAM,
          borderRadius: scaleW(16),
          padding: scaleW(16),
          marginBottom: scaleW(12),
        },
        resourceTitle: {
          fontSize: scaleW(16),
          fontWeight: "700",
          color: CHARCOAL,
          marginBottom: scaleW(6),
        },
        resourceDesc: {
          fontSize: scaleW(14),
          color: CHARCOAL,
          marginBottom: scaleW(12),
          lineHeight: scaleW(20),
        },
        resourceButton: {
          flexDirection: "row",
          alignSelf: "flex-end",
          alignItems: "center",
          backgroundColor: RESOURCES_GREEN,
          paddingVertical: scaleW(10),
          paddingHorizontal: scaleW(16),
          borderRadius: scaleW(24),
          gap: scaleW(6),
        },
        resourceButtonText: {
          fontSize: scaleW(14),
          fontWeight: "600",
          color: "#FFF",
        },
      }),
    [scaleW]
  );

  return (
    <ChildScreenLayout
      backgroundColor={RESOURCES_GREEN}
      contentContainerStyle={styles.scrollContent}
    >
        <ThemedText type="heading" style={styles.heading}>
          Resources
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Guides, tips and downloads for your adventures
        </ThemedText>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFF" />
            <ThemedText style={styles.loadingText}>Loading resources…</ThemedText>
          </View>
        ) : error ? (
          <ThemedText style={styles.errorText}>Something went wrong loading resources.</ThemedText>
        ) : resources.length === 0 ? (
          <ThemedText style={styles.emptyText}>No resources yet.</ThemedText>
        ) : (
          resources.map((resource, index) => (
            <Animated.View
              key={resource.id}
              entering={FadeInDown.duration(400).delay(index * 60)}
            >
              <View style={styles.resourceCard}>
                <ThemedText type="heading" style={styles.resourceTitle}>
                  {resource.title}
                </ThemedText>
                {resource.description ? (
                  <ThemedText style={styles.resourceDesc}>{resource.description}</ThemedText>
                ) : null}
                <Pressable
                  style={styles.resourceButton}
                  onPress={() => {
                    if (resource.file_url) {
                      void Linking.openURL(resource.file_url);
                    }
                  }}
                >
                  <ThemedText type="heading" style={styles.resourceButtonText}>
                    Download
                  </ThemedText>
                  <MaterialIcons name="file-download" size={scaleW(18)} color="#FFF" />
                </Pressable>
              </View>
            </Animated.View>
          ))
        )}
    </ChildScreenLayout>
  );
}
