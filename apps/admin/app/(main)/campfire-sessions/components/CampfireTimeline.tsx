"use client";

import { useCallback, useRef } from "react";
import type { CampfireComponentRow, CampfireTrackRow } from "../types";
import { msToPx, pxToMs } from "../lib/campfire-timeline";
import { TimelinePlayhead } from "./TimelinePlayhead";
import { TimelineTrack, type PaletteDragPreviewState } from "./TimelineTrack";
import { TransportControls } from "./TransportControls";

type Props = {
  tracks: CampfireTrackRow[];
  components: CampfireComponentRow[];
  pxPerSec: number;
  durationMs: number;
  currentTimeMs: number;
  isPlaying: boolean;
  selectedComponentId: number | null;
  overlappingIds: Set<number>;
  paletteDragPreview: PaletteDragPreviewState | null;
  onSelectComponent: (id: number | null) => void;
  onPlayPause: () => void;
  onSeek: (ms: number) => void;
  onZoomChange: (zoom: number) => void;
  zoom: number;
  onResizeStart: (
    componentId: number,
    edge: "left" | "right",
    e: React.PointerEvent
  ) => void;
  onDeleteLayer: (layerId: number) => void;
  onTimelineClick: (ms: number) => void;
  timelineRef: React.RefObject<HTMLDivElement | null>;
};

export function CampfireTimeline({
  tracks,
  components,
  pxPerSec,
  durationMs,
  currentTimeMs,
  isPlaying,
  selectedComponentId,
  overlappingIds,
  paletteDragPreview,
  onSelectComponent,
  onPlayPause,
  onSeek,
  onZoomChange,
  zoom,
  onResizeStart,
  onDeleteLayer,
  onTimelineClick,
  timelineRef,
}: Props) {
  const canDeleteLayer = tracks.length > 1;
  const scrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const syncingScroll = useRef(false);

  const timelineWidthPx = msToPx(Math.max(durationMs, 60000), pxPerSec);
  const scrollContentWidth = timelineWidthPx + 144;
  const playheadLeft = msToPx(currentTimeMs, pxPerSec);

  const syncScrollLeft = useCallback((source: "top" | "body", scrollLeft: number) => {
    if (syncingScroll.current) return;
    syncingScroll.current = true;
    if (source === "top" && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft;
    }
    if (source === "body" && topScrollRef.current) {
      topScrollRef.current.scrollLeft = scrollLeft;
    }
    syncingScroll.current = false;
  }, []);

  const handleTopScroll = () => {
    if (!topScrollRef.current) return;
    syncScrollLeft("top", topScrollRef.current.scrollLeft);
  };

  const handleBodyScroll = () => {
    if (!scrollRef.current) return;
    syncScrollLeft("body", scrollRef.current.scrollLeft);
  };

  const handleBodyWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const dx = e.shiftKey ? e.deltaY || e.deltaX : e.deltaX;
    if (Math.abs(dx) < 1) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft += dx;
    syncScrollLeft("body", el.scrollLeft);
  };

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollLeft = el.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft - 144;
    if (x >= 0) onTimelineClick(pxToMs(x, pxPerSec));
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-stone-950">
      <TransportControls
        currentTimeMs={currentTimeMs}
        durationMs={durationMs}
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        onSeek={onSeek}
        zoom={zoom}
        onZoomChange={onZoomChange}
      />

      {/* Horizontal scrollbar above the timeline grid */}
      <div
        ref={topScrollRef}
        className="timeline-h-scroll shrink-0 border-b border-stone-700 bg-stone-900"
        onScroll={handleTopScroll}
        aria-label="Timeline horizontal scroll"
      >
        <div style={{ width: scrollContentWidth, height: 1 }} />
      </div>

      <div
        ref={scrollRef}
        className="timeline-body-scroll min-h-0 flex-1 bg-stone-950"
        onScroll={handleBodyScroll}
        onWheel={handleBodyWheel}
        onClick={() => onSelectComponent(null)}
      >
        <div
          ref={timelineRef}
          style={{ width: scrollContentWidth }}
          className="relative"
        >
          <div
            className="sticky top-0 z-10 flex border-b border-stone-700 bg-stone-800"
            onClick={handleRulerClick}
          >
            <div className="sticky left-0 z-20 w-36 shrink-0 border-r border-stone-700 bg-stone-800 px-2 py-1 text-[10px] font-medium text-stone-400">
              Layers
            </div>
            <div
              className="relative h-6 flex-1 cursor-pointer"
              style={{ width: timelineWidthPx }}
            >
              {Array.from({ length: Math.ceil(durationMs / 5000) + 2 }).map(
                (_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-stone-600/50 text-[9px] text-stone-500"
                    style={{ left: msToPx(i * 5000, pxPerSec) }}
                  >
                    <span className="ml-0.5">{i * 5}s</span>
                  </div>
                )
              )}
            </div>
          </div>

          <TimelinePlayhead
            leftPx={playheadLeft}
            pxPerSec={pxPerSec}
            durationMs={durationMs}
            scrollRef={scrollRef}
            onSeek={onSeek}
          />

          <div className="relative">
            {tracks.map((track) => (
              <TimelineTrack
                key={track.id}
                track={track}
                components={components}
                pxPerSec={pxPerSec}
                timelineWidthPx={timelineWidthPx}
                selectedComponentId={selectedComponentId}
                overlappingIds={overlappingIds}
                paletteDragPreview={paletteDragPreview}
                canDelete={canDeleteLayer}
                onSelectComponent={onSelectComponent}
                onDeleteLayer={onDeleteLayer}
                onResizeStart={onResizeStart}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
