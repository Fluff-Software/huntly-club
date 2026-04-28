const UK_TIME_ZONE = "Europe/London";
const UNLOCK_HOUR_UK = 6; // 6am UK time, always.

type UkParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdFromUtcMs(ms: number): { year: number; month: number; day: number } {
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function ymdToString(ymd: { year: number; month: number; day: number }): string {
  return `${ymd.year}-${pad2(ymd.month)}-${pad2(ymd.day)}`;
}

function parseUkParts(date: Date): UkParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: parseInt(get("hour"), 10),
    minute: parseInt(get("minute"), 10),
    second: parseInt(get("second"), 10),
  };
}

function addDaysYmd(ymd: { year: number; month: number; day: number }, days: number) {
  // Uses UTC to safely roll the calendar date (we only need YYYY-MM-DD).
  const ms = Date.UTC(ymd.year, ymd.month - 1, ymd.day, 12, 0, 0) + days * 86_400_000;
  return ymdFromUtcMs(ms);
}

function parseYmd(dateStr: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
}

function offsetMinutesAt(utcMs: number): number {
  // Offset = local(UK) time expressed as UTC millis - actual UTC millis.
  const p = parseUkParts(new Date(utcMs));
  const localAsUtcMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((localAsUtcMs - utcMs) / 60_000);
}

/**
 * Returns the "effective today" date string (YYYY-MM-DD) for chapter unlock gating.
 * Rule: chapters unlock at 6:00am UK time. Before 6am UK time, we still consider it "yesterday" for unlock checks.
 */
export function ukTodayForChapterUnlockGate(now: Date = new Date()): string {
  const uk = parseUkParts(now);
  const base = { year: uk.year, month: uk.month, day: uk.day };
  const effective = uk.hour < UNLOCK_HOUR_UK ? addDaysYmd(base, -1) : base;
  return ymdToString(effective);
}

/**
 * Convert an unlock date (YYYY-MM-DD, stored in DB) into the exact unlock moment in UTC milliseconds:
 * 6:00am UK time on that date.
 */
export function ukUnlockDateToUtcMs(unlockDate: string): number | null {
  const ymd = parseYmd(unlockDate);
  if (!ymd) return null;

  // Start with the desired *local* time expressed as if it were UTC.
  const desiredLocalAsUtcMs = Date.UTC(ymd.year, ymd.month - 1, ymd.day, UNLOCK_HOUR_UK, 0, 0);

  // Compute UK offset around that moment and subtract it to get the true UTC instant.
  const offsetMin = offsetMinutesAt(desiredLocalAsUtcMs);
  return desiredLocalAsUtcMs - offsetMin * 60_000;
}

export const UK_CHAPTER_UNLOCK_HOUR = UNLOCK_HOUR_UK;
export const UK_CHAPTER_TIME_ZONE = UK_TIME_ZONE;

