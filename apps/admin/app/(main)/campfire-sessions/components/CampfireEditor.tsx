"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictTimelineBlocksToHorizontalAxis } from "../lib/campfire-dnd-modifiers";
import {
  DEFAULT_COMPONENT_DURATION_MS,
  DEFAULT_ZOOM_PX_PER_SEC,
  findOverlappingIds,
  MIN_COMPONENT_DURATION_MS,
  pxDeltaToMs,
  pxToMs,
  sessionDurationFromComponents,
  snapMs,
  wouldOverlap,
} from "../lib/campfire-timeline";
import { ConfirmModal } from "@/components/ConfirmModal";
import { audioComponentHasFile } from "../lib/audio-component";
import type { FullEditorState } from "../lib/editor-draft";
import {
  getCampfireCaptains,
  LAYER_DB_TYPE_PLACEHOLDER,
  type ActivityOption,
  type ApprovedPhotoOption,
  type CampfireComponentRow,
  type CampfireComponentType,
  type CaptainOption,
} from "../types";
import { ComponentPalette } from "./ComponentPalette";
import { CampfirePreview } from "./CampfirePreview";
import { CampfireComponentEditModal } from "./CampfireComponentEditModal";
import { CampfireDetailsPanel } from "./CampfireDetailsPanel";
import { CampfireTimeline } from "./CampfireTimeline";
import type { PaletteDragPreviewState } from "./TimelineTrack";
import {
  TimelineResizeHandle,
  TIMELINE_DEFAULT_HEIGHT,
  TIMELINE_MIN_HEIGHT,
  WORKSPACE_MIN_HEIGHT,
  readStoredTimelineHeight,
  storeTimelineHeight,
} from "./TimelineResizeHandle";

export type CampfireEditorProps = {
  draft: FullEditorState;
  updateDraft: (updater: (prev: FullEditorState) => FullEditorState) => void;
  replaceDraft: (updater: (prev: FullEditorState) => FullEditorState) => void;
  nextTempId: () => number;
  activities: ActivityOption[];
  captains: CaptainOption[];
  approvedPhotos: ApprovedPhotoOption[];
};

