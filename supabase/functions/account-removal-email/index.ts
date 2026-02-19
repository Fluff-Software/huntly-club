import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sendEmail } from "../_shared/mailjet.ts";
import { wrapEmailBody } from "../_shared/emailTemplate.ts";

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

type EmailType = "created" | "canceled" | "processed" | "denied";

type Payload = {
  email?: string;
  type?: EmailType;
};

const SUBJECTS: Record<EmailType, string> = {
  created: "Your Huntly World account removal request has been received",
  canceled: "Your Huntly World account removal request was cancelled",
  processed: "Your Huntly World account has been removed",
  denied: "Your Huntly World account removal request was not approved",
};

function buildContent(type: EmailType): { html: string; text: string } {
  const replyTo = Deno.env.get("MAILJET_REPLY_TO");
  switch (type) {
    case "created": {
      const html = `
        <p style="margin: 0 0 16px; color: #36454F;">We've received your request to remove your Huntly World account.</p>
        <p style="margin: 0 0 16px; color: #36454F;">Our team will review it. You can cancel this request within 24 hours from the Settings screen in the app. After 24 hours, an admin will process your request and your account data will be permanently removed.</p>
        <p style="margin: 0; color: #36454F;">If you didn't request this, please contact support.</p>
      `;
      const text =
        "We've received your request to remove your Huntly World account.\n\n" +
        "Our team will review it. You can cancel this request within 24 hours from the Settings screen in the app. After 24 hours, an admin will process your request and your account data will be permanently removed.\n\n" +
        "If you didn't request this, please contact support.";
      return { html, text };
    }
    case "canceled": {
      const html = `
        <p style="margin: 0 0 16px; color: #36454F;">Your account removal request has been cancelled as requested.</p>
        <p style="margin: 0; color: #36454F;">Your Huntly World account remains active. If you change your mind, you can submit a new removal request from Settings in the app.</p>
      `;
      const text =
        "Your account removal request has been cancelled as requested.\n\n" +
        "Your Huntly World account remains active. If you change your mind, you can submit a new removal request from Settings in the app.";
      return { html, text };
    }
    case "processed": {
      const html = `
        <p style="margin: 0 0 16px; color: #36454F;">Your account removal request has been approved and processed.</p>
        <p style="margin: 0 0 16px; color: #36454F;">Your personal data has been removed from Huntly World.</p>
        <p style="margin: 0; color: #36454F;">Thank you for having been part of Huntly World.</p>
      `;
      const text =
        "Your account removal request has been approved and processed.\n\n" +
        "Your personal data has been removed from Huntly World.\n\n" +
        "Thank you for having been part of Huntly World.";
      return { html, text };
    }
    case "denied": {
      const html = `
        <p style="margin: 0 0 16px; color: #36454F;">Your account removal request was not approved.</p>
        <p style="margin: 0 0 16px; color: #36454F;">Your Huntly World account remains active. If you still wish to remove your account, please submit a new request from Settings in the app or contact support.</p>
        <p style="margin: 0; color: #36454F;">If you have questions, reply to this email.</p>
      `;
      const text =
        "Your account removal request was not approved.\n\n" +
        "Your Huntly World account remains active. If you still wish to remove your account, please submit a new request from Settings in the app or contact support.\n\n" +
        "If you have questions, reply to this email.";
      return { html, text };
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as Payload;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const type: EmailType | undefined =
      body.type === "created" ||
      body.type === "canceled" ||
      body.type === "processed" ||
      body.type === "denied"
        ? body.type
        : undefined;

    if (!email) {
      return jsonResponse({ error: "email is required" }, 400);
    }
    if (!type) {
      return jsonResponse({ error: "type must be one of: created, canceled, processed, denied" }, 400);
    }

    const { html, text } = buildContent(type);
    const subject = SUBJECTS[type];
    const htmlPart = wrapEmailBody(html);
    const replyTo = Deno.env.get("MAILJET_REPLY_TO");

    await sendEmail({
      to: email,
      subject,
      htmlPart,
      textPart: text,
      ...(replyTo && { replyTo }),
    });
  } catch (e) {
    console.error("account-removal-email error:", e);
    return jsonResponse({ error: "Failed to send email" }, 500);
  }

  return jsonResponse({ status: "ok" }, 200);
});
