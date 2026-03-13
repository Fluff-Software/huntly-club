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

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4F6F52",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId: projectId as string,
    });
    return tokenResult.data ?? null;
  } catch {
    return null;
  }
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
 * Returns true if a row exists for this device and enabled is true; otherwise false.
 */
export async function getPushEnabled(): Promise<boolean> {
  const deviceId = await getDeviceId();
  if (!deviceId) return false;

  const { data, error } = await supabase.rpc("get_push_enabled", {
    p_device_id: deviceId,
  });
  if (error) return false;
  return data === true;
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
