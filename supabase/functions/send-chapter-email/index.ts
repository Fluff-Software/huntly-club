import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore Deno npm specifier is resolved in Supabase Edge runtime.
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailjet";
import { wrapEmailBody } from "../_shared/emailTemplate";

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

type Payload = { chapterId?: number };
type ChapterRow = { id: number; title: string | null; season_id: number; week_number: number | null };
type SeasonRow = { id: number; name: string | null };
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
    const chapterId =
      typeof body.chapterId === "number" && Number.isFinite(body.chapterId) ? body.chapterId : null;

    if (chapterId == null) {
      return jsonResponse({ error: "chapterId is required and must be a number." }, 400);
    }

    const supabaseUrl = deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: chapter, error: chapterError } = await admin
      .from("chapters")
      .select("id, title, season_id, week_number")
      .eq("id", chapterId)
      .single();

    if (chapterError || !chapter) {
      return jsonResponse({ error: "Chapter not found." }, 404);
    }

    const { data: season } = await admin
      .from("seasons")
      .select("id, name")
      .eq("id", (chapter as ChapterRow).season_id)
      .single();

    const seasonName = (season as SeasonRow | null)?.name ?? null;
    const chapterTitle = (chapter as ChapterRow).title ?? "New chapter";
    const weekNumber = (chapter as ChapterRow).week_number;
    const chapterLabel =
      typeof weekNumber === "number" ? `Week ${weekNumber}: ${chapterTitle}` : chapterTitle;

    const subject = "A new Huntly World chapter is ready";
    const bodyHtml = `
      <p style="margin: 0 0 16px; color: #36454F;">Hi there,</p>
      <p style="margin: 0 0 16px; color: #36454F;">A new chapter is now available in Huntly World${
        seasonName ? ` for <strong>${seasonName}</strong>` : ""
      }.</p>
      <p style="margin: 0 0 16px; color: #36454F;"><strong>${chapterLabel}</strong></p>
      <p style="margin: 0; color: #36454F;">Open the app to read the latest chapter.</p>
    `;
    const htmlPart = wrapEmailBody(bodyHtml);
    const textPart =
      `Hi there,\n\n` +
      `A new chapter is now available in Huntly World${seasonName ? ` for ${seasonName}` : ""}.\n\n` +
      `${chapterLabel}\n\n` +
      `Open the app to read the latest chapter.\n\n` +
      `— The Huntly World team`;

    const { data: users, error: usersError } = await admin
      .from("user_data")
      .select("user_id")
      .eq("weekly_email", true);

    if (usersError) {
      console.error("send-chapter-email: error loading recipients", usersError.message);
      return jsonResponse({ error: "Could not load recipients." }, 500);
    }

    const replyTo = deno.env.get("MAILJET_REPLY_TO");
    let sent = 0;
    for (const row of (users ?? []) as UserDataRow[]) {
      const userId = row.user_id;
      if (!userId) continue;

      const { data: userResult, error: userError } = await admin.auth.admin.getUserById(userId);
      const to = userResult?.user?.email?.trim().toLowerCase() ?? "";
      if (userError || !to) {
        continue;
      }

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
        console.error("send-chapter-email: failed for user", userId, e);
      }
    }

    return jsonResponse({ success: true, count: sent }, 200);
  } catch (e) {
    console.error("send-chapter-email error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
});
