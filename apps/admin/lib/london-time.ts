/**
 * Helpers for editing event windows in UK time (the audience's clock),
 * independent of the admin's own timezone. Values are stored as UTC instants.
 */

const TZ = "Europe/London";

const PARTS_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** ISO instant -> "YYYY-MM-DDTHH:mm" in UK time, for <input type="datetime-local">. */
export function isoToLondonLocal(iso: string): string {
  const parts = Object.fromEntries(
    PARTS_FORMAT.formatToParts(new Date(iso)).map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** UK offset from UTC, in minutes, at the given instant (0 in winter, 60 in summer). */
function londonOffsetMinutes(instant: Date): number {
  const name =
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, timeZoneName: "shortOffset" })
      .formatToParts(instant)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d+)(?::(\d+))?/.exec(name);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** "YYYY-MM-DDTHH:mm" read as UK time -> ISO UTC instant (null if invalid). */
export function londonLocalToIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return null;
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const offset = londonOffsetMinutes(new Date(asUtc));
  const result = new Date(asUtc - offset * 60_000);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}
