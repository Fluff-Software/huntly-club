import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailjet.ts";

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

type PhotoEmailPayload = {
  photoIds?: number[];
};

type PhotoRow = {
  photo_id: number;
  uploaded_at: string;
  reason: string | null;
  profiles: {
    user_id: string;
    name: string;
    nickname: string | null;
  } | null;
  activities: {
    title: string | null;
  } | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as PhotoEmailPayload;
    const ids = Array.isArray(body.photoIds) ? body.photoIds.filter((id) => Number.isFinite(id)) : [];

    if (ids.length === 0) {
      return jsonResponse({ error: "photoIds array is required." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Load all photos in a single query
    const { data: rows, error: photosError } = await admin
      .from("user_activity_photos")
      .select(
        `
        photo_id,
        uploaded_at,
        reason,
        profiles (
          user_id,
          name,
          nickname
        ),
        activities (
          title
        )
      `
      )
      .in("photo_id", ids);

    if (photosError) {
      console.error("photo-denied-email: error loading photos", photosError.message);
      return jsonResponse({ error: "Could not load photos for email." }, 500);
    }

    const replyTo = Deno.env.get("MAILJET_REPLY_TO");

    for (const row of (rows ?? []) as PhotoRow[]) {
      const profile = row.profiles;
      if (!profile?.user_id) continue;

      // Look up the auth user to get their email
      const { data: userResult, error: userError } = await admin.auth.admin.getUserById(profile.user_id);
      if (userError || !userResult?.user?.email) {
        console.warn(
          "photo-denied-email: could not find user email for profile",
          profile.user_id,
          userError?.message
        );
        continue;
      }

      const to = userResult.user.email;
      const childName = profile.nickname || profile.name;
      const activityTitle = row.activities?.title ?? "an activity";
      const reason = (row.reason ?? "").trim();

      const subject = "Your Huntly World photo was not approved";
      const htmlPart = `
        <p>Hi${childName ? ` ${childName}` : ""},</p>
        <p>Thanks for submitting a photo for <strong>${activityTitle}</strong> on Huntly World.</p>
        <p>Our team reviewed your photo but unfortunately we couldn't approve it.</p>
        ${
          reason
            ? `<p><strong>Reason:</strong><br />${reason.replace(/\n/g, "<br />")}</p>`
            : "<p>We couldn't approve this photo because it didn't meet our activity guidelines.</p>"
        }
        <p>You’re welcome to try again with a new photo that better matches the activity instructions.</p>
        <p>— The Huntly World team</p>
      `;

      const textReason = reason || "The photo did not meet our activity guidelines.";
      const textPart =
        `Hi${childName ? ` ${childName}` : ""},\n\n` +
        `Thanks for submitting a photo for "${activityTitle}" on Huntly World.\n` +
        `Our team reviewed your photo but unfortunately we couldn't approve it.\n\n` +
        `Reason:\n${textReason}\n\n` +
        `You’re welcome to try again with a new photo that better matches the activity instructions.\n\n` +
        `— The Huntly World team`;

      try {
        await sendEmail({ to, subject, htmlPart, textPart, ...(replyTo && { replyTo }) });
      } catch (e) {
        if (e instanceof Error && e.message.includes("Email could not be sent")) {
          console.error("photo-denied-email: email could not be sent for photo", row.photo_id);
        } else {
          console.error("photo-denied-email: unexpected error when sending email", e);
        }
        // Continue with other photos even if one email fails
      }
    }
  } catch (e) {
    console.error("photo-denied-email error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }

  return jsonResponse({ status: "ok" }, 200);
});

