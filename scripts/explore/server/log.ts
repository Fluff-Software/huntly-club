/**
 * Structured logging for Explore server. Never log tokens or service-role keys.
 */
import { randomUUID } from "node:crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

let minLevel: LogLevel = "info";

export function setExploreLogLevel(level: LogLevel): void {
  minLevel = level;
}

export function newRequestId(): string {
  return randomUUID();
}

/** Round coordinates for rare debug use — prefer omitting them. */
export function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function exploreLog(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {}
): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}
