"use client";

const TIMELINE_HEIGHT_KEY = "campfire-editor-timeline-height";
export const TIMELINE_MIN_HEIGHT = 140;
export const WORKSPACE_MIN_HEIGHT = 180;
export const TIMELINE_DEFAULT_HEIGHT = 280;
const RESIZE_HANDLE_HEIGHT = 6;

export function readStoredTimelineHeight(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TIMELINE_HEIGHT_KEY);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= TIMELINE_MIN_HEIGHT ? n : null;
}

export function storeTimelineHeight(px: number) {
  try {
    localStorage.setItem(TIMELINE_HEIGHT_KEY, String(Math.round(px)));
  } catch {
    /* ignore */
  }
}

type Props = {
  onResize: (clientY: number) => void;
  onResizeEnd: () => void;
};

export function TimelineResizeHandle({ onResize, onResizeEnd }: Props) {
  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      onResize(ev.clientY);
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      onResizeEnd();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize timeline panel"
      className="group relative z-20 flex h-1.5 shrink-0 cursor-ns-resize items-center justify-center border-y border-stone-700 bg-stone-800 hover:bg-stone-700"
      style={{ height: RESIZE_HANDLE_HEIGHT }}
      onPointerDown={startDrag}
    >
      <div className="h-0.5 w-12 rounded-full bg-stone-500 transition-colors group-hover:bg-stone-400 group-active:bg-huntly-sage" />
    </div>
  );
}
