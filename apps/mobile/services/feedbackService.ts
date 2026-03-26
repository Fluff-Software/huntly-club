import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { supabase } from "@/services/supabase";

type SubmitFeedbackArgs = {
  message: string;
  screen: string;
  profileId?: number;
  teamId?: number;
  userId?: string;
  category?: string;
};

type SubmitFeedbackResult =
  | { ok: true }
  | { ok: false; error: Error | null };

export async function submitFeedback(
  args: SubmitFeedbackArgs
): Promise<SubmitFeedbackResult> {
  const { message, screen, profileId, teamId, userId, category } = args;

  try {
    const appVersion = Constants.expoConfig?.version ?? null;
    const appBuild =
      // @ts-expect-error buildNumber is commonly set via extra or ios config
      Constants.expoConfig?.ios?.buildNumber ??
      // @ts-expect-error android versionCode alternative
      Constants.expoConfig?.android?.versionCode ??
      null;

    const appEnvironment =
      // @ts-expect-error custom extra field if set
      Constants.expoConfig?.extra?.appEnvironment ?? "beta";

    const devicePlatform = Platform.OS;
    const deviceModel =
      Device.modelName ?? Device.deviceName ?? "Unknown device";

    const { error } = await supabase.from("user_feedback").insert({
      profile_id: profileId ?? null,
      user_id: userId ?? null,
      team_id: teamId ?? null,
      source: "mobile_app",
      screen,
      message,
      device_platform: devicePlatform,
      device_model: deviceModel,
      app_version: appVersion,
      app_build: appBuild,
      app_environment: appEnvironment,
      extra: category ? { category } : null,
    });

    if (error) {
      console.error("submitFeedback error", error);
      return { ok: false, error: new Error(error.message) };
    }

    return { ok: true };
  } catch (err) {
    console.error("submitFeedback unexpected error", err);
    return {
      ok: false,
      error: err instanceof Error ? err : null,
    };
  }
}

