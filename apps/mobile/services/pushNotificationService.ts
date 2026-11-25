import * as Application from "expo-application";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const DEVICE_ID_STORE_KEY = "push_device_id";

/**
 * Returns a stable device identifier: Android ID on Android, IDFV on iOS (or a stored UUID fallback).
 */
export async function getDeviceId(): Promise<string | null> {
  if (!Device.isDevice) return null;
  try {
    if (Platform.OS === "android") {
      return Application.getAndroidId() ?? null;
    }
    const idfv = await Application.getIosIdForVendorAsync();
    if (idfv) return idfv;
    let stored = await SecureStore.getItemAsync(DEVICE_ID_STORE_KEY);
    if (!stored) {
      stored = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 15)}`;
      await SecureStore.setItemAsync(DEVICE_ID_STORE_KEY, stored);
    }
    return stored;
  } catch {
    return null;
  }
}

type PermissionLike = {
  status: "granted" | "denied" | "undetermined";
  granted?: boolean;
  canAskAgain: boolean;
  ios?: { status?: number };
};

/** Push can be delivered: fully allowed, or iOS "quiet" (provisional) delivery to Notification Center. */
export function isPushAllowed(perm: PermissionLike): boolean {
  return (
    perm.status === "granted" ||
    perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

// expo-modules-core is nested under expo here, so the permission fields don't resolve for tsc.
export const getPushPermissions = () =>
  Notifications.getPermissionsAsync() as unknown as Promise<PermissionLike>;

/** Android 13+ only shows the permission prompt once a channel exists, so create it first. */
export async function ensureDefaultNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#4F6F52",
  });
}

/** The Expo push token, without asking for permission. Null if push isn't allowed. */
export async function getPushTokenIfAllowed(): Promise<string | null> {
  if (!Device.isDevice) return null;
  await ensureDefaultNotificationChannel();
  if (!isPushAllowed(await getPushPermissions())) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId: projectId as string,
    });
    return tokenResult.data ?? null;
  } catch (e) {
    console.warn("Could not get an Expo push token:", e);
    return null;
  }
}

/**
 * Asks for full permission if needed (on iOS this also upgrades quiet/provisional
 * delivery to full), then returns the Expo push token. Null if not allowed.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;
  await ensureDefaultNotificationChannel();

  const existing = await getPushPermissions();
  if (existing.status !== "granted" && existing.canAskAgain) {
    await Notifications.requestPermissionsAsync();
  }
  return getPushTokenIfAllowed();
}

/**
 * Enable: creates or updates the row for this device with the given token and enabled=true.
 * Disable: sets enabled=false for this device if a row exists.
 * @param enabled - whether push should be enabled
 * @param token - when enabling, the Expo push token (if not provided, will be requested)
 */
export async function setPushEnabled(
  enabled: boolean,
  token?: string | null
): Promise<boolean> {
  const deviceId = await getDeviceId();
  if (!deviceId) return false;

  if (enabled) {
    const pushToken = token ?? (await registerForPushNotificationsAsync());
    if (!pushToken) return false;
    const { error } = await supabase.rpc("set_push_enabled", {
      p_device_id: deviceId,
      p_enabled: true,
      p_expo_push_token: pushToken,
    });
    return !error;
  }

  const { error } = await supabase.rpc("set_push_enabled", {
    p_device_id: deviceId,
    p_enabled: false,
    p_expo_push_token: null,
  });
  return !error;
}

/**
 * What this device's push setting is in the app: "on", "off" (turned off by the family),
 * or "unset" (never set on this device).
 */
export async function getPushState(): Promise<"on" | "off" | "unset" | null> {
  const deviceId = await getDeviceId();
  if (!deviceId) return null;

  const { data, error } = await supabase.rpc("get_push_enabled", {
    p_device_id: deviceId,
  });
  if (error) return null;
  if (data === true) return "on";
  if (data === false) return "off";
  return "unset";
}

/**
 * Returns true only if (1) a row exists for this device with enabled true, and (2) the phone
 * allows notifications (including iOS quiet delivery).
 * So the toggle shows unchecked when the user disabled notifications in device settings.
 */
export async function getPushEnabled(): Promise<boolean> {
  if ((await getPushState()) !== "on") return false;
  return isPushAllowed(await getPushPermissions());
}

export async function hasAskedPushOptIn(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("notification_prompt_asked")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data != null;
}

export async function setPushOptInAsked(userId: string): Promise<void> {
  await supabase.from("notification_prompt_asked").upsert(
    { user_id: userId, asked_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
}
