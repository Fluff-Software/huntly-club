/**
 * TEMP: Clubhouse activity tile load profiling. Remove when done optimizing.
 * Filter Metro logs with: HomeTileTiming
 */
const ENABLED = __DEV__;

let sessionStartMs: number | null = null;
const loggedKeys = new Set<string>();

export function startHomeTileLoadTiming(): void {
  if (!ENABLED) return;
  sessionStartMs = performance.now();
  loggedKeys.clear();
  console.log("[HomeTileTiming] ── session start ──");
}

function elapsedMs(): number {
  return sessionStartMs == null ? 0 : Math.round(performance.now() - sessionStartMs);
}

/** Log once per key per session. */
export function logHomeTileReady(tile: string, detail?: string): void {
  if (!ENABLED || sessionStartMs == null) return;
  const key = detail ? `${tile}|${detail}` : tile;
  if (loggedKeys.has(key)) return;
  loggedKeys.add(key);
  const suffix = detail ? ` (${detail})` : "";
  console.log(`[HomeTileTiming] ${tile} ready @ ${elapsedMs()}ms${suffix}`);
}

export function logHomeTileDuration(tile: string, durationMs: number, detail?: string): void {
  if (!ENABLED || sessionStartMs == null) return;
  const key = detail ? `${tile}|${detail}|dur` : `${tile}|dur`;
  if (loggedKeys.has(key)) return;
  loggedKeys.add(key);
  const suffix = detail ? ` (${detail})` : "";
  console.log(
    `[HomeTileTiming] ${tile} work took ${Math.round(durationMs)}ms @ ${elapsedMs()}ms wall${suffix}`
  );
}

export function logHomeTileSummary(pending: string[]): void {
  if (!ENABLED || sessionStartMs == null) return;
  if (pending.length > 0) {
    console.log(`[HomeTileTiming] still waiting: ${pending.join(", ")} @ ${elapsedMs()}ms`);
    return;
  }
  if (loggedKeys.has("summary")) return;
  loggedKeys.add("summary");
  console.log(`[HomeTileTiming] ── all tiles ready @ ${elapsedMs()}ms ──`);
}
