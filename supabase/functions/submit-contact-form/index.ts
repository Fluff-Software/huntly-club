import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore Deno-style relative .ts imports are resolved by Edge runtime.
import { sendEmail } from "../_shared/mailjet.ts";
// @ts-ignore Deno-style relative .ts imports are resolved by Edge runtime.
import { wrapEmailBody } from "../_shared/emailTemplate.ts";

const TEAM_EMAIL = "huntly@fluff.software";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: object, status: number, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...headers },
  });
}

type Payload = {
  formName?: string;
  email?: string;
  message?: string;
  fields?: Record<string, string>;
};

type DenoLike = {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};
const deno = (globalThis as typeof globalThis & { Deno: DenoLike }).Deno;

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as Payload;
    const formName = typeof body.formName === "string" ? body.formName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const fields = body.fields && typeof body.fields === "object" ? body.fields : {};

    if (!formName) {
      return jsonResponse({ error: "formName is required." }, 400);
    }
    if (!email) {
      return jsonResponse({ error: "Email is required." }, 400);
    }
    if (!message) {
      return jsonResponse({ error: "Message is required." }, 400);
    }

    const fieldEntries = Object.entries(fields).filter(
      ([, v]) => typeof v === "string" && v.trim()
    );

    const extraRowsHtml = fieldEntries
      .map(
        ([k, v]) =>
          `<p style="margin: 0 0 8px; color: #36454F;"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</p>`
      )
      .join("");

    const html = `
      <p style="margin: 0 0 16px; color: #36454F;"><strong>From:</strong> ${escapeHtml(email)}</p>
      ${extraRowsHtml}
      <p style="margin: 16px 0 0; color: #36454F; white-space: pre-wrap;">${escapeHtml(message)}</p>
    `;
    const text =
      `From: ${email}\n` +
      fieldEntries.map(([k, v]) => `${k}: ${v}`).join("\n") +
      `\n\n${message}`;

    await sendEmail({
      to: TEAM_EMAIL,
      subject: `[Website] ${formName}`,
      htmlPart: wrapEmailBody(html),
      textPart: text,
      replyTo: email,
    });
  } catch (e) {
    console.error("submit-contact-form error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }

  return jsonResponse({ status: "ok" }, 200);
});
