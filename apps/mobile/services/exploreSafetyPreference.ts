/**
 * Preference for whether Explore shows the safety rules on every visit.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

/** When "1", skip the safety warning on Explore entry. Default: show every time. */
export const EXPLORE_SAFETY_SKIP_STORAGE_KEY = "explore_safety_skip_v1";

export async function getExploreSafetySkipEveryTime(): Promise<boolean> {
  try {
    const skip = await AsyncStorage.getItem(EXPLORE_SAFETY_SKIP_STORAGE_KEY);
    return skip === "1";
  } catch {
    return false;
  }
}

export async function setExploreSafetySkipEveryTime(skip: boolean): Promise<void> {
  await AsyncStorage.setItem(EXPLORE_SAFETY_SKIP_STORAGE_KEY, skip ? "1" : "0");
}
