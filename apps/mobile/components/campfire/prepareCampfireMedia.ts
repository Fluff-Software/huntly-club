import { Image as ExpoImage } from "expo-image";
import {
  collectMediaUrls,
  type CampfireSessionBundle,
} from "@/services/campfireService";

/**
 * Buffers remote images for a campfire session before playback.
 *
 * Audio is loaded by `useCampfireAudio` when playback starts (with
 * `downloadFirst`-style buffering via `replace()` + wait for `isLoaded`).
 * We intentionally avoid `preload()` here — sharing a preloaded buffer with
 * a separate `createAudioPlayer` instance has been unreliable on device.
 */
export async function prepareCampfireMedia(
  bundle: CampfireSessionBundle
): Promise<void> {
  const { images } = collectMediaUrls(bundle);
  if (images.length === 0) return;
  await ExpoImage.prefetch(images, "memory-disk");
}
