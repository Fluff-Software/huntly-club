import { useEffect, useState } from "react";
import {
  getActiveExploreEvents,
  type ExploreEventWindow,
} from "@/services/exploreEventService";

/** Longest a single timer may wait (setTimeout overflows past ~24.8 days). */
const MAX_TIMEOUT_MS = 2_147_000_000;

/**
 * True while the named Explore event's window is open. Flips on its own at the
 * start and end of the window, so no refetch is needed when the event rolls over.
 */
export function useExploreEventLive(slug: string): boolean {
  const [event, setEvent] = useState<ExploreEventWindow | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    getActiveExploreEvents()
      .then((events) => {
        if (!cancelled) setEvent(events.find((e) => e.slug === slug) ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!event) return;
    const t = Date.now();
    const boundary = [event.startsAt.getTime(), event.endsAt.getTime()].find((b) => b > t);
    if (boundary === undefined) return;
    const id = setTimeout(
      () => setNow(Date.now()),
      Math.min(boundary - t + 250, MAX_TIMEOUT_MS)
    );
    return () => clearTimeout(id);
  }, [event, now]);

  return !!event && now >= event.startsAt.getTime() && now < event.endsAt.getTime();
}
