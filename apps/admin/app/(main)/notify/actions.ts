"use server";

import { requireAdmin } from "@/lib/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { PUSH_MESSAGE_MAX, PUSH_TITLE_MAX, type PushAudience } from "./push-limits";

type SendResult = { success: boolean; count?: number; error?: string };

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function callFunction(path: string, payload: unknown): Promise<SendResult> {
  const supabaseUrl = getEnv("SUPABASE_URL").replace(/\/+$/, "");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const res = await fetch(`${supabaseUrl}/functions/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    return {
      success: false,
      error: (json && typeof json.error === "string" && json.error) || `Request failed (${res.status})`,
    };
  }

  return json as SendResult;
}

export type PushReport = {
  attempted: number;
  accepted: number;
  rejected: number;
  receipts: { ok: number; failed: number; pending: number };
  errorCounts: Record<string, number>;
  disabledTokens: number;
};

export type PushSendResult = {
  success: boolean;
  recipients?: number;
  count?: number;
  report?: PushReport;
  error?: string;
};

/**
 * Calls send-admin-push with the signed-in admin's own access token. The function
 * re-checks admin membership and MFA itself, so the public anon key can't trigger it.
 */
async function callAdminPushFunction(payload: {
  title?: string;
  message?: string;
  audience: PushAudience;
  dryRun?: boolean;
}): Promise<PushSendResult> {
  const session = await requireAdmin();
  if ("error" in session) return { success: false, error: session.error };

  const supabaseUrl = getEnv("SUPABASE_URL").replace(/\/+$/, "");
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/send-admin-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
        apikey: anonKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return { success: false, error: "Could not reach the push service." };
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    return {
      success: false,
      error:
        (json && typeof json.error === "string" && json.error) ||
        (res.status === 404
          ? "The send-admin-push function isn't deployed."
          : `Request failed (${res.status})`),
    };
  }
  return json as PushSendResult;
}

/** How many devices this audience would reach right now (distinct, enabled tokens). */
export async function getPushRecipientCount(audience: PushAudience): Promise<PushSendResult> {
  return callAdminPushFunction({ audience, dryRun: true });
}

export type PushUserSearchItem = {
  user_id: string;
  email: string | null;
  push_devices: number;
  last_active_at: string | null;
};

/** Users matching an email search, with how many push-enabled devices each has. */
export async function searchPushUsers(
  query: string
): Promise<{ users?: PushUserSearchItem[]; error?: string }> {
  const session = await requireAdmin();
  if ("error" in session) return { error: session.error };
  const q = query.trim();
  if (q.length < 2) return { users: [] };
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_push_user_search", { p_query: q });
  if (error) return { error: error.message };
  return { users: (data ?? []) as PushUserSearchItem[] };
}

export async function sendAdminPush(
  title: string,
  message: string,
  audience: PushAudience
): Promise<PushSendResult> {
  const t = title.trim();
  const text = message.trim();
  if (!text) return { success: false, error: "Message is required." };
  if (t.length > PUSH_TITLE_MAX) {
    return { success: false, error: `Title must be ${PUSH_TITLE_MAX} characters or fewer.` };
  }
  if (text.length > PUSH_MESSAGE_MAX) {
    return { success: false, error: `Message must be ${PUSH_MESSAGE_MAX} characters or fewer.` };
  }
  return callAdminPushFunction({ title: t || undefined, message: text, audience });
}

export async function sendAdminEmail(subject: string, bodyHtml: string): Promise<SendResult> {
  const session = await requireAdmin();
  if ("error" in session) return { success: false, error: session.error };
  const title = subject.trim();
  const html = bodyHtml.trim();
  if (!html) return { success: false, error: "Message is required." };
  return callFunction("send-admin-email", { subject: title, bodyHtml: html });
}

export async function sendAdminEmailTest(
  subject: string,
  bodyHtml: string,
  testEmail: string
): Promise<SendResult> {
  const session = await requireAdmin();
  if ("error" in session) return { success: false, error: session.error };
  const title = subject.trim();
  const html = bodyHtml.trim();
  const to = testEmail.trim();
  if (!html) return { success: false, error: "Message is required." };
  if (!to) return { success: false, error: "Test email address is required." };
  return callFunction("send-admin-email", { subject: title, bodyHtml: html, testEmail: to });
}

type PreviewResult = { success: boolean; html?: string; subject?: string; error?: string };

export async function previewAdminEmail(subject: string, bodyHtml: string): Promise<PreviewResult> {
  const session = await requireAdmin();
  if ("error" in session) return { success: false, error: session.error };
  const title = subject.trim();
  const html = bodyHtml.trim();
  if (!html) return { success: false, error: "Message is required." };
  const result = await callFunction("send-admin-email", {
    subject: title,
    bodyHtml: html,
    preview: true,
  });
  return result as PreviewResult;
}

