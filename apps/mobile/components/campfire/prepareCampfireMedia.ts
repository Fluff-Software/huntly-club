import { Image as ExpoImage } from "expo-image";
import {
  collectMediaUrls,
  type CampfireSessionBundle,
} from "@/services/campfireService";

/**
 * Buffers remote images for a campfire session before playback.
 *
 * Video is warmed by `campfireVideoPreload` / `campfireLivePreload` (expo-video
 * players buffer off-screen; see SDK preloading docs). Audio is loaded by
 * `useCampfireAudio` when playback starts (`downloadFirst` per clip).
 */
export async function prepareCampfireMedia(
  bundle: CampfireSessionBundle
): Promise<void> {
  const { images } = collectMediaUrls(bundle);
  if (images.length === 0) return;
  await ExpoImage.prefetch(images, "memory-disk");
}
