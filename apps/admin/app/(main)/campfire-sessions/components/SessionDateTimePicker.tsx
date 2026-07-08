"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TIME_ZONE = "Europe/London";

type Props = {
  value: string | null;
  onChange: (iso: string | null) => void;
  className?: string;
  id?: string;
};

type WallParts = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function partsInTimeZone(date: Date, timeZone: string): WallParts {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function getTimeZoneOffsetMs(timeZone: string, instantUtcMs: number): number {
  // Returns: (local wall time in tz) - (UTC), in ms, at the given instant.
  const date = new Date(instantUtcMs);
  const parts = partsInTimeZone(date, timeZone);
  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    0,
    0
  );
  return asIfUtc - instantUtcMs;
}

function londonWallToUtcIso(wall: WallParts): string {
  // Convert a Europe/London wall time into an ISO UTC instant.
  // Handles DST by iterating once to settle the offset.
  const guessUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    0,
    0
  );
  const off1 = getTimeZoneOffsetMs(TIME_ZONE, guessUtc);
  const utc1 = guessUtc - off1;
  const off2 = getTimeZoneOffsetMs(TIME_ZONE, utc1);
  const utc2 = guessUtc - off2;
  return new Date(utc2).toISOString();
}

function formatLondonSummary(iso: string | null): string {
  if (!iso) return "Not scheduled";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startOfMonthUtcFromLondon(year: number, month: number): number {
  return Date.UTC(year, month - 1, 1, 12, 0, 0, 0);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekdayMonFirstFromUtcMs(utcMs: number): number {
  // Monday=0 .. Sunday=6 (based on UTC day for stable calendar grid)
  const dow = new Date(utcMs).getUTCDay(); // Sun=0..Sat=6
  return (dow + 6) % 7;
}

export function SessionDateTimePicker({ value, onChange, className, id }: Props) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const initialWall = useMemo<WallParts>(() => {
    if (value) return partsInTimeZone(new Date(value), TIME_ZONE);
    const now = partsInTimeZone(new Date(), TIME_ZONE);
    return now;
  }, [value]);

  const [draft, setDraft] = useState<WallParts>(initialWall);
  const [monthCursor, setMonthCursor] = useState<{ year: number; month: number }>(
    () => ({ year: initialWall.year, month: initialWall.month })
  );

  useEffect(() => {
    if (!open) return;
    setDraft(initialWall);
    setMonthCursor({ year: initialWall.year, month: initialWall.month });
  }, [open, initialWall]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (popoverRef.current?.contains(t)) return;
      if (buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const monthStartUtc = startOfMonthUtcFromLondon(monthCursor.year, monthCursor.month);
  const firstWeekday = weekdayMonFirstFromUtcMs(monthStartUtc);
  const dim = daysInMonth(monthCursor.year, monthCursor.month);

  const title = useMemo(() => {
    const d = new Date(Date.UTC(monthCursor.year, monthCursor.month - 1, 1, 12, 0, 0, 0));
    return d.toLocaleString("en-GB", { month: "long", year: "numeric" });
  }, [monthCursor]);

  const isSameMonthAsCursor =
    draft.year === monthCursor.year && draft.month === monthCursor.month;

  function applyDraft(next: WallParts) {
    setDraft(next);
    onChange(londonWallToUtcIso(next));
    setOpen(false);
    buttonRef.current?.focus();
  }

  const ampm: "AM" | "PM" = draft.hour >= 12 ? "PM" : "AM";
  const hour12 = ((draft.hour + 11) % 12) + 1; // 1..12

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          className ??
          "w-full rounded-lg border border-stone-600/80 bg-stone-950/60 px-3 py-2 text-left text-sm text-stone-100 placeholder:text-stone-600 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/25"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="truncate">{formatLondonSummary(value)}</span>
          <svg
            className="size-4 shrink-0 text-stone-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 9.75 12 13.5l3.75-3.75"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute left-0 right-0 top-full z-[60] mt-2 w-full overflow-hidden rounded-xl border border-stone-700 bg-stone-900 shadow-2xl"
          role="dialog"
          aria-label="Schedule session"
        >
          <div className="flex items-center justify-between border-b border-stone-800 px-3 py-2">
            <button
              type="button"
              onClick={() => {
                const m = monthCursor.month === 1 ? 12 : monthCursor.month - 1;
                const y = monthCursor.month === 1 ? monthCursor.year - 1 : monthCursor.year;
                setMonthCursor({ year: y, month: m });
              }}
              className="rounded-lg px-2 py-1 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
              aria-label="Previous month"
            >
              ‹
            </button>
            <div className="text-xs font-semibold text-stone-200">{title}</div>
            <button
              type="button"
              onClick={() => {
                const m = monthCursor.month === 12 ? 1 : monthCursor.month + 1;
                const y = monthCursor.month === 12 ? monthCursor.year + 1 : monthCursor.year;
                setMonthCursor({ year: y, month: m });
              }}
              className="rounded-lg px-2 py-1 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="picker-scroll max-h-[320px] overflow-y-auto px-3 py-2">
            <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="px-1 py-1 text-center">
                  {d}
                </div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {Array.from({ length: dim }).map((_, i) => {
                const day = i + 1;
                const selected = isSameMonthAsCursor && draft.day === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        year: monthCursor.year,
                        month: monthCursor.month,
                        day,
                      }))
                    }
                    className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? "bg-huntly-forest/25 text-stone-100 ring-1 ring-inset ring-huntly-sage/40"
                        : "text-stone-300 hover:bg-stone-800/70"
                    }`}
                    aria-pressed={selected}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 rounded-lg border border-stone-700 bg-stone-950/40 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-stone-400">Time</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-stone-700 bg-stone-900 px-2 py-1">
                    <input
                      inputMode="numeric"
                      value={String(hour12)}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) return;
                        const clamped = Math.min(12, Math.max(1, Math.floor(n)));
                        setDraft((p) => {
                          const nextHour =
                            p.hour >= 12 ? (clamped % 12) + 12 : clamped % 12;
                          return { ...p, hour: nextHour };
                        });
                      }}
                      className="w-8 bg-transparent text-right text-xs font-medium tabular-nums text-stone-100 focus:outline-none"
                      aria-label="Hour"
                    />
                    <span className="px-1 text-xs text-stone-500">:</span>
                    <input
                      inputMode="numeric"
                      value={pad2(draft.minute)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "");
                        const n = Number(raw);
                        if (!Number.isFinite(n)) return;
                        const clamped = Math.min(59, Math.max(0, Math.floor(n)));
                        setDraft((p) => ({ ...p, minute: clamped }));
                      }}
                      className="w-9 bg-transparent text-xs font-medium tabular-nums text-stone-100 focus:outline-none"
                      aria-label="Minute"
                    />
                  </div>

                  <div
                    className="flex overflow-hidden rounded-lg border border-stone-700 bg-stone-900"
                    role="radiogroup"
                    aria-label="AM/PM"
                  >
                    {(["AM", "PM"] as const).map((v) => {
                      const selected = ampm === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => {
                            setDraft((p) => {
                              const isPm = v === "PM";
                              const nextHour =
                                isPm && p.hour < 12
                                  ? p.hour + 12
                                  : !isPm && p.hour >= 12
                                    ? p.hour - 12
                                    : p.hour;
                              return { ...p, hour: nextHour };
                            });
                          }}
                          className={`px-2 py-1 text-[11px] font-semibold transition-colors ${
                            selected
                              ? "bg-stone-800 text-stone-100"
                              : "text-stone-400 hover:bg-stone-800/60 hover:text-stone-200"
                          }`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <p className="mt-1 text-[10px] text-stone-600">
                Use 12-hour time.
              </p>
            </div>
          </div>

          <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-stone-800 bg-stone-900/95 px-3 py-2 backdrop-blur">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
                buttonRef.current?.focus();
              }}
              className="rounded-lg px-3 py-2 text-xs font-medium text-stone-400 hover:bg-stone-800/70 hover:text-stone-200"
            >
              Clear
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const now = partsInTimeZone(new Date(), TIME_ZONE);
                  setDraft(now);
                  setMonthCursor({ year: now.year, month: now.month });
                }}
                className="rounded-lg border border-stone-700 bg-stone-950/40 px-3 py-2 text-xs font-medium text-stone-200 hover:bg-stone-800/60"
              >
                Now
              </button>
              <button
                type="button"
                onClick={() => applyDraft(draft)}
                className="rounded-lg bg-huntly-forest px-3 py-2 text-xs font-medium text-huntly-cream hover:bg-huntly-leaf"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

