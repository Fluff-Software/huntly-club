"use client";

import { useDroppable } from "@dnd-kit/core";
import type { CampfireComponentRow, CampfireTrackRow } from "../types";
import type { CampfireComponentType } from "../types";
import { audioComponentHasFile } from "../lib/audio-component";
import { TimelineBlock } from "./TimelineBlock";
import { TimelineBlockPreview } from "./TimelineBlockPreview";

export type PaletteDragPreviewState = {
  type: CampfireComponentType;
  trackId: number;
  startTime: number;
  duration: number;
  hasOverlap: boolean;
};

type Props = {
  track: CampfireTrackRow;
  components: CampfireComponentRow[];
  pxPerSec: number;
  timelineWidthPx: number;
  selectedComponentId: number | null;
  overlappingIds: Set<number>;
  paletteDragPreview: PaletteDragPreviewState | null;
  canDelete: boolean;
  onSelectComponent: (id: number) => void;
  onDeleteLayer: (layerId: number) => void;
  onResizeStart: (
    componentId: number,
    edge: "left" | "right",
    e: React.PointerEvent
  ) => void;
};

export function TimelineTrack({
  track,
  components,
  pxPerSec,
  timelineWidthPx,
  selectedComponentId,
  overlappingIds,
  paletteDragPreview,
  canDelete,
  onSelectComponent,
  onDeleteLayer,
  onResizeStart,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `layer-${track.id}`,
    data: { kind: "layer", layerId: track.id },
  });

  const trackComponents = components.filter((c) => c.track_id === track.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex border-b border-stone-700/80 ${isOver ? "bg-stone-800/80" : ""}`}
    >
      <div className="sticky left-0 z-10 flex w-36 shrink-0 items-center gap-1 border-r border-stone-700 bg-stone-800 px-2 py-2">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-300">
          {track.name}
        </span>
        {canDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteLayer(track.id);
            }}
            className="shrink-0 rounded p-0.5 text-stone-500 hover:bg-stone-700 hover:text-red-400"
            aria-label={`Remove ${track.name}`}
            title="Remove layer"
          >
            <svg
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      <div
        className={`relative h-12 flex-1 ${isOver ? "bg-stone-800/60 ring-1 ring-inset ring-stone-600" : "bg-stone-900/50"}`}
        style={{ width: timelineWidthPx, minWidth: timelineWidthPx }}
      >
        {trackComponents.map((comp) => (
          <TimelineBlock
            key={comp.id}
            component={comp}
            pxPerSec={pxPerSec}
            selected={selectedComponentId === comp.id}
            resizeDisabled={audioComponentHasFile(comp)}
            hasOverlap={overlappingIds.has(comp.id)}
            onSelect={() => onSelectComponent(comp.id)}
            onResizeStart={(edge, e) => onResizeStart(comp.id, edge, e)}
          />
        ))}
        {paletteDragPreview?.trackId === track.id ? (
          <TimelineBlockPreview
            type={paletteDragPreview.type}
            startTimeMs={paletteDragPreview.startTime}
            durationMs={paletteDragPreview.duration}
            pxPerSec={pxPerSec}
            hasOverlap={paletteDragPreview.hasOverlap}
          />
        ) : null}
      </div>
    </div>
  );
}
