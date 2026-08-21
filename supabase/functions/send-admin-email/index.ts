import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore Deno npm specifier is resolved in Supabase Edge runtime.
import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-ignore Deno-style relative .ts imports are resolved by Edge runtime.
import { sendEmail } from "../_shared/mailjet.ts";
// @ts-ignore Deno-style relative .ts imports are resolved by Edge runtime.
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

type Payload = { subject?: string; bodyHtml?: string; preview?: boolean; testEmail?: string };
type UserDataRow = { user_id: string };
type DenoLike = {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};
const deno = (globalThis as typeof globalThis & { Deno: DenoLike }).Deno;

/** Very small HTML-to-text fallback for the Mailjet plain-text part. */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
    const subjectRaw = typeof body.subject === "string" ? body.subject.trim() : "";
    const bodyHtml = typeof body.bodyHtml === "string" ? body.bodyHtml.trim() : "";
    const preview = body.preview === true;
    const testEmail =
      typeof body.testEmail === "string" && body.testEmail.trim() !== ""
        ? body.testEmail.trim().toLowerCase()
        : null;

    if (!bodyHtml) {
      return jsonResponse({ error: "bodyHtml is required." }, 400);
    }

    const subject = subjectRaw || "Huntly World update";
    // The compose editor doesn't constrain image size, and most email clients ignore
    // external/class-based CSS, so force a responsive inline style on every <img> here.
    const constrainedBodyHtml = bodyHtml.replace(
      /<img\s+([^>]*?)\/?>/gi,
      (match, attrs) => {
        const withoutStyle = attrs.replace(/\sstyle\s*=\s*"[^"]*"/i, "");
        return `<img ${withoutStyle} style="max-width:100%;height:auto;display:block;" />`;
      }
    );
    const htmlPart = wrapEmailBody(constrainedBodyHtml);

    // Preview mode: return the exact rendered HTML, no DB access, no sending.
    if (preview) {
      return jsonResponse({ success: true, preview: true, html: htmlPart, subject }, 200);
    }

    const textPart = htmlToText(bodyHtml);

    const supabaseUrl = deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const replyTo = deno.env.get("MAILJET_REPLY_TO");

    // Test send: one address only, bypasses the recipient query entirely.
    if (testEmail) {
      const result = await sendEmail({
        to: testEmail,
        subject,
        htmlPart,
        textPart,
        ...(replyTo && { replyTo }),
      });
      return jsonResponse(
        { success: true, testEmail: true, sentTo: testEmail, sent: result.sent },
        200
      );
    }

    // general_email is separate from weekly_email: it gates general/admin broadcast emails
    // only, so a user can opt out of one without losing the other.
    const { data: users, error: usersError } = await admin
      .from("user_data")
      .select("user_id")
      .eq("general_email", true);

    if (usersError) {
      console.error("send-admin-email: error loading recipients", usersError.message);
      return jsonResponse({ error: "Could not load recipients." }, 500);
    }

    let sent = 0;
    for (const row of (users ?? []) as UserDataRow[]) {
      const userId = row.user_id;
      if (!userId) continue;

      const { data: userResult, error: userError } = await admin.auth.admin.getUserById(userId);
      const to = userResult?.user?.email?.trim().toLowerCase() ?? "";
      if (userError || !to) continue;

      try {
        const result = await sendEmail({
          to,
          subject,
          htmlPart,
          textPart,
          ...(replyTo && { replyTo }),
        });
        if (result.sent) sent += 1;
      } catch (e) {
        console.error("send-admin-email: failed for user", userId, e);
      }
    }

    return jsonResponse({ success: true, count: sent }, 200);
  } catch (e) {
    console.error("send-admin-email error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
});
