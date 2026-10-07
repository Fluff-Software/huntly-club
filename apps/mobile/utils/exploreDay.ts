/**
 * The Explore "day": stops refresh at UK midnight. Mirrors the server's
 * `explore_claim_day()` (Europe/London), so the app and the claim RPC agree on
 * what "today" is regardless of the phone's own timezone.
 */

const TZ = "Europe/London";

const DAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const CLOCK_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** UK calendar day as "YYYY-MM-DD". */
export function exploreClaimDay(now: Date = new Date()): string {
  return DAY_FORMAT.format(now);
}

/**
 * Milliseconds until the next UK midnight. Computed from the UK wall clock, so
 * it can be an hour out on the two daylight-saving changeover days -- callers
 * re-check `exploreClaimDay()` when the timer fires rather than trusting it.
 */
export function msUntilExploreMidnight(now: Date = new Date()): number {
  const parts = Object.fromEntries(
    CLOCK_FORMAT.formatToParts(now).map((p) => [p.type, p.value])
  );
  const secondsIntoDay = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  return Math.max(1000, (86_400 - secondsIntoDay) * 1000 - now.getMilliseconds());
}
