import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailjet.ts";
import { wrapEmailBody } from "../_shared/emailTemplate.ts";

const MAX_USER_SEARCH_PAGES = 100;

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

/** Find a user's UUID by email address using the admin API. */
async function findUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const users = data?.users ?? [];
    const found = users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (found) return found.id;
    if (users.length < perPage) return null;
    page += 1;
    if (page > MAX_USER_SEARCH_PAGES) return null;
  }
}

function buildConfirmationEmail(): { html: string; text: string } {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as { email?: string; reason?: string };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!email) {
      return jsonResponse({ error: "Email is required." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const userId = await findUserIdByEmail(admin, email);
    if (!userId) {
      // Return success to avoid leaking whether an account exists.
      return jsonResponse({ status: "ok" }, 200);
    }

    // Check for an existing pending request to avoid duplicates.
    const { data: existing } = await admin
      .from("account_removal_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await admin.from("account_removal_requests").insert({
        user_id: userId,
        reason: reason || null,
        status: "pending",
      });

      if (insertError) {
        console.error("Error inserting removal request:", insertError);
        return jsonResponse({ error: "Failed to submit request. Please try again." }, 500);
      }
    }

    // Send confirmation email (best-effort).
    try {
      const { html, text } = buildConfirmationEmail();
      const replyTo = Deno.env.get("MAILJET_REPLY_TO");
      await sendEmail({
        to: email,
        subject: "Your Huntly World account removal request has been received",
        htmlPart: wrapEmailBody(html),
        textPart: text,
        ...(replyTo && { replyTo }),
      });
    } catch (e) {
      console.error("Failed to send account removal confirmation email:", e);
    }
  } catch (e) {
    console.error("request-account-deletion error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }

  return jsonResponse({ status: "ok" }, 200);
});
