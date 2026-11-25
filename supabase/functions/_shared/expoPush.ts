/**
 * Expo push sending with ticket + receipt handling.
 *
 * - Sends in batches of 100 (Expo's per-request limit).
 * - Reads every push ticket: tickets with `DeviceNotRegistered` mean the token is dead.
 * - Waits briefly, then fetches receipts for accepted tickets (batches of 1000) so
 *   APNs/FCM failures (e.g. `InvalidCredentials`, `DeviceNotRegistered`) are surfaced
 *   instead of being silently counted as sent.
 * - Dead tokens are disabled in `push_tokens` so later sends skip them.
 *
 * Optional secret: EXPO_ACCESS_TOKEN, required only if "Enhanced security for push
 * notifications" is turned on for the Expo project.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
const SEND_BATCH_SIZE = 100;
const RECEIPT_BATCH_SIZE = 1000;

export type ExpoPushMessage = {
  to: string;
  title?: string;
  body: string;
  sound?: "default" | null;
  data?: Record<string, unknown>;
  priority?: "default" | "normal" | "high";
  channelId?: string;
};

type ExpoTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string; expoPushToken?: string };
};

type ExpoReceipt = {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
};

export type ExpoPushReport = {
  /** Distinct tokens we attempted. */
  attempted: number;
  /** Tickets Expo accepted (queued for APNs/FCM). */
  accepted: number;
  /** Tickets Expo rejected, plus messages in batches that failed at the HTTP level. */
  rejected: number;
  receipts: {
    /** Receipts returned with status ok (delivered to APNs/FCM). */
    ok: number;
    /** Receipts returned with status error. */
    failed: number;
    /** Accepted tickets with no receipt yet (Expo hasn't finished; not an error). */
    pending: number;
  };
  /** Count of each Expo/APNs/FCM error code seen in tickets or receipts. */
  errorCounts: Record<string, number>;
  /** Tokens disabled because the device is no longer registered. */
  disabledTokens: number;
};

function expoHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json",
  };
  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function bump(counts: Record<string, number>, key: string, by = 1) {
  counts[key] = (counts[key] ?? 0) + by;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Distinct enabled Expo push tokens. Several device rows can share a token (e.g. iOS reinstall). */
export async function loadEnabledPushTokens(admin: SupabaseClient): Promise<string[]> {
  const tokens = new Set<string>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from("push_tokens")
      .select("expo_push_token")
      .eq("enabled", true)
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Could not load push tokens: ${error.message}`);
    for (const row of (data ?? []) as { expo_push_token: string | null }[]) {
      const t = row.expo_push_token?.trim();
      if (t && /^Expo(nent)?PushToken\[.+\]$/.test(t)) tokens.add(t);
    }
    if (!data || data.length < pageSize) break;
  }
  return [...tokens];
}

async function disableTokens(admin: SupabaseClient, tokens: string[]): Promise<number> {
  if (tokens.length === 0) return 0;
  let disabled = 0;
  for (const batch of chunk(tokens, 200)) {
    const { data, error } = await admin
      .from("push_tokens")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .in("expo_push_token", batch)
      .eq("enabled", true)
      .select("id");
    if (error) {
      console.error("expoPush: could not disable dead tokens", error.message);
      continue;
    }
    disabled += data?.length ?? 0;
  }
  return disabled;
}

/**
 * Send one message to many tokens. `build` creates the message for a token.
 * `receiptDelayMs` is how long to wait before asking Expo for receipts (0 skips receipts).
 */
export async function sendExpoPush(
  admin: SupabaseClient,
  tokens: string[],
  build: (to: string) => ExpoPushMessage,
  options: { receiptDelayMs?: number; logTag?: string } = {}
): Promise<ExpoPushReport> {
  const tag = options.logTag ?? "expoPush";
  const receiptDelayMs = options.receiptDelayMs ?? 10_000;
  const errorCounts: Record<string, number> = {};
  const deadTokens = new Set<string>();
  const ticketIdToToken = new Map<string, string>();
  let accepted = 0;
  let rejected = 0;

  for (const batch of chunk(tokens, SEND_BATCH_SIZE)) {
    const messages = batch.map(build);
    let tickets: ExpoTicket[] = [];
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: expoHeaders(),
        body: JSON.stringify(messages),
      });
      const json = (await res.json().catch(() => null)) as
        | { data?: ExpoTicket[]; errors?: { code?: string; message?: string }[] }
        | null;
      if (!res.ok || !Array.isArray(json?.data)) {
        // Whole-request error (bad auth, malformed payload, Expo outage). Keep going with
        // the remaining batches so one bad batch doesn't stop the broadcast.
        const code = json?.errors?.[0]?.code ?? `HTTP_${res.status}`;
        console.error(`${tag}: Expo send failed`, res.status, JSON.stringify(json?.errors ?? json));
        bump(errorCounts, code, batch.length);
        rejected += batch.length;
        continue;
      }
      tickets = json!.data!;
    } catch (e) {
      console.error(`${tag}: Expo send threw`, e);
      bump(errorCounts, "NETWORK_ERROR", batch.length);
      rejected += batch.length;
      continue;
    }

    tickets.forEach((ticket, i) => {
      const token = batch[i];
      if (ticket?.status === "ok" && ticket.id) {
        accepted += 1;
        ticketIdToToken.set(ticket.id, token);
        return;
      }
      rejected += 1;
      const code = ticket?.details?.error ?? "UnknownError";
      bump(errorCounts, code);
      if (code === "DeviceNotRegistered") deadTokens.add(token);
    });
  }

  let receiptsOk = 0;
  let receiptsFailed = 0;
  let receiptsPending = ticketIdToToken.size;

  if (receiptDelayMs > 0 && ticketIdToToken.size > 0) {
    await sleep(receiptDelayMs);
    receiptsPending = 0;
    for (const ids of chunk([...ticketIdToToken.keys()], RECEIPT_BATCH_SIZE)) {
      try {
        const res = await fetch(EXPO_RECEIPTS_URL, {
          method: "POST",
          headers: expoHeaders(),
          body: JSON.stringify({ ids }),
        });
        const json = (await res.json().catch(() => null)) as
          | { data?: Record<string, ExpoReceipt> }
          | null;
        if (!res.ok || !json?.data) {
          console.error(`${tag}: Expo receipts failed`, res.status);
          receiptsPending += ids.length;
          continue;
        }
        for (const id of ids) {
          const receipt = json.data[id];
          if (!receipt) {
            receiptsPending += 1;
          } else if (receipt.status === "ok") {
            receiptsOk += 1;
          } else {
            receiptsFailed += 1;
            const code = receipt.details?.error ?? "UnknownError";
            bump(errorCounts, code);
            if (code === "DeviceNotRegistered") {
              const token = ticketIdToToken.get(id);
              if (token) deadTokens.add(token);
            } else {
              console.error(`${tag}: receipt error`, code, receipt.message);
            }
          }
        }
      } catch (e) {
        console.error(`${tag}: Expo receipts threw`, e);
        receiptsPending += ids.length;
      }
    }
  }

  const disabledTokens = await disableTokens(admin, [...deadTokens]);

  return {
    attempted: tokens.length,
    accepted,
    rejected,
    receipts: { ok: receiptsOk, failed: receiptsFailed, pending: receiptsPending },
    errorCounts,
    disabledTokens,
  };
}
