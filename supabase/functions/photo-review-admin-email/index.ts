import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailjet.ts";
import { ctaButton, wrapEmailBody } from "../_shared/emailTemplate.ts";

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
  photoCount?: number;
  activityId?: number | null;
};

function getAdminAppUrl(): string {
  return (Deno.env.get("ADMIN_APP_URL") ?? "https://admin.huntly.world").replace(/\/+$/, "");
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
    const photoCount =
      typeof body.photoCount === "number" && Number.isFinite(body.photoCount) && body.photoCount > 0
        ? Math.floor(body.photoCount)
        : 1;
    const activityId =
      typeof body.activityId === "number" && Number.isFinite(body.activityId) ? body.activityId : null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Missing Supabase credentials." }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [{ data: adminRows, error: adminsError }, activityRes] = await Promise.all([
      admin.from("admins").select("user_id"),
      activityId != null
        ? admin.from("activities").select("id, title, name").eq("id", activityId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (adminsError) {
      console.error("photo-review-admin-email: error loading admins", adminsError.message);
      return jsonResponse({ error: "Could not load admins." }, 500);
    }

    const uniqueUserIds = [...new Set((adminRows ?? []).map((r) => r.user_id).filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return jsonResponse({ success: true, notified: 0 }, 200);
    }

    const activityTitle =
      (activityRes.data as { title?: string | null; name?: string | null } | null)?.title?.trim() ||
      (activityRes.data as { title?: string | null; name?: string | null } | null)?.name?.trim() ||
      null;

    const adminAppUrl = getAdminAppUrl();
    const reviewUrl = `${adminAppUrl}/photos/review`;
    const photoNoun = photoCount === 1 ? "photo" : "photos";
    const subject =
      photoCount === 1
        ? "New Huntly World photo to review"
        : `${photoCount} new Huntly World photos to review`;

    const contextLine = activityTitle
      ? `A new ${photoNoun} was submitted for <strong>${activityTitle}</strong>.`
      : `A new ${photoNoun} was submitted and is waiting for moderation.`;

    const bodyHtml = `
      <p style="margin: 0 0 16px; color: #36454F;">Hi admin,</p>
      <p style="margin: 0 0 16px; color: #36454F;">${contextLine}</p>
      <p style="margin: 0 0 16px; color: #36454F;">
        There ${photoCount === 1 ? "is" : "are"} currently <strong>${photoCount}</strong> new ${photoNoun}
        in this submission ready for review.
      </p>
      <p style="margin: 0 0 16px; color: #36454F;">Open the photo review queue to approve or reject them.</p>
      ${ctaButton(reviewUrl, "Review photos")}
    `;

    const textPart =
      `Hi admin,\n\n` +
      (activityTitle
        ? `A new ${photoNoun} was submitted for "${activityTitle}".\n\n`
        : `A new ${photoNoun} was submitted and is waiting for moderation.\n\n`) +
      `There ${photoCount === 1 ? "is" : "are"} currently ${photoCount} new ${photoNoun} in this submission ready for review.\n\n` +
      `Review queue: ${reviewUrl}\n\n` +
      `— The Huntly World team`;

    const htmlPart = wrapEmailBody(bodyHtml);
    const replyTo = Deno.env.get("MAILJET_REPLY_TO");

    const recipientEmails = new Set<string>();
    for (const userId of uniqueUserIds) {
      const { data: userResult, error: userError } = await admin.auth.admin.getUserById(userId);
      const email = userResult?.user?.email?.trim().toLowerCase() ?? "";
      if (userError || !email) continue;
      recipientEmails.add(email);
    }

    let notified = 0;
    for (const to of recipientEmails) {
      try {
        await sendEmail({
          to,
          subject,
          htmlPart,
          textPart,
          ...(replyTo && { replyTo }),
        });
        notified += 1;
      } catch (e) {
        console.error("photo-review-admin-email: failed sending to", to, e);
      }
    }

    return jsonResponse({ success: true, notified }, 200);
  } catch (e) {
    console.error("photo-review-admin-email error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
});
