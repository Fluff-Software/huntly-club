import { Asset } from "expo-asset";
import { Image as ExpoImage } from "expo-image";
import type { ClubPhotoCardItem } from "@/services/activityProgressService";
import type { TeamCardConfig } from "@/utils/teamUtils";

/** Warm expo-image cache for club carousel photos before the home tiles reveal. */
export async function prefetchClubPhotoImages(
  cards: ClubPhotoCardItem[]
): Promise<void> {
  const uris = [
    ...new Set(
      cards
        .map((card) => card.thumb_url || card.photo_url)
        .filter((uri): uri is string => typeof uri === "string" && uri.length > 0)
    ),
  ];
  if (uris.length === 0) return;
  await ExpoImage.prefetch(uris, "memory-disk");
}

/** Decode bundled team card artwork before showing the activity home tiles. */
export async function prefetchTeamCardAssets(config: TeamCardConfig): Promise<void> {
  await Asset.loadAsync([
    config.bgImage,
    config.badgeImage,
    config.standingImage,
  ]);
}
