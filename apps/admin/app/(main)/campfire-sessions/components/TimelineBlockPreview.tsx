"use client";

import { COMPONENT_BLOCK_CLASSES } from "../lib/component-styles";
import { msToPx } from "../lib/campfire-timeline";
import { COMPONENT_TYPE_LABELS, type CampfireComponentType } from "../types";

type Props = {
  type: CampfireComponentType;
  startTimeMs: number;
  durationMs: number;
  pxPerSec: number;
  hasOverlap?: boolean;
};

export function TimelineBlockPreview({
  type,
  startTimeMs,
  durationMs,
  pxPerSec,
  hasOverlap = false,
}: Props) {
  const left = msToPx(startTimeMs, pxPerSec);
  const width = Math.max(msToPx(durationMs, pxPerSec), 24);
  const color = hasOverlap
    ? "border-red-400/90 bg-red-600/50"
    : COMPONENT_BLOCK_CLASSES[type] ?? "border-stone-500 bg-stone-600";
  const label = COMPONENT_TYPE_LABELS[type] ?? type;

  return (
    <div
      style={{ left, width }}
      className={`pointer-events-none absolute top-1 bottom-1 z-20 flex items-center overflow-hidden rounded border border-dashed px-1 text-[10px] font-medium text-white opacity-90 shadow-md ${color} ${
        hasOverlap
          ? "ring-2 ring-red-400/80 ring-offset-1 ring-offset-stone-800"
          : "ring-2 ring-white/50 ring-offset-1 ring-offset-stone-800"
      }`}
      aria-hidden
    >
      <span className="relative truncate px-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
        {label}
      </span>
    </div>
  );
}
