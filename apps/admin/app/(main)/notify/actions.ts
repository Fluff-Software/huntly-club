"use server";

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

export async function sendAdminPush(message: string): Promise<SendResult> {
  const text = message.trim();
  if (!text) return { success: false, error: "Message is required." };
  return callFunction("send-admin-push", { message: text });
}

export async function sendAdminEmail(subject: string, bodyHtml: string): Promise<SendResult> {
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
  const title = subject.trim();
  const html = bodyHtml.trim();
  const to = testEmail.trim();
  if (!html) return { success: false, error: "Message is required." };
  if (!to) return { success: false, error: "Test email address is required." };
  return callFunction("send-admin-email", { subject: title, bodyHtml: html, testEmail: to });
}

type PreviewResult = { success: boolean; html?: string; subject?: string; error?: string };

export async function previewAdminEmail(subject: string, bodyHtml: string): Promise<PreviewResult> {
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

