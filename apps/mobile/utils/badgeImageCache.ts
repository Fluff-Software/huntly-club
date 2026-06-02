import { Image as ExpoImage } from "expo-image";
import { Badge, getBadgeDisplay } from "@/services/badgeService";

/** Remote badge artwork URL, or null when the badge uses an emoji. */
export function getBadgeImageUri(
  badge: Pick<Badge, "image_url">
): string | null {
  const display = getBadgeDisplay(badge as Badge);
  if (display.type === "image" && display.content.startsWith("http")) {
    return display.content;
  }
  return null;
}

/** Warm expo-image memory + disk cache for badge artwork. */
export async function prefetchBadgeImages(
  badges: Pick<Badge, "image_url">[]
): Promise<void> {
  const uris = [
    ...new Set(
      badges
        .map((badge) => getBadgeImageUri(badge))
        .filter((uri): uri is string => uri != null)
    ),
  ];
  if (uris.length === 0) return;
  await ExpoImage.prefetch(uris, "memory-disk");
}

export function prefetchBadgeImage(badge: Pick<Badge, "image_url">): void {
  const uri = getBadgeImageUri(badge);
  if (uri) {
    void ExpoImage.prefetch(uri, "memory-disk");
  }
}
