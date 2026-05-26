"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { formatTimeMs, SNAP_MS } from "../lib/campfire-timeline";
import { DEFAULT_ZOOM_PX_PER_SEC } from "../lib/campfire-timeline";

const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300];

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
      <ZoomControl zoom={zoom} onZoomChange={onZoomChange} />
    </div>
  );
}

function toPercent(pxPerSec: number) {
  return Math.round((pxPerSec / DEFAULT_ZOOM_PX_PER_SEC) * 100);
}
function fromPercent(pct: number) {
  return Math.max(10, Math.round((pct / 100) * DEFAULT_ZOOM_PX_PER_SEC));
}

function ZoomControl({
  zoom,
  onZoomChange,
}: {
  zoom: number;
  onZoomChange: (z: number) => void;
}) {
  const [draft, setDraft] = useState(String(toPercent(zoom)));
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setDraft(String(toPercent(zoom)));
  }, [zoom]);

  const updateMenuPos = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.top, left: rect.right });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPos();
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapperRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, updateMenuPos]);

  const commit = (val: string) => {
    const n = parseInt(val, 10);
    if (!Number.isNaN(n) && n > 0) {
      const clamped = Math.min(400, Math.max(10, n));
      onZoomChange(fromPercent(clamped));
    } else {
      setDraft(String(toPercent(zoom)));
    }
  };

  const currentPct = toPercent(zoom);

  return (
    <div ref={wrapperRef} className="relative flex items-center text-xs">
      <button
        type="button"
        onClick={() => {
          const idx = ZOOM_PRESETS.findIndex((p) => p >= currentPct);
          const prev = idx > 0 ? ZOOM_PRESETS[idx - 1] : ZOOM_PRESETS[0];
          onZoomChange(fromPercent(prev));
        }}
        className="flex size-6 items-center justify-center rounded-l-md border border-stone-600 bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200 disabled:opacity-30"
        disabled={currentPct <= ZOOM_PRESETS[0]}
        aria-label="Zoom out"
      >
        <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M5 12h14" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-6 items-center gap-1 border-y border-stone-600 bg-stone-800 px-2 text-stone-300 hover:bg-stone-700 hover:text-stone-100"
      >
        <input
          type="text"
          value={draft}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit(draft);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-7 bg-transparent text-center text-xs text-stone-200 outline-none"
        />
        <span className="text-stone-500">%</span>
        <svg className="size-2.5 text-stone-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => {
          const idx = ZOOM_PRESETS.findIndex((p) => p > currentPct);
          const next = idx >= 0 ? ZOOM_PRESETS[idx] : ZOOM_PRESETS[ZOOM_PRESETS.length - 1];
          onZoomChange(fromPercent(next));
        }}
        className="flex size-6 items-center justify-center rounded-r-md border border-stone-600 bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200 disabled:opacity-30"
        disabled={currentPct >= ZOOM_PRESETS[ZOOM_PRESETS.length - 1]}
        aria-label="Zoom in"
      >
        <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[999] min-w-[5rem] overflow-hidden rounded-md border border-stone-600 bg-stone-800 py-0.5 shadow-xl"
          style={{ top: menuPos.top, left: menuPos.left, transform: "translate(-100%, -100%) translateY(-4px)" }}
        >
          {ZOOM_PRESETS.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => {
                onZoomChange(fromPercent(pct));
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-xs hover:bg-stone-700 ${
                currentPct === pct
                  ? "bg-stone-700/50 font-medium text-huntly-sage"
                  : "text-stone-300"
              }`}
            >
              <span>{pct}%</span>
              {currentPct === pct && (
                <svg className="size-3 text-huntly-sage" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
