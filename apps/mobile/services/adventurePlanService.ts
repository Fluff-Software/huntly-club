/**
 * Adventure plans: when a family intends to do their first (and weekly) adventure.
 *
 * Stored as a day and time only (`family_adventure_plans`), never with a location.
 * See "Huntly World: Retention and Onboarding Changes" (Oct 2026).
 */
import { supabase } from "@/services/supabase";

export type SlotChoice =
  | "tomorrow_before_school"
  | "school_run"
  | "after_school"
  | "saturday_morning"
  | "sunday"
  | "today_afternoon"
  | "custom"
  | "skipped";

export type AdventurePlanDraft = {
  choice: SlotChoice;
  /** ISO timestamp of the first adventure, or null when skipped. */
  firstAt: string | null;
  /** 0 = Sunday … 6 = Saturday. */
  weeklyDays: number[];
  /** "HH:MM", 24h. */
  weeklyTime: string | null;
};

export type AdventurePlan = AdventurePlanDraft & {
  quietStart: string;
  quietEnd: string;
  notifyBookedSlot: boolean;
  notifyNewMission: boolean;
  notifyTeamMoments: boolean;
  notifyLapsed: boolean;
  reschedulePromptedAt: string | null;
  updatedAt: string | null;
};

export type SlotOption = {
  choice: Exclude<SlotChoice, "custom" | "skipped">;
  label: string;
  time: string;
};

export const DEFAULT_QUIET_START = "20:00";
export const DEFAULT_QUIET_END = "07:00";
export const DEFAULT_WEEKLY_TIME = "10:00";

const SLOT_TIMES: Record<SlotOption["choice"], string> = {
  tomorrow_before_school: "07:30",
  school_run: "08:20",
  after_school: "15:30",
  saturday_morning: "10:00",
  sunday: "10:00",
  today_afternoon: "14:00",
};

export function parseHm(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(":").map((p) => parseInt(p, 10));
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
}

