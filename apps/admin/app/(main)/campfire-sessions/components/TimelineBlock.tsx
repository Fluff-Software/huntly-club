"use client";

import { useEffect, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useWaveformPeaks } from "../lib/audio-waveform";
import { COMPONENT_BLOCK_CLASSES } from "../lib/component-styles";
import { COMPONENT_TYPE_LABELS, type CampfireComponentRow } from "../types";
import { msToPx } from "../lib/campfire-timeline";

type Props = {
  component: CampfireComponentRow;
  pxPerSec: number;
  selected: boolean;
  resizeDisabled?: boolean;
  hasOverlap?: boolean;
  onSelect: () => void;
  onResizeStart: (edge: "left" | "right", e: React.PointerEvent) => void;
};

function WaveformOverlay({ peaks }: { peaks: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || peaks.length === 0) return;

    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    const mid = h / 2;
    const step = w / peaks.length;

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.moveTo(0, mid);
    for (let i = 0; i < peaks.length; i++) {
      const amp = peaks[i] * mid * 0.9;
      ctx.lineTo(i * step, mid - amp);
    }
    ctx.lineTo(w, mid);
    for (let i = peaks.length - 1; i >= 0; i--) {
      const amp = peaks[i] * mid * 0.9;
      ctx.lineTo(i * step, mid + amp);
    }
    ctx.closePath();
    ctx.fill();
  }, [peaks]);

  return (
    <canvas
      ref={ref}
      width={600}
      height={48}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

export function TimelineBlock({
  component,
  pxPerSec,
  selected,
  resizeDisabled = false,
  hasOverlap = false,
  onSelect,
  onResizeStart,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `block-${component.id}`,
      data: {
        kind: "block",
        componentId: component.id,
        trackId: component.track_id,
      },
    });

  const audioUrl =
    component.type === "audio"
      ? (component.data as { audioUrl?: string }).audioUrl
      : undefined;
  const waveformPeaks = useWaveformPeaks(audioUrl);

  const left = msToPx(component.start_time, pxPerSec);
  const width = Math.max(msToPx(component.duration, pxPerSec), 24);
  const color = hasOverlap
    ? "border-red-400 bg-red-600/80"
    : COMPONENT_BLOCK_CLASSES[component.type] ?? "border-stone-500 bg-stone-600";

  const style: React.CSSProperties = {
    left,
    width,
    transform: isDragging ? undefined : CSS.Translate.toString(transform),
    zIndex: isDragging ? 30 : selected ? 10 : 1,
  };

  const label = (() => {
    if (
      component.type === "subtitle" &&
      typeof (component.data as { text?: string }).text === "string" &&
      (component.data as { text: string }).text
    ) {
      return ((component.data as { text: string }).text || "").slice(0, 24);
    }
    if (component.type === "captain") {
      const slug = (component.data as { captainSlug?: string }).captainSlug;
      if (slug) return slug.charAt(0).toUpperCase() + slug.slice(1);
    }
    return COMPONENT_TYPE_LABELS[component.type] ?? component.type;
  })();

  const ringClass = hasOverlap
    ? "ring-2 ring-red-400 ring-offset-1 ring-offset-stone-800"
    : selected
      ? "ring-2 ring-white ring-offset-1 ring-offset-stone-800"
      : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`absolute top-1 bottom-1 flex cursor-grab items-center overflow-hidden rounded border px-1 text-[10px] font-medium text-white shadow-sm active:cursor-grabbing ${color} ${ringClass} ${isDragging ? "cursor-grabbing shadow-lg ring-2 ring-white/80" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      {...listeners}
      {...attributes}
    >
      {!resizeDisabled && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onResizeStart("left", e);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {waveformPeaks && <WaveformOverlay peaks={waveformPeaks} />}
      {hasOverlap && (
        <svg
          className="relative mr-0.5 size-3 shrink-0 text-red-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      )}
      <span className="relative truncate px-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
        {label}
      </span>
      {!resizeDisabled && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onResizeStart("right", e);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
