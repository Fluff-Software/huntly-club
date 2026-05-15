const UK_TIME_ZONE = "Europe/London";

/** Chapter prep/reminder emails and pushes go out at 8:00 UK on the relevant calendar day. */
export const CHAPTER_NOTIFICATION_HOUR_UK = 8;

type Ymd = { year: number; month: number; day: number };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdToString(ymd: Ymd): string {
  return `${ymd.year}-${pad2(ymd.month)}-${pad2(ymd.day)}`;
}

function parseUkParts(now: Date): Ymd & { hour: number } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: parseInt(get("hour"), 10),
  };
}

function addDays(ymd: Ymd, days: number): Ymd {
  const ms = Date.UTC(ymd.year, ymd.month - 1, ymd.day, 12, 0, 0) + days * 86_400_000;
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** UK calendar date (YYYY-MM-DD) and hour, regardless of chapter unlock gate (6am). */
export function ukNow(now: Date = new Date()): { date: string; hour: number } {
  const uk = parseUkParts(now);
  return { date: ymdToString(uk), hour: uk.hour };
}

export function isChapterNotificationSendWindow(now: Date = new Date()): boolean {
  return ukNow(now).hour >= CHAPTER_NOTIFICATION_HOUR_UK;
}

/**
 * Preparation: 8am UK on `chapters.unlock_date` (calendar day in UK).
 * Returns that unlock_date string, or null if before 8am UK or not applicable.
 */
export function preparationUnlockDateForSend(now: Date = new Date()): string | null {
  const { date, hour } = ukNow(now);
  if (hour < CHAPTER_NOTIFICATION_HOUR_UK) return null;
  return date;
}

/**
 * Reminder: 8am UK on the calendar day after `chapters.unlock_date`.
 * Returns the chapter's unlock_date to match in the DB, or null before 8am UK.
 */
export function reminderUnlockDateForSend(now: Date = new Date()): string | null {
  const { date, hour } = ukNow(now);
  if (hour < CHAPTER_NOTIFICATION_HOUR_UK) return null;
  const uk = parseUkParts(now);
  return ymdToString(addDays(uk, -1));
}
