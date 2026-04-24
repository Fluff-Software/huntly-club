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

type Payload = { subject?: string; message?: string };
type UserDataRow = { user_id: string };
type DenoLike = {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};
const deno = (globalThis as typeof globalThis & { Deno: DenoLike }).Deno;

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
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return jsonResponse({ error: "message is required." }, 400);
    }

    const supabaseUrl = deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const subject = subjectRaw || "Huntly World update";
    const bodyHtml = `
      <p style="margin: 0; color: #36454F; white-space: pre-wrap;">${message}</p>
    `;
    const htmlPart = wrapEmailBody(bodyHtml);
    const textPart = message;

    const { data: users, error: usersError } = await admin
      .from("user_data")
      .select("user_id")
      .eq("weekly_email", true);

    if (usersError) {
      console.error("send-admin-email: error loading recipients", usersError.message);
      return jsonResponse({ error: "Could not load recipients." }, 500);
    }

    const replyTo = deno.env.get("MAILJET_REPLY_TO");
    let sent = 0;
    for (const row of (users ?? []) as UserDataRow[]) {
      const userId = row.user_id;
      if (!userId) continue;

      const { data: userResult, error: userError } = await admin.auth.admin.getUserById(userId);
      const to = userResult?.user?.email?.trim().toLowerCase() ?? "";
      if (userError || !to) continue;

      try {
        await sendEmail({
          to,
          subject,
          htmlPart,
          textPart,
          ...(replyTo && { replyTo }),
        });
        sent += 1;
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

