/** Timeline snap grid: 0.1 second steps. */
export const SNAP_MS = 100;
export const SNAP_SEC = SNAP_MS / 1000;
export const DEFAULT_COMPONENT_DURATION_MS = 5000;
export const DEFAULT_ZOOM_PX_PER_SEC = 80;
export const MIN_COMPONENT_DURATION_MS = SNAP_MS;

/** Snap to grid without clamping (for deltas). */
export function snapToGridMs(ms: number): number {
  return Math.round(ms / SNAP_MS) * SNAP_MS;
}

/** Snap to grid, never below 0 (for absolute times). */
export function snapMs(ms: number): number {
  return Math.max(0, snapToGridMs(ms));
}

export function msToPx(ms: number, pxPerSec: number): number {
  return (ms / 1000) * pxPerSec;
}

export function pxToMs(px: number, pxPerSec: number): number {
  return snapMs((px / pxPerSec) * 1000);
}

/** Convert a horizontal pixel delta to ms (negative when dragging left). */
export function pxDeltaToMs(px: number, pxPerSec: number): number {
  return snapToGridMs((px / pxPerSec) * 1000);
}

export function formatTimeMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  if (min > 0) {
    return `${min}:${String(sec).padStart(2, "0")}.${tenths}`;
  }
  return `${sec}.${tenths}s`;
}

export function parseTimeInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const mmss = trimmed.match(/^(\d+):(\d+(?:\.\d+)?)$/);
  if (mmss) {
    const min = parseInt(mmss[1], 10);
    const sec = parseFloat(mmss[2]);
    return snapMs((min * 60 + sec) * 1000);
  }
  const secOnly = trimmed.match(/^(\d+(?:\.\d+)?)s?$/);
  if (secOnly) {
    return snapMs(parseFloat(secOnly[1]) * 1000);
  }
  return null;
}

export function sessionDurationFromComponents(
  components: { start_time: number; duration: number }[]
): number {
  if (components.length === 0) return 0;
  return Math.max(
    ...components.map((c) => c.start_time + c.duration)
  );
}

/** Returns IDs of components that overlap another component on the same track. */
export function findOverlappingIds(
  components: { id: number; track_id: number; start_time: number; duration: number }[]
): Set<number> {
  const overlapping = new Set<number>();
  const byTrack = new Map<number, typeof components>();
  for (const c of components) {
    const list = byTrack.get(c.track_id);
    if (list) list.push(c);
    else byTrack.set(c.track_id, [c]);
  }
  for (const trackComps of byTrack.values()) {
    for (let i = 0; i < trackComps.length; i++) {
      for (let j = i + 1; j < trackComps.length; j++) {
        const a = trackComps[i];
        const b = trackComps[j];
        if (
          a.start_time < b.start_time + b.duration &&
          b.start_time < a.start_time + a.duration
        ) {
          overlapping.add(a.id);
          overlapping.add(b.id);
        }
      }
    }
  }
  return overlapping;
}

/** Check if a component would overlap any of the given siblings. */
export function wouldOverlap(
  comp: { id: number; start_time: number; duration: number },
  siblings: { id: number; start_time: number; duration: number }[]
): boolean {
  return siblings.some(
    (s) =>
      s.id !== comp.id &&
      comp.start_time < s.start_time + s.duration &&
      s.start_time < comp.start_time + comp.duration
  );
}
