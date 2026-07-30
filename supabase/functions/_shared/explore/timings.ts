/**
 * Request timing helpers.
 */
export type TimingBucket = Record<string, number>;

export function startTimer(): { elapsedMs: () => number } {
  const t0 = performance.now();
  return { elapsedMs: () => Math.round(performance.now() - t0) };
}

export function recordTiming(bucket: TimingBucket, key: string, ms: number): void {
  bucket[key] = (bucket[key] ?? 0) + ms;
}
