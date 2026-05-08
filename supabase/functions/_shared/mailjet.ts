/**
 * Mailjet Send API v3.1 helper. Sends a single transactional email.
 * Requires env: MAILJET_API_KEY, MAILJET_API_SECRET, MAILJET_FROM_EMAIL, MAILJET_FROM_NAME.
 */
const MAILJET_SEND_URL = "https://api.mailjet.com/v3.1/send";
const DEV_SUBJECT_PREFIX = "Development: ";

type DenoLike = { env: { get: (key: string) => string | undefined } };
const deno = (globalThis as typeof globalThis & { Deno?: DenoLike }).Deno;

export type MailjetConfig = {
  apiKey: string;
  apiSecret: string;
  fromEmail: string;
  fromName: string;
};

export type SendEmailParams = {
  to: string;
  subject: string;
  htmlPart?: string;
  textPart?: string;
  /** Reply-To header (improves deliverability; defaults to from email if not set). */
  replyTo?: string;
  /** Optional extra headers (e.g. List-Unsubscribe). */
  headers?: Record<string, string>;
};

function getConfig(): MailjetConfig {
  const apiKey = deno?.env.get("MAILJET_API_KEY");
  const apiSecret = deno?.env.get("MAILJET_API_SECRET");
  const fromEmail = deno?.env.get("MAILJET_FROM_EMAIL");
  const fromName = deno?.env.get("MAILJET_FROM_NAME") ?? "Huntly World";
  if (!apiKey || !apiSecret || !fromEmail) {
    throw new Error("Missing Mailjet configuration (MAILJET_API_KEY, MAILJET_API_SECRET, MAILJET_FROM_EMAIL)");
  }
  return { apiKey, apiSecret, fromEmail, fromName };
}

function isDevelopmentEnv(): boolean {
  const appEnv = (deno?.env.get("APP_ENV") ?? deno?.env.get("ENVIRONMENT") ?? "")
    .trim()
    .toLowerCase();
  if (appEnv === "production" || appEnv === "prod") return false;
  if (appEnv === "development" || appEnv === "dev" || appEnv === "local" || appEnv === "preview") return true;

  const supabaseUrl = (deno?.env.get("SUPABASE_URL") ?? "").trim().toLowerCase();
  if (!supabaseUrl) return false;
  return (
    supabaseUrl.includes("localhost") ||
    supabaseUrl.includes("127.0.0.1") ||
    supabaseUrl.includes("0.0.0.0")
  );
}

function subjectWithEnvPrefix(subject: string): string {
  const s = (subject ?? "").trim();
  if (!s) return s;
  if (!isDevelopmentEnv()) return s;
  if (s.toLowerCase().startsWith(DEV_SUBJECT_PREFIX.toLowerCase())) return s;
  return `${DEV_SUBJECT_PREFIX}${s}`;
}

/**
 * Send one email via Mailjet. At least one of htmlPart or textPart must be provided.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { to, subject, htmlPart, textPart, replyTo, headers } = params;
  const toNormalized = (to ?? "").trim().toLowerCase();
  if (toNormalized.endsWith("@example.invalid")) {
    // Placeholder/sink domain: intentionally skip to avoid wasting email provider resources.
    console.log("Mailjet send skipped for placeholder recipient:", toNormalized, subject);
    return;
  }
  if (!htmlPart && !textPart) {
    throw new Error("At least one of htmlPart or textPart is required");
  }
  const { apiKey, apiSecret, fromEmail, fromName } = getConfig();
  const auth = btoa(`${apiKey}:${apiSecret}`);
  const messageHeaders: Record<string, string> = { ...headers };
  messageHeaders["Reply-To"] = replyTo ?? fromEmail;
  const body = {
    Messages: [
      {
        From: { Email: fromEmail, Name: fromName },
        To: [{ Email: toNormalized }],
        Subject: subjectWithEnvPrefix(subject),
        ...(Object.keys(messageHeaders).length > 0 && { Headers: messageHeaders }),
        ...(textPart && { TextPart: textPart }),
        ...(htmlPart && { HTMLPart: htmlPart }),
      },
    ],
  };
  const res = await fetch(MAILJET_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("Mailjet send failed:", res.status, errText);
    throw new Error(`Email could not be sent: ${res.status}`);
  }
}