export function formatHm(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function atTime(base: Date, hm: string): Date {
  const { h, m } = parseHm(hm);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Next date (strictly after `now`) falling on `weekday` at `hm`. */
export function nextWeekdayAt(now: Date, weekday: number, hm: string): Date {
  const d = atTime(now, hm);
  const delta = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + delta);
  if (d <= now) d.setDate(d.getDate() + 7);
  return d;
}

/** Next school day (Mon–Fri) strictly after today, at `hm`. */
function nextSchoolDayAt(now: Date, hm: string): Date {
  const d = atTime(now, hm);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

/** After-school today if it is still ahead (with an hour to spare), otherwise the next school day. */
function nextAfterSchool(now: Date, hm: string): Date {
  const today = atTime(now, hm);
  const isSchoolDay = today.getDay() >= 1 && today.getDay() <= 5;
  if (isSchoolDay && today.getTime() - now.getTime() > 60 * 60 * 1000) return today;
  return nextSchoolDayAt(now, hm);
}

export function slotDate(choice: SlotOption["choice"], now = new Date()): Date {
  const hm = SLOT_TIMES[choice];
  switch (choice) {
    case "tomorrow_before_school":
    case "school_run":
      return nextSchoolDayAt(now, hm);
    case "after_school":
      return nextAfterSchool(now, hm);
    case "saturday_morning":
      return nextWeekdayAt(now, 6, hm);
    case "sunday":
      return nextWeekdayAt(now, 0, hm);
    case "today_afternoon":
      return atTime(now, hm);
  }
}

/** The short list shown on the picker, worded for when the parent is signing up. */
export function slotOptions(now = new Date()): SlotOption[] {
  const weekend = now.getDay() === 0 || now.getDay() === 6;
  if (weekend) return weekendSlotOptions(now);
  const before = slotDate("tomorrow_before_school", now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = before.toDateString() === tomorrow.toDateString();
  const afterSchool = slotDate("after_school", now);
  const afterSchoolToday = afterSchool.toDateString() === now.toDateString();
  const options: SlotOption[] = [
    {
      choice: "tomorrow_before_school",
      label: isTomorrow ? "Tomorrow before school" : `${weekdayName(before)} before school`,
      time: SLOT_TIMES.tomorrow_before_school,
    },
    { choice: "school_run", label: "On the school run", time: SLOT_TIMES.school_run },
    {
      choice: "after_school",
      label: afterSchoolToday ? "Today after school" : `${weekdayName(afterSchool)} after school`,
      time: SLOT_TIMES.after_school,
    },
    { choice: "saturday_morning", label: "Saturday morning", time: SLOT_TIMES.saturday_morning },
  ];
  // Saturday morning is "today" on a Saturday before 9; Sunday is the better weekend pick after that.
  if (now.getDay() === 6 && now.getHours() >= 9) {
    options[3] = { choice: "sunday", label: "Sunday morning", time: SLOT_TIMES.sunday };
  }
  return options;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function weekdayName(d: Date): string {
  return WEEKDAYS[d.getDay()];
}

export function shortWeekday(day: number): string {
  return WEEKDAYS[day].slice(0, 3);
}

/** "Sunday at 10am", "Sat and Sun at 3:30pm". */
export function weeklyLabel(days: number[], hm: string): string {
  const { h, m } = parseHm(hm);
  const t = new Date();
  t.setHours(h, m, 0, 0);
  const dayText = days.length === 1 ? WEEKDAYS[days[0]] : days.map(shortWeekday).join(", ").replace(/, ([^,]*)$/, " and $1");
  return `${dayText} at ${friendlyTime(t)}`;
}

/** Weekend sign-ups get a same-day option: weekends are when most families head out. */
function weekendSlotOptions(now: Date): SlotOption[] {
  const options: SlotOption[] = [];
  if (now.getHours() < 13) {
    options.push({ choice: "today_afternoon", label: "This afternoon", time: SLOT_TIMES.today_afternoon });
  }
  if (now.getDay() === 6) {
    options.push({ choice: "sunday", label: "Sunday morning", time: SLOT_TIMES.sunday });
  }
  const before = slotDate("tomorrow_before_school", now);
  options.push({
    choice: "tomorrow_before_school",
    label: `${weekdayName(before)} before school`,
    time: SLOT_TIMES.tomorrow_before_school,
  });
  const after = slotDate("after_school", now);
  options.push({ choice: "after_school", label: `${weekdayName(after)} after school`, time: SLOT_TIMES.after_school });
  return options.slice(0, 4);
}

/** "10", "10:30", "3:30pm"-free 24h-friendly label used in friendly copy, e.g. "Saturday at 10". */
export function friendlyTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = h < 12 ? "am" : "pm";
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

/** "tomorrow at 7:30am", "Saturday at 10am", "today at 3:30pm". */
export function friendlyWhen(d: Date, now = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  let day: string;
  if (d.toDateString() === now.toDateString()) day = "today";
  else if (d.toDateString() === tomorrow.toDateString()) day = "tomorrow";
  else if (d.getTime() - now.getTime() < 6 * 24 * 60 * 60 * 1000) day = weekdayName(d);
  else day = d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
  return `${day} at ${friendlyTime(d)}`;
}

/** Default reminder when a parent skips the question: the next weekend morning. */
export function defaultSkippedSlot(now = new Date()): Date {
  const sat = nextWeekdayAt(now, 6, "10:00");
  const sun = nextWeekdayAt(now, 0, "10:00");
  return sat < sun ? sat : sun;
}

/** True when `d` falls in the quiet window (which may wrap midnight, e.g. 20:00–08:00). */
export function isInQuietHours(d: Date, quietStart: string, quietEnd: string): boolean {
  const mins = d.getHours() * 60 + d.getMinutes();
  const s = parseHm(quietStart);
  const e = parseHm(quietEnd);
  const start = s.h * 60 + s.m;
  const end = e.h * 60 + e.m;
  if (start === end) return false;
  return start < end ? mins >= start && mins < end : mins >= start || mins < end;
}

/** Whether the booked first slot has passed without being kept (3h grace). */
export function isFirstSlotMissed(plan: AdventurePlan | null, lastCompletedAt: string | null, now = new Date()): boolean {
  if (!plan?.firstAt || plan.choice === "skipped") return false;
  if (plan.reschedulePromptedAt) return false;
  const slot = new Date(plan.firstAt);
  if (now.getTime() < slot.getTime() + 3 * 60 * 60 * 1000) return false;
  if (lastCompletedAt && new Date(lastCompletedAt) >= new Date(slot.getTime() - 24 * 60 * 60 * 1000)) return false;
  return true;
}

type PlanRow = {
  user_id: string;
  first_slot_choice: SlotChoice | null;
  first_adventure_at: string | null;
  weekly_days: number[] | null;
  weekly_time: string | null;
  quiet_start: string;
  quiet_end: string;
  notify_booked_slot: boolean;
  notify_new_mission: boolean;
  notify_team_moments: boolean;
  notify_lapsed: boolean;
  reschedule_prompted_at: string | null;
  updated_at: string | null;
};

const hm = (t: string | null) => (t ? t.slice(0, 5) : null);

function fromRow(row: PlanRow): AdventurePlan {
  return {
    choice: row.first_slot_choice ?? "skipped",
    firstAt: row.first_adventure_at,
    weeklyDays: row.weekly_days ?? [],
    weeklyTime: hm(row.weekly_time),
    quietStart: hm(row.quiet_start) ?? DEFAULT_QUIET_START,
    quietEnd: hm(row.quiet_end) ?? DEFAULT_QUIET_END,
    notifyBookedSlot: row.notify_booked_slot,
    notifyNewMission: row.notify_new_mission,
    notifyTeamMoments: row.notify_team_moments,
    notifyLapsed: row.notify_lapsed,
    reschedulePromptedAt: row.reschedule_prompted_at,
    updatedAt: row.updated_at,
  };
}

// The table is newer than the generated Supabase types, so it is queried untyped.
const plans = () => (supabase as unknown as { from: (t: string) => any }).from("family_adventure_plans");

export async function getAdventurePlan(userId: string): Promise<AdventurePlan | null> {
  const { data, error } = await plans().select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    console.warn("getAdventurePlan failed", error.message);
    return null;
  }
  return data ? fromRow(data as PlanRow) : null;
}

export async function saveAdventurePlan(userId: string, draft: AdventurePlanDraft): Promise<AdventurePlan | null> {
  const { data, error } = await plans()
    .upsert(
      {
        user_id: userId,
        first_slot_choice: draft.choice,
        first_adventure_at: draft.firstAt,
        weekly_days: draft.weeklyDays,
        weekly_time: draft.weeklyTime,
        reschedule_prompted_at: null,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as PlanRow);
}

export type PlanPrefs = Partial<
  Pick<
    AdventurePlan,
    "notifyBookedSlot" | "notifyNewMission" | "notifyTeamMoments" | "notifyLapsed" | "quietStart" | "quietEnd" | "weeklyDays" | "weeklyTime"
  >
>;

export async function updateAdventurePlanPrefs(userId: string, prefs: PlanPrefs): Promise<AdventurePlan | null> {
  const patch: Record<string, unknown> = { user_id: userId };
  if (prefs.notifyBookedSlot !== undefined) patch.notify_booked_slot = prefs.notifyBookedSlot;
  if (prefs.notifyNewMission !== undefined) patch.notify_new_mission = prefs.notifyNewMission;
  if (prefs.notifyTeamMoments !== undefined) patch.notify_team_moments = prefs.notifyTeamMoments;
  if (prefs.notifyLapsed !== undefined) patch.notify_lapsed = prefs.notifyLapsed;
  if (prefs.quietStart !== undefined) patch.quiet_start = prefs.quietStart;
  if (prefs.quietEnd !== undefined) patch.quiet_end = prefs.quietEnd;
  if (prefs.weeklyDays !== undefined) patch.weekly_days = prefs.weeklyDays;
  if (prefs.weeklyTime !== undefined) patch.weekly_time = prefs.weeklyTime;
  const { data, error } = await plans().upsert(patch, { onConflict: "user_id" }).select("*").single();
  if (error) throw new Error(error.message);
  return fromRow(data as PlanRow);
}

export async function markReschedulePrompted(userId: string): Promise<void> {
  await plans().update({ reschedule_prompted_at: new Date().toISOString() }).eq("user_id", userId);
}

/** Most recent mission completion across the account's explorers. */
export async function getLastMissionCompletedAt(profileIds: number[]): Promise<string | null> {
  if (profileIds.length === 0) return null;
  const { data } = await supabase
    .from("user_activity_progress")
    .select("completed_at")
    .in("profile_id", profileIds)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1);
  return (data?.[0]?.completed_at as string | undefined) ?? null;
}
