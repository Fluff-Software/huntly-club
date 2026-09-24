/**
 * Lightweight phase timers for Step 10.4A benchmarks.
 * Disabled by default — enable with enableExploreProfile() or EXPLORE_PROFILE=1.
 */
export type ProfileSnapshot = {
  enabled: boolean;
  counters: Record<string, number>;
  totalsMs: Record<string, number>;
};

const state = {
  enabled: process.env.EXPLORE_PROFILE === "1",
  counters: {} as Record<string, number>,
  totalsMs: {} as Record<string, number>,
};

export function enableExploreProfile(on = true): void {
  state.enabled = on;
}

export function resetExploreProfile(): void {
  state.counters = {};
  state.totalsMs = {};
}

export function isExploreProfileEnabled(): boolean {
  return state.enabled;
}

export function profileInc(name: string, n = 1): void {
  if (!state.enabled) return;
  state.counters[name] = (state.counters[name] ?? 0) + n;
}

export function profileAdd(name: string, value: number): void {
  if (!state.enabled) return;
  state.totalsMs[name] = (state.totalsMs[name] ?? 0) + value;
}

export function profileTime<T>(name: string, fn: () => T): T {
  if (!state.enabled) return fn();
  const t0 = performance.now();
  try {
    return fn();
  } finally {
    profileAdd(name, performance.now() - t0);
  }
}

export async function profileTimeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!state.enabled) return fn();
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    profileAdd(name, performance.now() - t0);
  }
}

export function getExploreProfile(): ProfileSnapshot {
  return {
    enabled: state.enabled,
    counters: { ...state.counters },
    totalsMs: { ...state.totalsMs },
  };
}
