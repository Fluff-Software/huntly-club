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

export async function sendAdminEmail(subject: string, message: string): Promise<SendResult> {
  const title = subject.trim();
  const text = message.trim();
  if (!text) return { success: false, error: "Message is required." };
  return callFunction("send-admin-email", { subject: title, message: text });
}

