/**
 * One-time "turn on notifications?" prompt for families who don't have push on.
 *
 * Shown at most once per device (AsyncStorage flag). Families who answer the
 * reminder question at the end of sign-up are marked as asked, so new sign-ups
 * don't see it straight after.
 *
 * "Yes":
 *  - OS permission already granted → save the token.
 *  - OS can still ask (never asked) → show the system "Allow notifications?" popup.
 *    (On iOS the app's Settings page has no Notifications switch until the app has
 *    asked once, so sending these families to Settings would strand them.)
 *  - OS can't ask again (said no before) → open the phone's Settings for the app;
 *    `syncPushAfterSettingsReturn` saves the token when they come back with it on.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Linking } from "react-native";
import { getPushEnabled, setPushEnabled } from "@/services/pushNotificationService";

const PROMPT_SHOWN_KEY = "push_optin_prompt_v1";
const SETTINGS_PENDING_KEY = "push_optin_settings_pending_v1";

// expo-modules-core is nested under expo here, so PermissionResponse's fields don't resolve for tsc.
type PermissionLike = { status: "granted" | "denied" | "undetermined"; canAskAgain: boolean };
const getPermissions = () => Notifications.getPermissionsAsync() as unknown as Promise<PermissionLike>;

export type PushOptInResult = "enabled" | "declined" | "opened_settings" | "failed";

async function getFlag(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key)) === "1";
  } catch {
    return false;
  }
}

async function setFlag(key: string, on: boolean): Promise<void> {
  try {
    if (on) await AsyncStorage.setItem(key, "1");
    else await AsyncStorage.removeItem(key);
  } catch {
    // Non-critical: worst case the prompt shows again or a settings return isn't picked up.
  }
}

export async function markPushOptInPromptShown(): Promise<void> {
  await setFlag(PROMPT_SHOWN_KEY, true);
}

/**
 * Decide on launch whether to show the prompt. Also refreshes the stored token for
 * devices that already have push on (tokens can change after reinstalls/restores).
 */
export async function shouldShowPushOptInPrompt(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const enabled = await getPushEnabled().catch(() => false);
  if (enabled) {
    void setPushEnabled(true).catch(() => undefined);
    return false;
  }
  return !(await getFlag(PROMPT_SHOWN_KEY));
}

/** The family tapped "Yes" on the prompt. */
export async function enablePushFromPrompt(): Promise<PushOptInResult> {
  await markPushOptInPromptShown();
  try {
    const perm = await getPermissions();
    if (perm.status === "granted" || perm.canAskAgain) {
      // Shows the system popup if needed, then saves the token.
      const ok = await setPushEnabled(true);
      if (ok) return "enabled";
      const after = await getPermissions();
      return after.status === "granted" ? "failed" : "declined";
    }
    await setFlag(SETTINGS_PENDING_KEY, true);
    await Linking.openSettings();
    return "opened_settings";
  } catch {
    return "failed";
  }
}

/** The family tapped "Not now". */
export async function declinePushFromPrompt(): Promise<void> {
  await markPushOptInPromptShown();
}

/**
 * Call when the app returns to the foreground. If the family went to Settings from
 * the prompt and turned notifications on, save the token. Returns true if it did.
 */
export async function syncPushAfterSettingsReturn(): Promise<boolean> {
  if (!(await getFlag(SETTINGS_PENDING_KEY))) return false;
  try {
    const perm = await getPermissions();
    if (perm.status !== "granted") return false;
    const ok = await setPushEnabled(true);
    if (ok) await setFlag(SETTINGS_PENDING_KEY, false);
    return ok;
  } catch {
    return false;
  }
}
