"use client";

import { formatTimeMs, SNAP_MS } from "../lib/campfire-timeline";

type Props = {
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (ms: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
};

export function TransportControls({
  currentTimeMs,
  durationMs,
  isPlaying,
  onPlayPause,
  onSeek,
  zoom,
  onZoomChange,
}: Props) {
  const maxMs = Math.max(durationMs, 1000);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-stone-700 bg-stone-900 px-3 py-2">
      <button
        type="button"
        onClick={onPlayPause}
        className="flex size-8 items-center justify-center rounded-lg bg-huntly-leaf text-huntly-cream hover:bg-huntly-sage"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        )}
      </button>
      <span className="min-w-[4.5rem] font-mono text-xs text-stone-300">
        {formatTimeMs(currentTimeMs)} / {formatTimeMs(maxMs)}
      </span>
      <input
        type="range"
        min={0}
        max={maxMs}
        step={SNAP_MS}
        value={currentTimeMs}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="min-w-[120px] flex-1 accent-huntly-sage"
      />
      <label className="flex items-center gap-2 text-xs text-stone-400">
        Zoom
        <input
          type="range"
          min={40}
          max={200}
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="w-20 accent-huntly-sage"
        />
      </label>
    </div>
  );
}
