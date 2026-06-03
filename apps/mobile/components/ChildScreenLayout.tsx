import React, { useRef, type RefObject } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  type Edge,
} from "react-native-safe-area-context";
import { type Href } from "expo-router";
import { BackHeader } from "@/components/BackHeader";
import { useLayoutScale } from "@/hooks/useLayoutScale";

/** Shared horizontal inset for child screens (back button + body). */
export const CHILD_SCREEN_PADDING_W = 24;

type ChildScreenLayoutProps = {
  children: React.ReactNode;
  variant?: "light" | "dark";
  backgroundColor?: string;
  onBack?: () => void;
  fallbackRoute?: Href;
  edges?: Edge[];
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollRef?: RefObject<ScrollView | null>;
};

/**
 * Standard layout for stack-like tab screens: fixed back bar + scrollable body.
 * Keeps the back control in the same position on every depth (profile → parent zone, etc.).
 */
export function ChildScreenLayout({
  children,
  variant = "dark",
  backgroundColor = "#4F6F52",
  onBack,
  fallbackRoute,
  edges = ["top", "left", "right"],
  scrollable = true,
  contentContainerStyle,
  scrollRef: scrollRefProp,
}: ChildScreenLayoutProps) {
  const { scaleW } = useLayoutScale();
  const paddingH = scaleW(CHILD_SCREEN_PADDING_W);
  const internalScrollRef = useRef<ScrollView>(null);
  const scrollRef = scrollRefProp ?? internalScrollRef;

  const body = scrollable ? (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingHorizontal: paddingH, paddingBottom: scaleW(32) },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.scroll,
        styles.scrollContent,
        { paddingHorizontal: paddingH, paddingBottom: scaleW(32) },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={edges}>
      <View
        style={[
          styles.backBar,
          { paddingHorizontal: paddingH, paddingTop: scaleW(8) },
        ]}
      >
        <BackHeader
          variant={variant}
          onBack={onBack}
          fallbackRoute={fallbackRoute}
        />
      </View>
      {body}
    </SafeAreaView>
  );
}

/** Fixed back bar matching ChildScreenLayout (for full-bleed screens like story slides). */
export function ScreenBackBar({
  variant = "dark",
  onBack,
  fallbackRoute,
}: Pick<ChildScreenLayoutProps, "variant" | "onBack" | "fallbackRoute">) {
  const { scaleW } = useLayoutScale();
  const paddingH = scaleW(CHILD_SCREEN_PADDING_W);

  return (
    <View
      style={{
        paddingHorizontal: paddingH,
        paddingTop: scaleW(8),
        alignSelf: "stretch",
        zIndex: 2,
      }}
    >
      <BackHeader variant={variant} onBack={onBack} fallbackRoute={fallbackRoute} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  backBar: {
    paddingBottom: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
