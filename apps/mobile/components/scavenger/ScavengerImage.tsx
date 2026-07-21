import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image as ExpoImage, type ImageContentFit } from "expo-image";
import { SCAVENGER_GREEN } from "@/constants/scavengerTheme";

type Props = {
  uri: string | null | undefined;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  /** Spinner / placeholder color. */
  tint?: string;
  /** Optional fallback when uri is missing. */
  fallback?: React.ReactNode;
  /** Cross-fade after load (ms). */
  transitionMs?: number;
};

/**
 * Shows a spinner until the remote image has loaded, then fades it in.
 * Uses expo-image memory-disk cache (same stack as journal / home).
 */
export function ScavengerImage({
  uri,
  style,
  contentFit = "cover",
  tint = SCAVENGER_GREEN,
  fallback = null,
  transitionMs = 150,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [uri]);

  if (!uri || failed) {
    return fallback ? <View style={style}>{fallback}</View> : null;
  }

  return (
    <View style={[styles.wrap, style]}>
      {!loaded && (
        <View style={styles.spinner}>
          <ActivityIndicator color={tint} />
        </View>
      )}
      <ExpoImage
        source={{ uri }}
        cachePolicy="memory-disk"
        recyclingKey={uri}
        contentFit={contentFit}
        transition={loaded ? transitionMs : 0}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          setLoaded(true);
        }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

/** Warm expo-image cache before revealing a screen. */
export async function prefetchScavengerImages(
  uris: Array<string | null | undefined>
): Promise<void> {
  const unique = [
    ...new Set(
      uris.filter((uri): uri is string => typeof uri === "string" && uri.length > 0)
    ),
  ];
  if (unique.length === 0) return;
  await Promise.all(
    unique.map((uri) => ExpoImage.prefetch(uri, "memory-disk").catch(() => undefined))
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  spinner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
});
