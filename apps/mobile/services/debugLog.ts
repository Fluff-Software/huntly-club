// Debug helper used ONLY while a runtime debug session is active.
// Resolves the Metro dev-machine host from NativeModules.SourceCode.scriptURL so that
// fetches reach the host machine when running on a physical iOS device. Falls back to
// console.log so logs are visible in Metro regardless of network reachability.

import { NativeModules } from "react-native";

const SESSION_ID = "55b6d5";
const INGEST_PATH = "/ingest/ae995e2f-7adc-4a0f-87b2-18e186f8d5e2";

function resolveDebugBaseUrls(): string[] {
  const urls: string[] = [];
  try {
    const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^/:]+)(?::\d+)?/);
      const host = match?.[1];
      if (host && host !== "localhost" && host !== "127.0.0.1") {
        urls.push(`http://${host}:7773`);
      }
    }
  } catch {
    // ignore
  }
  urls.push("http://127.0.0.1:7773");
  urls.push("http://localhost:7773");
  return urls;
}

const BASE_URLS = resolveDebugBaseUrls();

export type AgentLogPayload = {
  hypothesisId?: string;
  runId?: string;
  location: string;
  message: string;
  data?: unknown;
};

export function agentLog(payload: AgentLogPayload): void {
  const body = JSON.stringify({
    sessionId: SESSION_ID,
    timestamp: Date.now(),
    ...payload,
  });
  try {
    console.log("[agent-log]", payload.location, payload.message, payload.data);
  } catch {
    // ignore
  }
  for (const base of BASE_URLS) {
    try {
      void fetch(`${base}${INGEST_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION_ID },
        body,
      }).catch(() => {});
    } catch {
      // ignore
    }
  }
}
