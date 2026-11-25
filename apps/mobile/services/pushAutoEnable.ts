/**
 * Notifications are on by default.
 *
 * On app open (once the Clubhouse has settled) we switch push on for this device unless the
 * family has turned it off in the app (Me → Settings → Notifications):
 *  - Android 12 and older: notifications are allowed at install, so this is silent.
 *  - iOS and Android 13+: the system "Allow notifications?" prompt appears (the OS requires it).
 * The prompt is shown at most once per device. If sign-up has just asked about reminders, it waits
 * (for "No reminders, thanks", until the next time the app is opened).
 * After that we only refresh the token.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import {
  ensureDefaultNotificationChannel,
  getPushPermissions,
  getPushState,
  getPushTokenIfAllowed,
  isPushAllowed,
  setPushEnabled,
} from "@/services/pushNotificationService";

const AUTO_ASKED_KEY = "push_auto_enable_asked_v1";

async function hasAutoAsked(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(AUTO_ASKED_KEY)) === "1";
  } catch {
    return false;
  }
}

let deferredThisSession = false;

/** "No reminders, thanks" at sign-up: don't prompt straight after; ask next time the app is opened. */
export function deferPushAutoAsk(): void {
  deferredThisSession = true;
}

/** Call when the family has just seen the system prompt elsewhere (sign-up reminders), so we don't prompt again. */
export async function markPushAutoAsked(): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTO_ASKED_KEY, "1");
  } catch {
    // Non-critical: worst case the system prompt shows once more.
  }
}

/**
 * Switch push on for this device if the family hasn't turned it off.
 * `ask`: allowed to show the one-time system prompt. Without it, only a
 * device the phone already allows is registered (used when returning from the phone's Settings).
 */
export async function autoEnablePush({ ask }: { ask: boolean }): Promise<void> {
  if (!Device.isDevice) return;
  try {
    const state = await getPushState();
    // null: couldn't tell (offline, or the server isn't updated yet). "off": the family's choice.
    if (state === null || state === "off") return;
    // Foreground checks only pick up devices that aren't on yet; the launch check refreshes tokens.
    if (!ask && state === "on") return;

    let perm = await getPushPermissions();
    if (!isPushAllowed(perm)) {
      // "on" but the phone blocks it: they turned it off in the phone's Settings. Leave it.
      if (state === "on" || !ask || deferredThisSession || !perm.canAskAgain || (await hasAutoAsked())) return;
      await markPushAutoAsked();
      await ensureDefaultNotificationChannel();
      perm = (await Notifications.requestPermissionsAsync()) as unknown as typeof perm;
      if (!isPushAllowed(perm)) return;
    }

    // Allowed: save (or refresh) this device's token. Tokens can change after reinstalls.
    const token = await getPushTokenIfAllowed();
    if (token) await setPushEnabled(true, token);
  } catch (e) {
    console.warn("Could not switch notifications on:", e);
  }
}
