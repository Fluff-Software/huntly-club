/**
 * Cross-platform haptics wrappers.
 *
 * expo-haptics' impactAsync/notificationAsync/selectionAsync are implemented
 * on Android via the raw `Vibrator` API, which Expo's own docs and changelog
 * flag as unreliable ("Android's Vibrator API is not recommended... instead
 * you should use performAndroidHapticsAsync") -- some devices (e.g. Pixel 9
 * on Android 15) have been observed to silently drop it entirely.
 * performAndroidHapticsAsync instead calls the OS's semantic
 * View.performHapticFeedback() constants, the same mechanism the system
 * keyboard and sliders use. iOS keeps the original APIs, which map directly
 * to UIKit's feedback generators and don't have this problem.
 */
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

const IMPACT_ANDROID_DEFAULTS: Record<Haptics.ImpactFeedbackStyle, Haptics.AndroidHaptics> = {
  [Haptics.ImpactFeedbackStyle.Light]: Haptics.AndroidHaptics.Segment_Frequent_Tick,
  [Haptics.ImpactFeedbackStyle.Soft]: Haptics.AndroidHaptics.Segment_Frequent_Tick,
  [Haptics.ImpactFeedbackStyle.Medium]: Haptics.AndroidHaptics.Segment_Tick,
  [Haptics.ImpactFeedbackStyle.Rigid]: Haptics.AndroidHaptics.Segment_Tick,
  [Haptics.ImpactFeedbackStyle.Heavy]: Haptics.AndroidHaptics.Long_Press,
};

const NOTIFICATION_ANDROID_DEFAULTS: Record<
  Haptics.NotificationFeedbackType,
  Haptics.AndroidHaptics
> = {
  [Haptics.NotificationFeedbackType.Success]: Haptics.AndroidHaptics.Confirm,
  [Haptics.NotificationFeedbackType.Warning]: Haptics.AndroidHaptics.Reject,
  [Haptics.NotificationFeedbackType.Error]: Haptics.AndroidHaptics.Reject,
};

/** @param androidType Override the default style-based mapping when a call site needs a specific feel (e.g. rapid ticks). */
export async function hapticImpact(
  style: Haptics.ImpactFeedbackStyle,
  androidType?: Haptics.AndroidHaptics
): Promise<void> {
  if (Platform.OS === "android") {
    await Haptics.performAndroidHapticsAsync(androidType ?? IMPACT_ANDROID_DEFAULTS[style]);
    return;
  }
  await Haptics.impactAsync(style);
}

export async function hapticNotification(
  type: Haptics.NotificationFeedbackType,
  androidType?: Haptics.AndroidHaptics
): Promise<void> {
  if (Platform.OS === "android") {
    await Haptics.performAndroidHapticsAsync(androidType ?? NOTIFICATION_ANDROID_DEFAULTS[type]);
    return;
  }
  await Haptics.notificationAsync(type);
}

export async function hapticSelection(
  androidType: Haptics.AndroidHaptics = Haptics.AndroidHaptics.Gesture_Start
): Promise<void> {
  if (Platform.OS === "android") {
    await Haptics.performAndroidHapticsAsync(androidType);
    return;
  }
  await Haptics.selectionAsync();
}
