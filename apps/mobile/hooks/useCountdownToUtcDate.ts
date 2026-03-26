import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

type UseCountdownToUtcDateOptions = {
  onComplete?: () => void | Promise<void>;
};

function parseUtcMidnightMs(targetDate: string): number | null {
  // `chapters.unlock_date` is stored as a `date` (YYYY-MM-DD).
  // Your app’s unlock comparisons are UTC-date based, so align countdown to UTC midnight.
  const ms = Date.parse(`${targetDate}T00:00:00.000Z`);
  return Number.isNaN(ms) ? null : ms;
}

function formatRemainingShort(remainingMs: number): string {
  if (remainingMs <= 0) return "Unlocking…";

  const msPerHour = 60 * 60 * 1000;
  const msPerDay = 24 * msPerHour;

  const days = Math.floor(remainingMs / msPerDay);
  const hours = Math.floor((remainingMs % msPerDay) / msPerHour);

  if (days <= 0) {
    if (hours <= 0) return "<1h";
    return `${hours}h`;
  }

  if (hours <= 0) return `${days}d`;
  return `${days}d ${hours}h`;
}

export function useCountdownToUtcDate(targetDate: string | null, options?: UseCountdownToUtcDateOptions) {
  const onComplete = options?.onComplete;
  const hasCompletedRef = useRef(false);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetMs = useMemo(() => {
    if (!targetDate) return null;
    return parseUtcMidnightMs(targetDate);
  }, [targetDate]);

  const [remainingMs, setRemainingMs] = useState<number | null>(() => {
    if (targetMs == null) return null;
    return Math.max(0, targetMs - Date.now());
  });

  useEffect(() => {
    hasCompletedRef.current = false;

    if (targetMs == null) {
      setRemainingMs(null);
      return;
    }

    setRemainingMs(Math.max(0, targetMs - Date.now()));
  }, [targetMs]);

  useFocusEffect(
    useCallback(() => {
      if (targetMs == null) return undefined;
      if (hasCompletedRef.current) return undefined;

      const tick = () => {
        if (targetMs == null) return;

        const now = Date.now();
        const nextRemaining = targetMs - now;
        if (nextRemaining <= 0) {
          setRemainingMs(0);
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            if (onComplete) {
              // Avoid unhandled promise rejections if the caller returns a promise.
              void onComplete();
            }
          }
          if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
          }
          return;
        }

        setRemainingMs(nextRemaining);
      };

      tick();
      intervalIdRef.current = setInterval(tick, 30_000);

      return () => {
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
      };
    }, [targetMs, onComplete])
  );

  const label = remainingMs == null ? null : formatRemainingShort(remainingMs);

  return { remainingMs, label };
}

