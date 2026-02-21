import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

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

export async function savePushToken(userId: string, token: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from("push_tokens").upsert(
    {
      user_id: userId,
      expo_push_token: token,
      enabled: true,
      updated_at: now,
    },
    { onConflict: "user_id,expo_push_token" }
  );
}

export async function setPushEnabled(userId: string, enabled: boolean): Promise<boolean> {
  if (enabled) {
    const token = await registerForPushNotificationsAsync();
    if (!token) return false;
    await savePushToken(userId, token);
    return true;
  }
  await supabase
    .from("push_tokens")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return true;
}

export async function getPushEnabled(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("push_tokens")
    .select("id")
    .eq("user_id", userId)
    .eq("enabled", true)
    .limit(1);
  return (data?.length ?? 0) > 0;
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
