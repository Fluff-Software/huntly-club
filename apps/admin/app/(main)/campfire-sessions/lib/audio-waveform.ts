"use client";

import { useEffect, useState } from "react";

const PEAK_RESOLUTION = 200;

const peakCache = new Map<string, number[]>();
const inFlight = new Map<string, Promise<number[]>>();

let sharedCtx: AudioContext | null = null;

function getOrCreateContext(): AudioContext {
  if (!sharedCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

/**
 * Fetch an audio file, decode it via Web Audio API, and extract normalised
 * peak amplitudes (0..1). Results are cached per URL and concurrent requests
 * for the same URL are deduplicated.
 */
export async function getWaveformPeaks(audioUrl: string): Promise<number[]> {
  const cached = peakCache.get(audioUrl);
  if (cached) return cached;

  const existing = inFlight.get(audioUrl);
  if (existing) return existing;

  const promise = (async () => {
    const res = await fetch(audioUrl);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();

    const ctx = getOrCreateContext();
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        // AudioContext may refuse to resume without user gesture
      }
    }

    const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(buf, resolve, reject);
    });

    const raw = decoded.getChannelData(0);
    const samplesPerBin = Math.max(1, Math.floor(raw.length / PEAK_RESOLUTION));
    const peaks: number[] = [];

    for (let i = 0; i < PEAK_RESOLUTION; i++) {
      let peak = 0;
      const offset = i * samplesPerBin;
      const end = Math.min(offset + samplesPerBin, raw.length);
      for (let j = offset; j < end; j++) {
        const v = Math.abs(raw[j]);
        if (v > peak) peak = v;
      }
      peaks.push(peak);
    }

    const max = Math.max(...peaks, 0.001);
    const normalised = peaks.map((p) => p / max);

    peakCache.set(audioUrl, normalised);
    return normalised;
  })();

  inFlight.set(audioUrl, promise);
  promise
    .catch(() => {})
    .finally(() => inFlight.delete(audioUrl));

  return promise;
}

const failedUrls = new Set<string>();

/** Returns normalised peak data for an audio URL, or null while loading / on error. */
export function useWaveformPeaks(audioUrl: string | undefined): number[] | null {
  const [peaks, setPeaks] = useState<number[] | null>(() => {
    if (!audioUrl) return null;
    return peakCache.get(audioUrl) ?? null;
  });

  useEffect(() => {
    if (!audioUrl) {
      setPeaks(null);
      return;
    }

    const cached = peakCache.get(audioUrl);
    if (cached) {
      setPeaks(cached);
      return;
    }

    if (failedUrls.has(audioUrl)) return;

    let cancelled = false;

    const attempt = () => {
      getWaveformPeaks(audioUrl)
        .then((p) => {
          if (!cancelled) setPeaks(p);
        })
        .catch((err) => {
          console.warn("[waveform] failed to decode:", audioUrl, err);
          failedUrls.add(audioUrl);
        });
    };

    // If AudioContext might be suspended (no user gesture yet), wait for a
    // click/keydown then retry.
    const ctx = getOrCreateContext();
    if (ctx.state === "suspended") {
      const unlock = () => {
        ctx.resume().then(() => {
          if (!cancelled) attempt();
        });
        document.removeEventListener("pointerdown", unlock);
        document.removeEventListener("keydown", unlock);
      };
      document.addEventListener("pointerdown", unlock, { once: true });
      document.addEventListener("keydown", unlock, { once: true });
      return () => {
        cancelled = true;
        document.removeEventListener("pointerdown", unlock);
        document.removeEventListener("keydown", unlock);
      };
    }

    attempt();

    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  return peaks;
}
