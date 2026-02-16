/**
 * Mailjet Send API v3.1 helper. Sends a single transactional email.
 * Requires env: MAILJET_API_KEY, MAILJET_API_SECRET, MAILJET_FROM_EMAIL, MAILJET_FROM_NAME.
 */
const MAILJET_SEND_URL = "https://api.mailjet.com/v3.1/send";

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
  const apiKey = Deno.env.get("MAILJET_API_KEY");
  const apiSecret = Deno.env.get("MAILJET_API_SECRET");
  const fromEmail = Deno.env.get("MAILJET_FROM_EMAIL");
  const fromName = Deno.env.get("MAILJET_FROM_NAME") ?? "Huntly Club";
  if (!apiKey || !apiSecret || !fromEmail) {
    throw new Error("Missing Mailjet configuration (MAILJET_API_KEY, MAILJET_API_SECRET, MAILJET_FROM_EMAIL)");
  }
  return { apiKey, apiSecret, fromEmail, fromName };
}

/**
 * Send one email via Mailjet. At least one of htmlPart or textPart must be provided.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { to, subject, htmlPart, textPart, replyTo, headers } = params;
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
        To: [{ Email: to }],
        Subject: subject,
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