export function CampfireEditor({
  draft,
  updateDraft,
  replaceDraft,
  nextTempId,
  activities,
  captains,
  approvedPhotos,
}: CampfireEditorProps) {
  const { session, tracks, components } = draft;
  const allCaptains = useMemo(() => getCampfireCaptains(captains), [captains]);
  const [editingComponentId, setEditingComponentId] = useState<number | null>(
    null
  );
  const skipNextBlockClickRef = useRef(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM_PX_PER_SEC);
  const [paletteDragPreview, setPaletteDragPreview] =
    useState<PaletteDragPreviewState | null>(null);
  const [deleteLayerConfirm, setDeleteLayerConfirm] = useState<{
    layerId: number;
    title: string;
    message: string;
  } | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const editorLayoutRef = useRef<HTMLDivElement>(null);
  const [timelineHeightPx, setTimelineHeightPx] = useState(
    TIMELINE_DEFAULT_HEIGHT
  );
  const timelineHeightRef = useRef(timelineHeightPx);
  timelineHeightRef.current = timelineHeightPx;
  const dragStartRef = useRef<{
    componentId: number;
    startTime: number;
    trackId: number;
  } | null>(null);
  const resizeRef = useRef<{
    componentId: number;
    edge: "left" | "right";
    startX: number;
    origStart: number;
    origDuration: number;
  } | null>(null);
  const interactionPushedRef = useRef(false);
  /** Live screen X during palette drags (dnd-kit delta includes scroll offset). */
  const palettePointerClientXRef = useRef(0);
  const palettePointerListenerRef = useRef<(() => void) | null>(null);
  const isPaletteDragRef = useRef(false);
  const pxPerSec = zoom;
  const durationMs = useMemo(
    () =>
      Math.max(
        session.duration ?? 0,
        sessionDurationFromComponents(components),
        60000
      ),
    [session.duration, components]
  );

  const editingComponent = useMemo(
    () => components.find((c) => c.id === editingComponentId) ?? null,
    [components, editingComponentId]
  );

  const overlappingIds = useMemo(
    () => findOverlappingIds(components),
    [components]
  );

  const openComponentEditor = useCallback((id: number) => {
    setEditingComponentId(id);
  }, []);

  const handleBlockSelect = useCallback(
    (id: number | null) => {
      if (id == null) return;
      if (skipNextBlockClickRef.current) {
        skipNextBlockClickRef.current = false;
        return;
      }
      openComponentEditor(id);
    },
    [openComponentEditor]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  useEffect(() => {
    const stored = readStoredTimelineHeight();
    if (stored != null) setTimelineHeightPx(stored);
  }, []);

  useEffect(() => {
    const el = editorLayoutRef.current;
    if (!el) return;

    const clampTimelineHeight = (desired: number) => {
      const total = el.clientHeight;
      const max = total - WORKSPACE_MIN_HEIGHT - 6;
      return Math.min(max, Math.max(TIMELINE_MIN_HEIGHT, desired));
    };

    const observer = new ResizeObserver(() => {
      setTimelineHeightPx((h) => clampTimelineHeight(h));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleTimelineResize = useCallback((clientY: number) => {
    const el = editorLayoutRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const height = rect.bottom - clientY;
    const max = el.clientHeight - WORKSPACE_MIN_HEIGHT - 6;
    const next = Math.min(max, Math.max(TIMELINE_MIN_HEIGHT, height));
    setTimelineHeightPx(next);
  }, []);

  const handleTimelineResizeEnd = useCallback(() => {
    storeTimelineHeight(timelineHeightRef.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      e.preventDefault();
      setIsPlaying((p) => !p);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      setCurrentTimeMs((t) => {
        const next = t + delta;
        if (next >= durationMs) {
          setIsPlaying(false);
          return durationMs;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, durationMs]);

  const getTimeFromPointer = useCallback(
    (clientX: number): number => {
      const timelineEl = timelineRef.current;
      if (!timelineEl) return 0;
      const x = clientX - timelineEl.getBoundingClientRect().left - 144;
      return snapMs(pxToMs(Math.max(0, x), pxPerSec));
    },
    [pxPerSec]
  );

  const stopPalettePointerTracking = () => {
    palettePointerListenerRef.current?.();
    palettePointerListenerRef.current = null;
    isPaletteDragRef.current = false;
  };

  const startPalettePointerTracking = (initialClientX: number) => {
    stopPalettePointerTracking();
    isPaletteDragRef.current = true;
    palettePointerClientXRef.current = initialClientX;
    const onPointerMove = (e: PointerEvent) => {
      palettePointerClientXRef.current = e.clientX;
    };
    window.addEventListener("pointermove", onPointerMove);
    palettePointerListenerRef.current = () => {
      window.removeEventListener("pointermove", onPointerMove);
    };
  };

  const handleDragStart = (event: DragStartEvent) => {
    interactionPushedRef.current = false;
    const data = event.active.data.current;
    if (data?.kind === "palette") {
      const type = data.componentType as CampfireComponentType;
      const trackId = tracks[0]?.id ?? 0;
      const initialClientX =
        event.activatorEvent && "clientX" in event.activatorEvent
          ? (event.activatorEvent as PointerEvent).clientX
          : 0;
      startPalettePointerTracking(initialClientX);
      const startTime = getTimeFromPointer(initialClientX);
      setPaletteDragPreview(buildPaletteDragPreview(type, trackId, startTime));
      return;
    }
    if (data?.kind === "block") {
      const comp = components.find((c) => c.id === data.componentId);
      if (comp) {
        dragStartRef.current = {
          componentId: comp.id,
          startTime: comp.start_time,
          trackId: comp.track_id,
        };
      }
    }
  };

  const buildPaletteDragPreview = useCallback(
    (
      type: CampfireComponentType,
      trackId: number,
      startTime: number
    ): PaletteDragPreviewState => {
      const candidate = {
        id: -1,
        start_time: startTime,
        duration: DEFAULT_COMPONENT_DURATION_MS,
      };
      const siblings = components.filter((c) => c.track_id === trackId);
      return {
        type,
        trackId,
        startTime,
        duration: DEFAULT_COMPONENT_DURATION_MS,
        hasOverlap: wouldOverlap(candidate, siblings),
      };
    },
    [components]
  );

  const updatePaletteDragPreview = useCallback(
    (event: DragMoveEvent | DragEndEvent) => {
      const activeData = event.active.data.current;
      if (activeData?.kind !== "palette") return;

      const type = activeData.componentType as CampfireComponentType;
      const startTime = getTimeFromPointer(palettePointerClientXRef.current);
      let trackId =
        paletteDragPreview?.trackId ?? tracks[0]?.id ?? 0;
      if (event.over?.data.current?.kind === "layer") {
        trackId = event.over.data.current.layerId as number;
      }

      setPaletteDragPreview(buildPaletteDragPreview(type, trackId, startTime));
    },
    [buildPaletteDragPreview, getTimeFromPointer, paletteDragPreview?.trackId, tracks]
  );

  const applyBlockDrag = useCallback(
    (
      event: { active: DragEndEvent["active"]; delta: { x: number; y: number }; over: DragEndEvent["over"] },
      draftFn: (updater: (prev: FullEditorState) => FullEditorState) => void
    ) => {
      const activeData = event.active.data.current;
      if (activeData?.kind !== "block" || !dragStartRef.current) return;

      const deltaMs = pxDeltaToMs(event.delta.x, pxPerSec);
      const newStart = snapMs(dragStartRef.current.startTime + deltaMs);
      let newTrackId = dragStartRef.current.trackId;

      if (event.over?.data.current?.kind === "layer") {
        newTrackId = event.over.data.current.layerId as number;
      }

      const compId = dragStartRef.current.componentId;
      draftFn((prev) => ({
        ...prev,
        components: prev.components.map((c) =>
          c.id === compId
            ? { ...c, start_time: newStart, track_id: newTrackId }
            : c
        ),
      }));
    },
    [pxPerSec]
  );

  const handleDragMove = (event: DragMoveEvent) => {
    const activeData = event.active.data.current;
    if (activeData?.kind === "palette") {
      updatePaletteDragPreview(event);
      return;
    }
    if (!interactionPushedRef.current) {
      applyBlockDrag(event, updateDraft);
      interactionPushedRef.current = true;
    } else {
      applyBlockDrag(event, replaceDraft);
    }
  };

  const clearPaletteDrag = () => {
    stopPalettePointerTracking();
    setPaletteDragPreview(null);
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    clearPaletteDrag();
    dragStartRef.current = null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    const activeData = active.data.current;

    if (activeData?.kind === "palette") {
      // Read drop position before clearPaletteDrag (it stops live-pointer tracking).
      const dropClientX = palettePointerClientXRef.current;
      if (over?.data.current?.kind === "layer") {
        const trackId = over.data.current.layerId as number;
        const type = activeData.componentType as CampfireComponentType;
        const startTime = getTimeFromPointer(dropClientX);
        const newId = nextTempId();

        const candidate = {
          id: newId,
          start_time: startTime,
          duration: DEFAULT_COMPONENT_DURATION_MS,
        };
        const siblings = components.filter((c) => c.track_id === trackId);
        if (wouldOverlap(candidate, siblings)) return;

        updateDraft((prev) => ({
          ...prev,
          components: [
            ...prev.components,
            {
              id: newId,
              session_id: prev.session.id,
              track_id: trackId,
              type,
              start_time: startTime,
              duration: DEFAULT_COMPONENT_DURATION_MS,
              data: {},
            },
          ],
        }));
        openComponentEditor(newId);
      }
      clearPaletteDrag();
      return;
    }

    if (activeData?.kind === "block" && dragStartRef.current) {
      const deltaMs = pxDeltaToMs(delta.x, pxPerSec);
      const newStart = snapMs(dragStartRef.current.startTime + deltaMs);
      let newTrackId = dragStartRef.current.trackId;
      if (over?.data.current?.kind === "layer") {
        newTrackId = over.data.current.layerId as number;
      }

      const compId = dragStartRef.current.componentId;
      const origStart = dragStartRef.current.startTime;
      const origTrackId = dragStartRef.current.trackId;

      const endDraftFn = interactionPushedRef.current ? replaceDraft : updateDraft;

      endDraftFn((prev) => {
        const comp = prev.components.find((c) => c.id === compId);
        if (!comp) return prev;

        const candidate = { id: compId, start_time: newStart, duration: comp.duration };
        const siblings = prev.components.filter(
          (c) => c.track_id === newTrackId && c.id !== compId
        );

        if (wouldOverlap(candidate, siblings)) {
          return {
            ...prev,
            components: prev.components.map((c) =>
              c.id === compId
                ? { ...c, start_time: origStart, track_id: origTrackId }
                : c
            ),
          };
        }

        return {
          ...prev,
          components: prev.components.map((c) =>
            c.id === compId
              ? { ...c, start_time: newStart, track_id: newTrackId }
              : c
          ),
        };
      });

      skipNextBlockClickRef.current = true;
      dragStartRef.current = null;
    }
  };

  const handleResizeStart = (
    componentId: number,
    edge: "left" | "right",
    e: React.PointerEvent
  ) => {
    const comp = components.find((c) => c.id === componentId);
    if (!comp || audioComponentHasFile(comp)) return;
    e.preventDefault();
    interactionPushedRef.current = false;
    resizeRef.current = {
      componentId,
      edge,
      startX: e.clientX,
      origStart: comp.start_time,
      origDuration: comp.duration,
    };

    const applyResize = (
      r: NonNullable<typeof resizeRef.current>,
      deltaMs: number,
      draftFn: (updater: (prev: FullEditorState) => FullEditorState) => void
    ) => {
      draftFn((prev) => ({
        ...prev,
        components: prev.components.map((c) => {
          if (c.id !== r.componentId) return c;
          if (r.edge === "right") {
            const dur = Math.max(
              MIN_COMPONENT_DURATION_MS,
              snapMs(r.origDuration + deltaMs)
            );
            return { ...c, duration: dur };
          }
          const newStart = snapMs(r.origStart + deltaMs);
          const end = r.origStart + r.origDuration;
          const dur = Math.max(MIN_COMPONENT_DURATION_MS, end - newStart);
          return { ...c, start_time: newStart, duration: dur };
        }),
      }));
    };

    const onMove = (ev: PointerEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const deltaPx = ev.clientX - r.startX;
      const deltaMs = pxDeltaToMs(deltaPx, pxPerSec);

      if (!interactionPushedRef.current) {
        applyResize(r, deltaMs, updateDraft);
        interactionPushedRef.current = true;
      } else {
        applyResize(r, deltaMs, replaceDraft);
      }
    };

    const onUp = () => {
      const r = resizeRef.current;
      if (r) {
        const revertFn = interactionPushedRef.current ? replaceDraft : updateDraft;
        revertFn((prev) => {
          const comp = prev.components.find((c) => c.id === r.componentId);
          if (!comp) return prev;
          const siblings = prev.components.filter(
            (c) => c.track_id === comp.track_id && c.id !== comp.id
          );
          if (wouldOverlap(comp, siblings)) {
            return {
              ...prev,
              components: prev.components.map((c) =>
                c.id === r.componentId
                  ? { ...c, start_time: r.origStart, duration: r.origDuration }
                  : c
              ),
            };
          }
          return prev;
        });
      }
      skipNextBlockClickRef.current = true;
      resizeRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleAddLayer = () => {
    updateDraft((prev) => {
      const position = prev.tracks.length;
      return {
        ...prev,
        tracks: [
          ...prev.tracks,
          {
            id: nextTempId(),
            session_id: prev.session.id,
            name: `Layer ${position + 1}`,
            type: LAYER_DB_TYPE_PLACEHOLDER,
            position,
          },
        ],
      };
    });
  };

  const handleDeleteLayer = (layerId: number) => {
    if (tracks.length <= 1) {
      alert("At least one layer is required");
      return;
    }
    const layer = tracks.find((t) => t.id === layerId);
    const componentCount = components.filter((c) => c.track_id === layerId)
      .length;
    const layerName = layer?.name ?? "this layer";
    setDeleteLayerConfirm({
      layerId,
      title: "Remove layer?",
      message:
        componentCount > 0
          ? `Remove "${layerName}" and its ${componentCount} component(s)? This cannot be undone.`
          : `Remove "${layerName}"? This cannot be undone.`,
    });
  };

  const confirmDeleteLayer = () => {
    if (!deleteLayerConfirm) return;
    const { layerId } = deleteLayerConfirm;
    setDeleteLayerConfirm(null);

    const removedComponentIds = new Set(
      components.filter((c) => c.track_id === layerId).map((c) => c.id)
    );
    updateDraft((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((t) => t.id !== layerId),
      components: prev.components.filter((c) => c.track_id !== layerId),
    }));
    setEditingComponentId((id) =>
      id != null && removedComponentIds.has(id) ? null : id
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      modifiers={[restrictTimelineBlocksToHorizontalAxis]}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        ref={editorLayoutRef}
        className="flex min-h-0 flex-1 flex-col overflow-hidden bg-stone-950"
      >
        <div
          className="flex min-h-0 flex-1 items-stretch overflow-hidden"
          style={{ minHeight: WORKSPACE_MIN_HEIGHT }}
        >
          <ComponentPalette onAddLayer={handleAddLayer} />

          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-x border-stone-700">
            <CampfirePreview
              currentTimeMs={currentTimeMs}
              isPlaying={isPlaying}
              tracks={tracks}
              components={components}
              activities={activities}
              captains={allCaptains}
              approvedPhotos={approvedPhotos}
            />
          </div>

          <CampfireDetailsPanel
            session={session}
            activities={activities}
            timelineDurationMs={sessionDurationFromComponents(components)}
            onSessionChange={(updates) => {
              updateDraft((prev) => ({
                ...prev,
                session: { ...prev.session, ...updates },
              }));
            }}
          />
        </div>

        <CampfireComponentEditModal
          open={editingComponentId != null}
          component={editingComponent}
          session={session}
          activities={activities}
          captains={allCaptains}
          approvedPhotos={approvedPhotos}
          onClose={() => setEditingComponentId(null)}
          onChange={(comp) => {
            updateDraft((prev) => ({
              ...prev,
              components: prev.components.map((c) =>
                c.id === comp.id ? comp : c
              ),
            }));
          }}
          onDelete={(id) => {
            updateDraft((prev) => ({
              ...prev,
              components: prev.components.filter((c) => c.id !== id),
            }));
            setEditingComponentId(null);
          }}
        />

        <TimelineResizeHandle
          onResize={handleTimelineResize}
          onResizeEnd={handleTimelineResizeEnd}
        />

        <div
          className="flex min-h-0 shrink-0 flex-col overflow-hidden"
          style={{ height: timelineHeightPx }}
        >
          <CampfireTimeline
            tracks={tracks}
            components={components}
            pxPerSec={pxPerSec}
            durationMs={durationMs}
            currentTimeMs={currentTimeMs}
            isPlaying={isPlaying}
            selectedComponentId={editingComponentId}
            overlappingIds={overlappingIds}
            paletteDragPreview={paletteDragPreview}
            onSelectComponent={handleBlockSelect}
            onPlayPause={() => setIsPlaying((p) => !p)}
            onSeek={setCurrentTimeMs}
            onZoomChange={setZoom}
            zoom={zoom}
            onResizeStart={handleResizeStart}
            onDeleteLayer={handleDeleteLayer}
            onTimelineClick={setCurrentTimeMs}
            timelineRef={timelineRef}
          />
        </div>
      </div>

      <ConfirmModal
        open={deleteLayerConfirm != null}
        onClose={() => setDeleteLayerConfirm(null)}
        onConfirm={confirmDeleteLayer}
        title={deleteLayerConfirm?.title ?? "Remove layer?"}
        message={deleteLayerConfirm?.message ?? ""}
        confirmLabel="Remove"
        variant="danger"
      />

    </DndContext>
  );
}
