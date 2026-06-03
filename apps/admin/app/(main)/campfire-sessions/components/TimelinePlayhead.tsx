"use client";

import { useCallback } from "react";
import { pxToMs, snapMs } from "../lib/campfire-timeline";

const LABEL_COLUMN_PX = 144;

type Props = {
  leftPx: number;
  pxPerSec: number;
  durationMs: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onSeek: (ms: number) => void;
};

function timeMsFromClientX(
  clientX: number,
  scrollEl: HTMLElement,
  pxPerSec: number,
  durationMs: number
): number {
  const rect = scrollEl.getBoundingClientRect();
  const x = clientX - rect.left + scrollEl.scrollLeft - LABEL_COLUMN_PX;
  const ms = pxToMs(Math.max(0, x), pxPerSec);
  return Math.min(durationMs, Math.max(0, snapMs(ms)));
}

export function TimelinePlayhead({
  leftPx,
  pxPerSec,
  durationMs,
  scrollRef,
  onSeek,
}: Props) {
  const handleScrubStart = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const scrollEl = scrollRef.current;
      if (!scrollEl) return;

      const seek = (clientX: number) => {
        onSeek(timeMsFromClientX(clientX, scrollEl, pxPerSec, durationMs));
      };

      seek(e.clientX);

      const onMove = (ev: PointerEvent) => seek(ev.clientX);
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [scrollRef, pxPerSec, durationMs, onSeek]
  );

  return (
    <div
      className="absolute top-0 bottom-0 z-30 w-0"
      style={{ left: LABEL_COLUMN_PX + leftPx }}
      aria-hidden
    >
      <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-0.5 -translate-x-1/2 bg-red-500" />

      <button
        type="button"
        className="absolute left-0 top-0 z-40 flex -translate-x-1/2 cursor-ew-resize touch-none flex-col items-center border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-red-400/80"
        style={{ marginTop: -2 }}
        onPointerDown={handleScrubStart}
        onClick={(e) => e.stopPropagation()}
        aria-label="Drag playhead"
        title="Drag to scrub"
      >
        <span className="block h-0 w-0 border-x-[7px] border-b-[9px] border-x-transparent border-b-red-500 drop-shadow-sm" />
        <span className="mt-0.5 block h-2 w-1 rounded-full bg-red-500" />
      </button>
    </div>
  );
}
