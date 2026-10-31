/**
 * Local adventure reminders for a booked slot.
 *
 * Rules (Retention and Onboarding Changes, Oct 2026):
 * - Permission is asked when a slot is booked, with the reason, never on first launch.
 * - Messages go to the parent and are safe on a lock screen: no child names,
 *   no photos, no locations.
 * - Nothing fires inside quiet hours (default 8pm–7am).
 * - At most a handful a week: the booked slot (+ optional evening-before nudge)
 *   and one per chosen weekly day.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  type AdventurePlan,
  DEFAULT_QUIET_END,
  DEFAULT_QUIET_START,
  defaultSkippedSlot,
  isInQuietHours,
  parseHm,
} from "@/services/adventurePlanService";
import { registerForPushNotificationsAsync, setPushEnabled } from "@/services/pushNotificationService";

const ID_PREFIX = "adventure-";
const CHANNEL_ID = "adventures";

type GuideName = "Bella" | "Felix" | "Oli";

export type ReminderPermission = "granted" | "denied" | "undetermined";

export async function getReminderPermission(): Promise<ReminderPermission> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as ReminderPermission;
  } catch {
    return "undetermined";
  }
}

/**
 * Ask for notification permission at the moment of booking. Also registers the
 * device for server push (new missions) so one prompt covers both.
 */
export async function requestReminderPermission(): Promise<boolean> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Adventure reminders",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    // Local reminders only need the OS permission; ask for it directly (the push helper
    // below skips the prompt entirely on simulators).
    const existing = await Notifications.getPermissionsAsync();
    const status =
      existing.status === "granted" ? existing.status : (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return false;
    // Same permission also enables server push for new missions on real devices.
    const token = await registerForPushNotificationsAsync().catch(() => null);
    if (token) await setPushEnabled(true, token).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

/** Shift a time out of quiet hours: late evening moves to the evening before's 6pm; early morning to quiet end. */
function clampOutOfQuiet(d: Date, quietStart: string, quietEnd: string): Date {
  if (!isInQuietHours(d, quietStart, quietEnd)) return d;
  const out = new Date(d);
  const { h, m } = parseHm(quietEnd);
  if (d.getHours() * 60 + d.getMinutes() < h * 60 + m) {
    out.setHours(h, m, 0, 0);
  } else {
    out.setHours(18, 0, 0, 0);
  }
  return out;
}

function slotCopy(guide: GuideName) {
  return {
    title: "Adventure time",
    body: `${guide}'s ready when you are. Today's mission takes about 15 minutes.`,
  };
}

function eveningBeforeCopy(guide: GuideName) {
  return {
    title: "Tomorrow's adventure",
    body: `${guide} has a mission lined up for tomorrow. Nothing to prepare: just bring curiosity.`,
  };
}

function weeklyCopy(guide: GuideName) {
  return {
    title: "Your weekly adventure",
    body: `It's adventure o'clock. ${guide} has something new waiting in the Clubhouse.`,
  };
}

async function cancelAdventureReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

async function scheduleAt(id: string, when: Date, content: { title: string; body: string }) {
  if (when.getTime() <= Date.now() + 60 * 1000) return;
  await Notifications.scheduleNotificationAsync({
    identifier: `${ID_PREFIX}${id}`,
    content: { ...content, data: { screen: "clubhouse" } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
    },
  });
}

/**
 * Replace all adventure reminders to match `plan`. Safe to call repeatedly
 * (on booking, on settings change, on app start).
 */
export async function syncAdventureReminders(plan: AdventurePlan | null, guide: GuideName): Promise<number> {
  try {
    await cancelAdventureReminders();
    if (!plan || !plan.notifyBookedSlot) return 0;
    if ((await getReminderPermission()) !== "granted") return 0;

    const quietStart = plan.quietStart || DEFAULT_QUIET_START;
    const quietEnd = plan.quietEnd || DEFAULT_QUIET_END;
    let count = 0;

    const first = plan.firstAt ? new Date(plan.firstAt) : plan.choice === "skipped" ? defaultSkippedSlot() : null;
    if (first && !plan.reschedulePromptedAt) {
      await scheduleAt("first", clampOutOfQuiet(first, quietStart, quietEnd), slotCopy(guide));
      count++;
      // Morning slots get a gentle heads-up the evening before (6pm, outside quiet hours).
      if (first.getHours() < 12) {
        const eve = new Date(first);
        eve.setDate(eve.getDate() - 1);
        eve.setHours(18, 0, 0, 0);
        if (!isInQuietHours(eve, quietStart, quietEnd) && eve.getTime() > Date.now() + 60 * 60 * 1000) {
          await scheduleAt("first-eve", eve, eveningBeforeCopy(guide));
          count++;
        }
      }
    }

    if (plan.weeklyTime && plan.weeklyDays.length > 0) {
      const { h, m } = parseHm(plan.weeklyTime);
      const probe = new Date();
      probe.setHours(h, m, 0, 0);
      const at = clampOutOfQuiet(probe, quietStart, quietEnd);
      for (const day of plan.weeklyDays) {
        await Notifications.scheduleNotificationAsync({
          identifier: `${ID_PREFIX}weekly-${day}`,
          content: { ...weeklyCopy(guide), data: { screen: "clubhouse" } },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            // expo-notifications weekdays are 1 = Sunday … 7 = Saturday.
            weekday: day + 1,
            hour: at.getHours(),
            minute: at.getMinutes(),
            ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
          },
        });
        count++;
      }
    }
    return count;
  } catch (e) {
    console.warn("syncAdventureReminders failed", e);
    return 0;
  }
}

export function guideForTeam(teamName: string | null | undefined): GuideName {
  const n = (teamName ?? "").toLowerCase();
  if (n.startsWith("fox")) return "Felix";
  if (n.startsWith("otter")) return "Oli";
  return "Bella";
}
