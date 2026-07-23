import { Asset } from "expo-asset";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

/** Bundled tab bar PNGs (shared with tab layout). */
export const TAB_BAR_CLUBHOUSE_ICON = require("@/assets/images/home-clubhouse.png");
export const TAB_BAR_MISSIONS_ICON = require("@/assets/images/home-missions.png");

const TAB_BAR_IMAGE_MODULES = [
  TAB_BAR_CLUBHOUSE_ICON,
  TAB_BAR_MISSIONS_ICON,
] as const;

/**
 * Downloads tab PNGs to device storage via expo-asset (see Asset.loadAsync docs)
 * and loads the Material Icons font used by the Backpack tab.
 */
export async function preloadTabBarNavigationAssets(): Promise<void> {
  const [imageAssets] = await Promise.all([
    Asset.loadAsync([...TAB_BAR_IMAGE_MODULES]),
    MaterialIcons.loadFont(),
  ]);

  const imagesReady = imageAssets.every(
    (asset) => asset.downloaded && asset.localUri != null
  );
  if (!imagesReady) {
    throw new Error("Tab bar icon assets did not finish downloading");
  }
}
