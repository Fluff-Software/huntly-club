/**
 * Lightweight macOS/system sampling for worker benchmarks (no sudo).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

export type SwapSnapshot = {
  swapUsedBytes: number | null;
  pagesFree: number | null;
  pagesActive: number | null;
  pagesInactive: number | null;
  pagesWired: number | null;
  pageSize: number;
};

export type MemoryPressureSummary = {
  raw: string | null;
  healthy: boolean | null;
};

function parseVmStat(): SwapSnapshot {
  const pageSize = os.platform() === "darwin" ? 16384 : 4096;
  let pagesFree: number | null = null;
  let pagesActive: number | null = null;
  let pagesInactive: number | null = null;
  let pagesWired: number | null = null;
  let swapUsedBytes: number | null = null;

  try {
    const out = execFileSync("vm_stat", { encoding: "utf8" });
    const num = (label: string): number | null => {
      const m = out.match(new RegExp(`${label}:\\s+([\\d.]+)`));
      return m ? Math.round(Number(m[1])) : null;
    };
    pagesFree = num("Pages free");
    pagesActive = num("Pages active");
    pagesInactive = num("Pages inactive");
    pagesWired = num("Pages wired down");
  } catch {
    /* ignore */
  }

  try {
    if (os.platform() === "darwin") {
      const sys = execFileSync("sysctl", ["-n", "vm.swapusage"], { encoding: "utf8" });
      // "total = 2048.00M  used = 1234.50M  free = 813.50M ..."
      const m = sys.match(/used\s*=\s*([\d.]+)([MG])/i);
      if (m) {
        const n = Number(m[1]);
        swapUsedBytes = m[2]!.toUpperCase() === "G" ? n * 1024 ** 3 : n * 1024 ** 2;
      }
    }
  } catch {
    /* ignore */
  }

  return { swapUsedBytes, pagesFree, pagesActive, pagesInactive, pagesWired, pageSize };
}

export function sampleSwap(): SwapSnapshot {
  return parseVmStat();
}

export function sampleMemoryPressure(): MemoryPressureSummary {
  if (os.platform() !== "darwin") return { raw: null, healthy: null };
  try {
    const raw = execFileSync("memory_pressure", { encoding: "utf8" }).trim();
    const lower = raw.toLowerCase();
    const healthy =
      lower.includes("normal") || lower.includes("warn")
        ? !lower.includes("critical")
        : !lower.includes("critical");
    return { raw: raw.slice(0, 500), healthy };
  } catch {
    return { raw: null, healthy: null };
  }
}

export function freeDiskBytes(dir: string): number | null {
  try {
    const st = fs.statfsSync(dir);
    return Number(st.bavail) * Number(st.bsize);
  } catch {
    try {
      const out = execFileSync("df", ["-k", dir], { encoding: "utf8" });
      const line = out.trim().split("\n").pop();
      if (!line) return null;
      const parts = line.split(/\s+/);
      const availKb = Number(parts[3]);
      return Number.isFinite(availKb) ? availKb * 1024 : null;
    } catch {
      return null;
    }
  }
}

export type ProcessSample = {
  pid: number;
  rssBytes: number;
  cpuPercent: number | null;
};

/** Best-effort: sample RSS for matching process command substrings. */
export function sampleMatchingProcesses(substr: string): ProcessSample[] {
  try {
    const out = execFileSync("ps", ["-axo", "pid=,rss=,pcpu=,command="], {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    const rows: ProcessSample[] = [];
    for (const line of out.split("\n")) {
      if (!line.includes(substr)) continue;
      const m = line.trim().match(/^(\d+)\s+(\d+)\s+([\d.]+)\s+(.*)$/);
      if (!m) continue;
      rows.push({
        pid: Number(m[1]),
        rssBytes: Number(m[2]) * 1024,
        cpuPercent: Number(m[3]),
      });
    }
    return rows;
  } catch {
    return [];
  }
}

export class MetricsSampler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private peakRssBytes = 0;
  private peakHeapBytes = 0;
  private samples = 0;
  private swapBefore: SwapSnapshot;
  private lastSwap: SwapSnapshot;
  private pressure: MemoryPressureSummary = { raw: null, healthy: null };
  private cpuSum = 0;
  private matchSubstr: string;

  constructor(matchSubstr = "tsx") {
    this.matchSubstr = matchSubstr;
    this.swapBefore = sampleSwap();
    this.lastSwap = this.swapBefore;
  }

  start(intervalMs = 2000): void {
    this.tick();
    this.timer = setInterval(() => this.tick(), intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.tick();
  }

  private tick(): void {
    this.samples += 1;
    this.peakHeapBytes = Math.max(this.peakHeapBytes, process.memoryUsage().heapUsed);
    const procs = sampleMatchingProcesses(this.matchSubstr);
    let rss = process.memoryUsage().rss;
    let cpu = 0;
    for (const p of procs) {
      rss += p.rssBytes;
      cpu += p.cpuPercent ?? 0;
    }
    this.peakRssBytes = Math.max(this.peakRssBytes, rss);
    this.cpuSum += cpu;
    this.lastSwap = sampleSwap();
    this.pressure = sampleMemoryPressure();
  }

  summary() {
    const swapGrowth =
      this.lastSwap.swapUsedBytes != null && this.swapBefore.swapUsedBytes != null
        ? this.lastSwap.swapUsedBytes - this.swapBefore.swapUsedBytes
        : null;
    return {
      samples: this.samples,
      peak_rss_mb: Math.round((this.peakRssBytes / (1024 * 1024)) * 10) / 10,
      peak_heap_mb: Math.round((this.peakHeapBytes / (1024 * 1024)) * 10) / 10,
      avg_matched_cpu_pct:
        this.samples > 0 ? Math.round((this.cpuSum / this.samples) * 10) / 10 : null,
      swap_before_mb:
        this.swapBefore.swapUsedBytes != null
          ? Math.round((this.swapBefore.swapUsedBytes / (1024 * 1024)) * 10) / 10
          : null,
      swap_after_mb:
        this.lastSwap.swapUsedBytes != null
          ? Math.round((this.lastSwap.swapUsedBytes / (1024 * 1024)) * 10) / 10
          : null,
      swap_growth_mb:
        swapGrowth != null ? Math.round((swapGrowth / (1024 * 1024)) * 10) / 10 : null,
      memory_pressure: this.pressure,
      pages_free_after: this.lastSwap.pagesFree,
    };
  }
}
